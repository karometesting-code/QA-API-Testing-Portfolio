import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for /inventory.html — the product listing page shown right
 * after login.
 *
 * Note on locators: SauceDemo's "Add to cart" buttons use a data-test
 * attribute derived from the product name (e.g. `add-to-cart-sauce-labs-backpack`).
 * Re-deriving that slug in test code (lowercasing, replacing spaces/parentheses)
 * is fragile — one special character in a product name breaks it silently.
 * Instead we scope the search to the product's own container (`.inventory_item`)
 * filtered by its visible name, then find the button *inside* that container by
 * its accessible role/name. This mirrors how a real user finds the button
 * ("the Add to cart button on the Backpack card") and survives markup changes.
 */
export class InventoryPage extends BasePage {
  readonly inventoryItems: Locator;
  readonly cartBadge: Locator;
  readonly cartLink: Locator;
  readonly sortDropdown: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;

  constructor(page: Page) {
    super(page);
    this.inventoryItems = page.locator('.inventory_item');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.productNames = page.locator('.inventory_item_name');
    this.productPrices = page.locator('.inventory_item_price');
  }

  /** Locates a single product card by its visible name. */
  private productCard(productName: string): Locator {
    return this.inventoryItems.filter({ hasText: productName });
  }

  async addProductToCart(productName: string): Promise<void> {
    await this.productCard(productName).getByRole('button', { name: 'Add to cart' }).click();
  }

  async removeProductFromCart(productName: string): Promise<void> {
    await this.productCard(productName).getByRole('button', { name: 'Remove' }).click();
  }

  /**
   * Returns the number shown on the cart badge, or 0 when the badge is absent
   * (an empty cart renders no badge at all, so we can't just call `.textContent()`
   * blindly — that would throw or return null and force every caller to
   * duplicate this check).
   */
  async getCartItemCount(): Promise<number> {
    if (await this.cartBadge.count() === 0) {
      return 0;
    }
    const text = await this.cartBadge.textContent();
    return Number(text ?? 0);
  }

  async goToCart(): Promise<void> {
    await this.cartLink.click();
  }

  /** Sorts the product grid. Accepts the same values as the page's <select>. */
  async sortBy(option: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    await this.sortDropdown.selectOption(option);
  }

  async getVisibleProductNames(): Promise<string[]> {
    return this.productNames.allTextContents();
  }
}
