import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for /checkout-step-one.html — where the shopper enters
 * shipping information.
 *
 * Modeling checkout as three separate page objects (Info -> Overview ->
 * Complete) instead of one giant "CheckoutPage" mirrors the three distinct
 * URLs/screens SauceDemo actually renders. This 1:1 mapping between page
 * object and real screen is exactly what interviewers look for: each class
 * has a single, obvious responsibility instead of a catch-all god object.
 */
export class CheckoutInfoPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.locator('[data-test="firstName"]');
    this.lastNameInput = page.locator('[data-test="lastName"]');
    this.postalCodeInput = page.locator('[data-test="postalCode"]');
    this.continueButton = page.locator('[data-test="continue"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  async fillInfo(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  /** Fills the form and advances to the order overview in one call. */
  async continueWith(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.fillInfo(firstName, lastName, postalCode);
    await this.continueButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    return this.errorMessage.textContent();
  }
}
