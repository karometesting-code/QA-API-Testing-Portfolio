import { Page, Locator } from '@playwright/test';

/**
 * Representa el catálogo de productos (inventory.html).
 * Toda la selección de productos es DINÁMICA: se lee el precio renderizado
 * en pantalla y se decide en tiempo de ejecución, nunca por nombre fijo ni
 * posición fija en el DOM.
 */
export class InventoryPage {
  readonly page: Page;
  readonly sortDropdown: Locator;
  readonly inventoryItems: Locator;
  readonly cartBadge: Locator;
  readonly cartLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.inventoryItems = page.locator('.inventory_item');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.cartLink = page.locator('.shopping_cart_link');
  }

  async sortByPriceLowToHigh() {
    await this.sortDropdown.selectOption('lohi');
  }

  /**
   * Extrae {nombre, precio} de cada producto visible, en el orden actual del DOM.
   *
   * Espera explícita necesaria: `locator.count()` lee el DOM en el instante en
   * que se llama, sin reintentar. Si se invoca justo después de un login (la
   * URL ya cambió a inventory.html, pero React/JS de SauceDemo aún no pintó
   * la grilla), puede devolver 0 productos aunque la página sí los tenga —
   * comportamiento observado de forma reproducible en WebKit (ver DEF-02 en
   * documentation/03-reporte-hallazgos.md). Esperar a que el primer producto
   * esté presente antes de contar elimina esa condición de carrera; el
   * catálogo de SauceDemo nunca está legítimamente vacío para un usuario
   * autenticado, así que no hay caso válido en el que esta espera deba fallar.
   */
  async getProductsWithPrices(): Promise<{ name: string; price: number; index: number }[]> {
    await this.inventoryItems.first().waitFor({ state: 'visible' });
    const count = await this.inventoryItems.count();
    const products: { name: string; price: number; index: number }[] = [];
    for (let i = 0; i < count; i++) {
      const item = this.inventoryItems.nth(i);
      const name = (await item.locator('.inventory_item_name').innerText()).trim();
      const priceText = await item.locator('.inventory_item_price').innerText();
      const price = Number(priceText.replace('$', ''));
      products.push({ name, price, index: i });
    }
    return products;
  }

  /** Agrega al carrito el producto ubicado en el índice dado (ya calculado dinámicamente). */
  async addToCartByIndex(index: number) {
    const item = this.inventoryItems.nth(index);
    await item.locator('button[data-test^="add-to-cart"]').click();
  }

  /**
   * Agrega/elimina por nombre visible del producto. Se usa únicamente en las
   * pruebas de regresión complementarias (login/carrito básico), donde el
   * enunciado no exige selección dinámica por precio. Los Flujos 1 y 2
   * (TC-UI-01, TC-UI-04) siguen usando exclusivamente los métodos por índice.
   */
  private productCard(productName: string): Locator {
    return this.inventoryItems.filter({ hasText: productName });
  }

  async addProductToCart(productName: string) {
    await this.productCard(productName).getByRole('button', { name: 'Add to cart' }).click();
  }

  async removeProductFromCart(productName: string) {
    await this.productCard(productName).getByRole('button', { name: 'Remove' }).click();
  }

  /**
   * Navega al carrito y espera explícitamente a que la URL cambie a cart.html.
   * Sin esta espera, un `locator.count()` inmediatamente después del click
   * (como el que usa `CartPage.getItemsWithPrices()`) puede ejecutarse antes
   * de que termine la navegación y leer el DOM todavía en inventory.html,
   * devolviendo 0 ítems aunque el carrito sí los tenga (ver DEF-01 en
   * documentation/03-reporte-hallazgos.md). `page.waitForURL` es una espera
   * explícita legítima (no un `sleep` fijo): se resuelve en cuanto ocurre la
   * navegación, con su propio timeout configurado en playwright.config.ts.
   */
  async goToCart() {
    await this.cartLink.click();
    await this.page.waitForURL(/cart\.html/);
  }
}
