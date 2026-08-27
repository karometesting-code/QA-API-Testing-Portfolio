import { test, expect } from '../fixtures/test-fixtures';

const BACKPACK = 'Sauce Labs Backpack';
const BIKE_LIGHT = 'Sauce Labs Bike Light';

/**
 * Shopping cart flow.
 *
 * Every test here requests the `loggedInPage` fixture instead of calling
 * `loginPage.login(...)` itself. That's the composed-fixture pattern from
 * fixtures/test-fixtures.ts: authentication is a *precondition* for these
 * tests, not the thing under test, so it's factored out rather than repeated.
 */
test.describe('Cart', () => {
  test('adding a product updates the cart badge count', async ({ loggedInPage }) => {
    await loggedInPage.addProductToCart(BACKPACK);

    await expect(loggedInPage.cartBadge).toHaveText('1');
  });

  test('adding multiple products accumulates the badge count', async ({ loggedInPage }) => {
    await loggedInPage.addProductToCart(BACKPACK);
    await loggedInPage.addProductToCart(BIKE_LIGHT);

    await expect(loggedInPage.cartBadge).toHaveText('2');
  });

  test('removing a product from the inventory page clears its badge slot', async ({ loggedInPage }) => {
    await loggedInPage.addProductToCart(BACKPACK);
    await loggedInPage.addProductToCart(BIKE_LIGHT);

    await loggedInPage.removeProductFromCart(BACKPACK);

    await expect(loggedInPage.cartBadge).toHaveText('1');
  });

  test('the cart page lists exactly the products that were added', async ({ loggedInPage, cartPage }) => {
    await loggedInPage.addProductToCart(BACKPACK);
    await loggedInPage.addProductToCart(BIKE_LIGHT);

    await loggedInPage.goToCart();

    const itemNames = await cartPage.getItemNames();
    expect(itemNames).toHaveLength(2);
    expect(itemNames).toEqual(expect.arrayContaining([BACKPACK, BIKE_LIGHT]));
  });

  test('removing a product from the cart page updates the list and the badge', async ({
    loggedInPage,
    cartPage,
  }) => {
    await loggedInPage.addProductToCart(BACKPACK);
    await loggedInPage.addProductToCart(BIKE_LIGHT);
    await loggedInPage.goToCart();

    await cartPage.removeProduct(BACKPACK);

    await expect(cartPage.cartItems).toHaveCount(1);
    expect(await cartPage.getItemNames()).toEqual([BIKE_LIGHT]);
  });

  test('the cart starts empty for a freshly logged-in user', async ({ loggedInPage }) => {
    // Asserting the *absence* of the badge (rather than its text) is
    // deliberate: SauceDemo doesn't render the badge element at all when the
    // cart is empty, so `getCartItemCount()` returning 0 is what we exercise
    // in the page object; here we assert the DOM directly for extra confidence.
    await expect(loggedInPage.cartBadge).toHaveCount(0);
  });
});
