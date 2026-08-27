import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Page Object for /cart.html — the shopping cart summary. */
export class CartPage extends BasePage {
  readonly cartItems: Locator;
  readonly itemNames: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.cartItems = page.locator('.cart_item');
    this.itemNames = page.locator('.inventory_item_name');
    this.checkoutButton = page.locator('[data-test="checkout"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
  }

  async getItemNames(): Promise<string[]> {
    return this.itemNames.allTextContents();
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async removeProduct(productName: string): Promise<void> {
    await this.cartItems
      .filter({ hasText: productName })
      .getByRole('button', { name: 'Remove' })
      .click();
  }

  /** Moves to checkout step one (shipping information). */
  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
