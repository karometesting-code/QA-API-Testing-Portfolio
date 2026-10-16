import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Locators por rol/label (preferidos): ambos inputs tienen aria-label
    // ("Username"/"Password"), el botón es un <input type="submit"
    // value="Login"> (role "button", nombre accesible "Login"), y el
    // contenedor de error usa role="alert" explícito. Ninguno de estos
    // cuatro elementos necesita un selector genérico.
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL(/inventory\.html/);
  }
}
