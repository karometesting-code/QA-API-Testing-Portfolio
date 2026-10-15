import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';

/**
 * Flujo 2 — Carrito y validaciones
 * Caso prioritario: TC-UI-04 (ver documentation/02-casos-de-prueba.md)
 *
 * Prohibido Thread.sleep()/espera fija: toda sincronización usa el
 * auto-waiting de Playwright + expect(locator).toX(), que reintenta
 * hasta su propio timeout (espera explícita, no arbitraria).
 */
test.describe('Flujo 2 - Carrito: conteo dinámico, eliminación por precio y validación de error', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('standard_user', 'secret_sauce');
    await login.expectLoggedIn();
  });

  test('TC-UI-04: agrega 3 productos, elimina el más caro, y valida error de checkout incompleto', async ({
    page,
  }) => {
    const inventory = new InventoryPage(page);
    const cart = new CartPage(page);
    const checkout = new CheckoutPage(page);

    // 2. Agregar 3 productos diferentes al carrito (selección dinámica: los 3 primeros del catálogo)
    const products = await inventory.getProductsWithPrices();
    const chosenThree = products.slice(0, 3);
    for (const product of chosenThree) {
      await inventory.addToCartByIndex(product.index);
    }

    // 3. Validar que el contador del carrito sea 3 (espera explícita vía expect, no sleep)
    await expect(inventory.cartBadge).toHaveText('3');

    await inventory.goToCart();
    const cartItems = await cart.getItemsWithPrices();
    expect(cartItems.length).toBe(3);

    // 4. Identificar y eliminar el producto de mayor precio (cálculo dinámico, no por nombre)
    const mostExpensiveInCart = cartItems.reduce((max, item) => (item.price > max.price ? item : max));
    await cart.removeItemByIndex(mostExpensiveInCart.index);

    // 5. Validar que el contador se actualice a 2
    await expect(cart.cartBadge).toHaveText('2');

    // 6. Intentar continuar al checkout sin completar los datos requeridos
    await cart.goToCheckout();
    await checkout.continueToOverview(); // formulario vacío a propósito

    // 7. Validar el mensaje de error correspondiente
    await expect(checkout.errorMessage).toBeVisible();
    await expect(checkout.errorMessage).toContainText(/First Name is required/i);
  });
});
