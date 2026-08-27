import { test, expect } from '../fixtures/test-fixtures';

const BACKPACK = 'Sauce Labs Backpack';
const BIKE_LIGHT = 'Sauce Labs Bike Light';

const SHOPPER = { firstName: 'Karen', lastName: 'Meza', postalCode: '1900' };

/**
 * Checkout flow: cart -> shipping info -> order overview -> confirmation.
 *
 * This is the best example in the suite of *chaining page objects*: each
 * test moves through several page objects in sequence (InventoryPage ->
 * CartPage -> CheckoutInfoPage -> CheckoutOverviewPage -> CheckoutCompletePage),
 * with the fixture handing each one over already instantiated. Notice no
 * test ever does `new SomePage(page)` — that's the payoff of the fixture
 * setup: tests read as a script of user intent, not plumbing.
 */
test.describe('Checkout', () => {
  test('completing checkout with valid data shows the confirmation screen', async ({
    loggedInPage,
    cartPage,
    checkoutInfoPage,
    checkoutOverviewPage,
    checkoutCompletePage,
  }) => {
    await loggedInPage.addProductToCart(BACKPACK);
    await loggedInPage.goToCart();
    await cartPage.proceedToCheckout();

    await checkoutInfoPage.continueWith(SHOPPER.firstName, SHOPPER.lastName, SHOPPER.postalCode);

    // The order overview must reflect the item that was actually added.
    await expect(checkoutOverviewPage.cartItems).toHaveCount(1);

    await checkoutOverviewPage.finishOrder();

    await expect(checkoutCompletePage.completeHeader).toBeVisible();
    expect(await checkoutCompletePage.getConfirmationMessage()).toContain('Thank you for your order');
  });

  test('the order total equals subtotal plus tax', async ({
    loggedInPage,
    cartPage,
    checkoutInfoPage,
    checkoutOverviewPage,
  }) => {
    await loggedInPage.addProductToCart(BACKPACK);
    await loggedInPage.addProductToCart(BIKE_LIGHT);
    await loggedInPage.goToCart();
    await cartPage.proceedToCheckout();
    await checkoutInfoPage.continueWith(SHOPPER.firstName, SHOPPER.lastName, SHOPPER.postalCode);

    const [subtotal, tax, total] = await Promise.all([
      checkoutOverviewPage.getSubtotal(),
      checkoutOverviewPage.getTax(),
      checkoutOverviewPage.getTotal(),
    ]);

    // A floating point arithmetic check like this is a good example of a
    // business-rule assertion, as opposed to a purely visual/DOM assertion —
    // it proves the app's math is right, not just that numbers are present.
    expect(total).toBeCloseTo(subtotal + tax, 2);
  });

  test('missing first name blocks checkout with a validation error', async ({
    loggedInPage,
    cartPage,
    checkoutInfoPage,
  }) => {
    await loggedInPage.addProductToCart(BACKPACK);
    await loggedInPage.goToCart();
    await cartPage.proceedToCheckout();

    await checkoutInfoPage.continueWith('', SHOPPER.lastName, SHOPPER.postalCode);

    await expect(checkoutInfoPage.errorMessage).toBeVisible();
    await expect(checkoutInfoPage.errorMessage).toContainText('First Name is required');
  });

  test('missing postal code blocks checkout with a validation error', async ({
    loggedInPage,
    cartPage,
    checkoutInfoPage,
  }) => {
    await loggedInPage.addProductToCart(BACKPACK);
    await loggedInPage.goToCart();
    await cartPage.proceedToCheckout();

    await checkoutInfoPage.continueWith(SHOPPER.firstName, SHOPPER.lastName, '');

    await expect(checkoutInfoPage.errorMessage).toBeVisible();
    await expect(checkoutInfoPage.errorMessage).toContainText('Postal Code is required');
  });
});
