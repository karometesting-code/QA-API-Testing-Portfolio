import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutInfoPage } from '../pages/CheckoutInfoPage';
import { CheckoutOverviewPage } from '../pages/CheckoutOverviewPage';
import { CheckoutCompletePage } from '../pages/CheckoutCompletePage';
import { users } from './users';

/**
 * Custom fixtures extend Playwright's base `test` with our own dependencies.
 *
 * Two things happen here that are worth being able to explain in an interview:
 *
 * 1. Page Object fixtures — instead of every test writing
 *    `const loginPage = new LoginPage(page)`, we declare each page object as
 *    a fixture. Playwright then creates it lazily (only if the test actually
 *    asks for it, keeping unused pages cheap) and tears it down automatically
 *    between tests. Tests just destructure what they need:
 *    `test('...', async ({ loginPage, cartPage }) => { ... })`.
 *
 * 2. `loggedInPage` — a *composed* fixture that depends on another fixture
 *    (`loginPage`) to perform a login before the test body runs. This is the
 *    fixture equivalent of a "before each" hook, but scoped only to the tests
 *    that request it — cart/checkout tests need to start logged in, but login
 *    tests themselves obviously don't.
 */
type Fixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutInfoPage: CheckoutInfoPage;
  checkoutOverviewPage: CheckoutOverviewPage;
  checkoutCompletePage: CheckoutCompletePage;
  /** Inventory page reached after logging in as the standard user. */
  loggedInPage: InventoryPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutInfoPage: async ({ page }, use) => {
    await use(new CheckoutInfoPage(page));
  },
  checkoutOverviewPage: async ({ page }, use) => {
    await use(new CheckoutOverviewPage(page));
  },
  checkoutCompletePage: async ({ page }, use) => {
    await use(new CheckoutCompletePage(page));
  },

  loggedInPage: async ({ page, loginPage, inventoryPage }, use) => {
    await loginPage.open();
    await loginPage.login(users.standardUser.username, users.standardUser.password);
    await page.waitForURL('**/inventory.html');
    await use(inventoryPage);
  },
});

export { expect } from '@playwright/test';
