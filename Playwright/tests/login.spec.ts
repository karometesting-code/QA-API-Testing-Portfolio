import { test, expect } from '../fixtures/test-fixtures';
import { users, invalidPassword } from '../fixtures/users';

/**
 * Login flow.
 *
 * Structure note: every test below follows Arrange-Act-Assert (AAA):
 *   Arrange -> get to the starting state (here: open the login page)
 *   Act     -> perform the one action under test (submit credentials)
 *   Assert  -> verify the outcome
 * Keeping that shape consistent is what makes a suite easy to read for
 * someone who didn't write it — exactly what happens in a code review.
 */
test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('a standard user can log in with valid credentials', async ({ loginPage, page }) => {
    await loginPage.login(users.standardUser.username, users.standardUser.password);

    // A successful login redirects away from the login page and onto the
    // product listing — asserting the URL is a stronger signal than just
    // checking that no error appeared, because it proves the app actually
    // progressed, not merely that it didn't fail.
    await expect(page).toHaveURL(/.*inventory\.html/);
  });

  test('a locked out user sees a blocking error message', async ({ loginPage }) => {
    await loginPage.login(users.lockedOutUser.username, users.lockedOutUser.password);

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('locked out');
  });

  test('an incorrect password is rejected', async ({ loginPage }) => {
    await loginPage.login(users.standardUser.username, invalidPassword);

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('do not match');
  });

  test('submitting the form with empty fields shows a validation error', async ({ loginPage }) => {
    await loginPage.loginButton.click();

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Username is required');
  });
});
