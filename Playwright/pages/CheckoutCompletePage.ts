import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page Object for /checkout-complete.html — the order confirmation screen. */
export class CheckoutCompletePage extends BasePage {
  readonly completeHeader: Locator;
  readonly backHomeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.completeHeader = page.locator('[data-test="complete-header"]');
    this.backHomeButton = page.locator('[data-test="back-to-products"]');
  }

  async getConfirmationMessage(): Promise<string | null> {
    return this.completeHeader.textContent();
  }
}
