import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page Object for /checkout-step-two.html — the final order review. */
export class CheckoutOverviewPage extends BasePage {
  readonly cartItems: Locator;
  readonly subtotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalLabel: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.cartItems = page.locator('.cart_item');
    this.subtotalLabel = page.locator('[data-test="subtotal-label"]');
    this.taxLabel = page.locator('[data-test="tax-label"]');
    this.totalLabel = page.locator('[data-test="total-label"]');
    this.finishButton = page.locator('[data-test="finish"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
  }

  /**
   * Parses "Item total: $29.99" into a number. Keeping this parsing logic in
   * the page object (not in the test) means every test that needs the totals
   * gets a plain number to do arithmetic with, instead of re-implementing the
   * same regex/parseFloat everywhere.
   */
  private async parseCurrencyLabel(locator: Locator): Promise<number> {
    const text = await locator.textContent();
    const match = text?.match(/\$([\d.]+)/);
    return match ? Number(match[1]) : NaN;
  }

  async getSubtotal(): Promise<number> {
    return this.parseCurrencyLabel(this.subtotalLabel);
  }

  async getTax(): Promise<number> {
    return this.parseCurrencyLabel(this.taxLabel);
  }

  async getTotal(): Promise<number> {
    return this.parseCurrencyLabel(this.totalLabel);
  }

  async finishOrder(): Promise<void> {
    await this.finishButton.click();
  }
}
