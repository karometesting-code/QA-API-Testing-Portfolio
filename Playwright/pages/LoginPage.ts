import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for https://www.saucedemo.com/ (the login screen).
 *
 * Locator strategy: SauceDemo exposes `data-test` attributes on most elements
 * specifically for automation. We prefer those over CSS classes or text
 * whenever available, because classes are used for styling (they change for
 * visual reasons that have nothing to do with test intent) while `data-test`
 * is a contract meant for tests. This is a standard talking point in
 * interviews: "how do you choose a locator strategy?".
 */
export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton = page.locator('[data-test="login-button"]');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  /** Navigates straight to the login page. */
  async open(): Promise<void> {
    await this.goto('/');
  }

  /**
   * Performs a full login action. Kept as a single method (instead of three
   * separate fill/fill/click calls repeated in every test) so the *intent*
   * ("log in as this user") is what tests read, not the mechanics.
   */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /** Convenience getter used by negative tests to read the inline error text. */
  async getErrorMessage(): Promise<string | null> {
    return this.errorMessage.textContent();
  }
}
