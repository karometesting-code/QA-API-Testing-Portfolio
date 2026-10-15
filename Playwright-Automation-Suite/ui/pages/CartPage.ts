import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItems = page.locator('.cart_item');
    this.checkoutButton = page.locator('[data-test="checkout"]');
    this.cartBadge = page.locator('.shopping_cart_badge');
  }

  /**
   * Misma razón de espera explícita que `InventoryPage.getProductsWithPrices()`:
   * `locator.count()` no reintenta, así que se espera al primer renglón antes
   * de contar para evitar leer el carrito a mitad de navegación/render. Se
   * tolera el timeout (carrito legítimamente vacío) en vez de fallar, porque
   * a diferencia del catálogo, el carrito sí puede estar vacío en escenarios
   * válidos (ej. TC-UI-06).
   */
  async getItemsWithPrices(): Promise<{ name: string; price: number; index: number }[]> {
    await this.cartItems.first().waitFor({ state: 'visible' }).catch(() => undefined);
    const count = await this.cartItems.count();
    const items: { name: string; price: number; index: number }[] = [];
    for (let i = 0; i < count; i++) {
      const row = this.cartItems.nth(i);
      const name = (await row.locator('.inventory_item_name').innerText()).trim();
      const priceText = await row.locator('.inventory_item_price').innerText();
      items.push({ name, price: Number(priceText.replace('$', '')), index: i });
    }
    return items;
  }

  async removeItemByIndex(index: number) {
    const row = this.cartItems.nth(index);
    await row.locator('button[data-test^="remove"]').click();
  }

  /** Lee los nombres de los productos listados en el carrito, en orden de DOM. */
  async getItemNames(): Promise<string[]> {
    return this.cartItems.locator('.inventory_item_name').allTextContents();
  }

  /** Elimina un producto del carrito por su nombre visible (pruebas de regresión complementarias). */
  async removeProduct(productName: string) {
    await this.cartItems
      .filter({ hasText: productName })
      .locator('button[data-test^="remove"]')
      .click();
  }

  async getBadgeCountOrZero(): Promise<number> {
    const isVisible = await this.cartBadge.isVisible().catch(() => false);
    if (!isVisible) return 0;
    const text = await this.cartBadge.innerText();
    return Number(text);
  }

  async goToCheckout() {
    await this.checkoutButton.click();
  }
}
