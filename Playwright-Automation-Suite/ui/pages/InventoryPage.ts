import { Page, Locator } from '@playwright/test';

/**
 * Representa el catálogo de productos (inventory.html).
 * Toda la selección de productos es DINÁMICA: se lee el precio renderizado
 * en pantalla y se decide en tiempo de ejecución, nunca por nombre fijo ni
 * posición fija en el DOM.
 *
 * Estrategia de locators (ver README, sección "Estrategia de locators"):
 * 1) getByRole/getByLabel cuando el elemento tiene un rol ARIA y nombre
 *    accesible reales (botones, el combobox de orden).
 * 2) getByTestId cuando no hay semántica de rol útil pero el elemento sí
 *    tiene `data-test` (tarjetas de producto, badge numérico del carrito,
 *    nombre/precio) — es el locator integrado de Playwright para ese caso,
 *    no un selector CSS manual.
 * No quedó ningún elemento en esta página que necesitara un selector CSS
 * genérico: SauceDemo cubre con `data-test` todo lo que no tiene rol propio.
 */
export class InventoryPage {
  readonly page: Page;
  readonly sortDropdown: Locator;
  readonly inventoryItems: Locator;
  readonly cartBadge: Locator;
  readonly cartLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sortDropdown = page.getByRole('combobox', { name: 'Sort products' });
    // Cada tarjeta de producto comparte data-test="inventory-item" — no tiene
    // rol propio (no es una <ul>/<li> ni nada con semántica de lista), así
    // que getByTestId es la mejor opción disponible, por encima de `.inventory_item`.
    this.inventoryItems = page.getByTestId('inventory-item');
    // El badge es un <span> numérico sin rol semántico propio: es el caso real
    // de fallback a getByTestId que no logra subir al nivel 1 (rol/label).
    this.cartBadge = page.getByTestId('shopping-cart-badge');
    // El link del carrito SÍ tiene role="button" y aria-label dinámico
    // ("Cart, empty" / "Cart, N items") — se prioriza el rol sobre su
    // data-test="shopping-cart-link".
    this.cartLink = page.getByRole('button', { name: /^Cart/ });
  }

  async sortByPriceLowToHigh() {
    await this.sortDropdown.selectOption('lohi');
  }

  /**
   * Extrae {nombre, precio} de cada producto visible, en el orden actual del DOM.
   *
   * Lectura atómica necesaria: contar con `.count()` y luego leer cada fila
   * con `.nth(i)` son llamadas SEPARADAS — cada una vuelve a consultar el DOM
   * en ese instante. Durante una transición de página (justo después de
   * navegar), eso deja una ventana real donde `.count()` puede capturar un
   * número transitorio (ej. restos de la página anterior) que ya no coincide
   * con el DOM para cuando el bucle llega a `.nth(i)`, colgando la espera de
   * un elemento que nunca aparece. `locator.evaluateAll()` resuelve todos los
   * elementos y extrae los datos en una sola llamada atómica al navegador,
   * eliminando esa ventana (ver DEF-01/DEF-02 en documentation/03-reporte-hallazgos.md,
   * que documentan el mismo patrón de condición de carrera en este archivo).
   * El `waitFor` previo sigue siendo necesario: evita leer una lista vacía
   * si se llama antes de que el primer producto exista.
   */
  async getProductsWithPrices(): Promise<{ name: string; price: number; index: number }[]> {
    await this.inventoryItems.first().waitFor({ state: 'visible' });
    return this.inventoryItems.evaluateAll((items) =>
      items.map((item, index) => ({
        name: (item.querySelector('[data-test="inventory-item-name"]') as HTMLElement).innerText.trim(),
        price: Number(
          (item.querySelector('[data-test="inventory-item-price"]') as HTMLElement).innerText.replace('$', '')
        ),
        index,
      }))
    );
  }

  /** Agrega al carrito el producto ubicado en el índice dado (ya calculado dinámicamente). */
  async addToCartByIndex(index: number) {
    const item = this.inventoryItems.nth(index);
    await item.getByRole('button', { name: 'Add to cart' }).click();
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
   * Navega al carrito. Espera tanto la URL como un elemento exclusivo de
   * cart.html antes de devolver el control — ver DEF-06 en
   * documentation/03-reporte-hallazgos.md para la causa raíz completa:
   * `page.waitForURL()` puede resolver en cuanto el navegador actualiza la
   * barra de direcciones, que ocurre ANTES de que el documento nuevo termine
   * de cargar/renderizar. Confirmado con la traza real de un fallo: tras el
   * click, `waitForURL` se resolvió casi instantáneamente y la siguiente
   * lectura (un elemento con `data-test="inventory-item"`, el mismo test id
   * que usan tanto las tarjetas del catálogo como las filas del carrito) se
   * resolvió en ~12ms contra el DOM TODAVÍA en inventory.html. Por eso no
   * basta con esperar la URL: se espera además al botón "Checkout", que solo
   * existe en cart.html, como señal inequívoca de que el documento nuevo ya
   * renderizó su contenido propio.
   */
  async goToCart() {
    await this.cartLink.click();
    await this.page.waitForURL(/cart\.html/);
    await this.page.getByRole('button', { name: 'Checkout' }).waitFor({ state: 'visible' });
  }
}
