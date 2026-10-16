import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    // Mismo data-test="inventory-item" que en el catálogo (es la misma
    // plantilla de tarjeta de producto) — sin rol propio, de ahí getByTestId.
    this.cartItems = page.getByTestId('inventory-item');
    // <button> real con texto "Checkout": rol + nombre accesible directos.
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
    this.cartBadge = page.getByTestId('shopping-cart-badge');
  }

  /**
   * Lectura atómica necesaria — ver el comentario extenso en
   * `InventoryPage.getProductsWithPrices()` (misma causa raíz, documentada
   * como DEF-01/DEF-02 en documentation/03-reporte-hallazgos.md): separar
   * `.count()` de un bucle de `.nth(i)` dejaba una ventana donde el conteo
   * podía capturar un valor transitorio (restos de la navegación) que ya no
   * coincidía con el DOM para cuando el bucle lo recorría. `evaluateAll()`
   * resuelve y extrae todo en una sola llamada atómica. El `waitFor` previo
   * tolera el timeout porque, a diferencia del catálogo, el carrito sí puede
   * estar vacío en escenarios válidos (ej. TC-UI-06).
   */
  async getItemsWithPrices(): Promise<{ name: string; price: number; index: number }[]> {
    await this.cartItems.first().waitFor({ state: 'visible' }).catch(() => undefined);
    return this.cartItems.evaluateAll((items) =>
      items.map((item, index) => ({
        name: (item.querySelector('[data-test="inventory-item-name"]') as HTMLElement).innerText.trim(),
        price: Number(
          (item.querySelector('[data-test="inventory-item-price"]') as HTMLElement).innerText.replace('$', '')
        ),
        index,
      }))
    );
  }

  async removeItemByIndex(index: number) {
    const row = this.cartItems.nth(index);
    await row.getByRole('button', { name: 'Remove' }).click();
  }

  /**
   * Lee los nombres de los productos listados en el carrito, en orden de DOM.
   * Misma razón de lectura atómica que `getItemsWithPrices()`: una corrida
   * real en WebKit expuso exactamente este patrón aquí (devolvía los 6
   * productos del catálogo en vez de los 2 del carrito) cuando el método
   * solo tenía la espera al primer renglón pero leía con `.allTextContents()`
   * después de un `.count()` implícito separado — `evaluateAll()` lo evita.
   */
  async getItemNames(): Promise<string[]> {
    await this.cartItems.first().waitFor({ state: 'visible' }).catch(() => undefined);
    return this.cartItems.evaluateAll((items) =>
      items.map((item) => (item.querySelector('[data-test="inventory-item-name"]') as HTMLElement).innerText.trim())
    );
  }

  /** Elimina un producto del carrito por su nombre visible (pruebas de regresión complementarias). */
  async removeProduct(productName: string) {
    await this.cartItems
      .filter({ hasText: productName })
      .getByRole('button', { name: 'Remove' })
      .click();
  }

  async getBadgeCountOrZero(): Promise<number> {
    const isVisible = await this.cartBadge.isVisible().catch(() => false);
    if (!isVisible) return 0;
    const text = await this.cartBadge.innerText();
    return Number(text);
  }

  /**
   * Navega a checkout-step-one y espera a que su contenido propio (el campo
   * "First Name") esté realmente presente antes de devolver el control.
   * Mismo defecto que DEF-06 (ver documentation/03-reporte-hallazgos.md): sin
   * esta espera, `CheckoutPage.fillInfo()` podía llenar el primer campo
   * ("First Name") mientras la página todavía estaba terminando de
   * renderizar/hidratar, y el valor se perdía (el campo quedaba vacío pese a
   * que `.fill()` no reportaba ningún error) — reproducido en dos pruebas
   * distintas de este archivo, siempre en el primer campo del formulario.
   */
  async goToCheckout() {
    await this.checkoutButton.click();
    await this.page.getByLabel('First Name').waitFor({ state: 'visible' });
  }
}
