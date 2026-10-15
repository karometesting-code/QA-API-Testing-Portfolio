import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { expectMoneyEqual } from '../utils/money';

/**
 * Flujo 1 — Selección dinámica y validación de compra
 * Caso prioritario: TC-UI-01 (ver documentation/02-casos-de-prueba.md)
 *
 * Cada test es independiente: hace login desde cero en beforeEach,
 * no depende de estado dejado por otro test ni de datos fijos.
 */
test.describe('Flujo 1 - Compra con selección dinámica por precio', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('standard_user', 'secret_sauce');
    await login.expectLoggedIn();
  });

  test('TC-UI-01: agrega el producto más barato y más caro, y valida subtotal + impuesto = total', async ({
    page,
  }) => {
    const inventory = new InventoryPage(page);
    const cart = new CartPage(page);
    const checkout = new CheckoutPage(page);

    // 2. Ordenar el catálogo por Price (low to high)
    await inventory.sortByPriceLowToHigh();

    // Selección dinámica: se lee el precio ya ordenado, no se asume nombre/posición
    const products = await inventory.getProductsWithPrices();
    expect(products.length).toBeGreaterThan(1);

    const cheapest = products[0];
    const mostExpensive = products[products.length - 1];
    expect(cheapest.price).toBeLessThanOrEqual(mostExpensive.price);

    // 3. Agregar al carrito el producto de menor precio
    await inventory.addToCartByIndex(cheapest.index);
    // 4. Agregar al carrito el producto de mayor precio
    //    (el índice del más caro no cambia al agregar el primero: el orden de la lista se mantiene)
    await inventory.addToCartByIndex(mostExpensive.index);

    await expect(inventory.cartBadge).toHaveText('2');

    // 5. Completar el checkout
    await inventory.goToCart();
    await cart.goToCheckout();
    await checkout.fillInfo('Karen', 'Romero', '110111');
    await checkout.continueToOverview();

    // 6. Validar mediante fórmula en código que Subtotal + Impuesto = Total
    const subtotal = await checkout.getSubtotal();
    const tax = await checkout.getTax();
    const total = await checkout.getTotal();

    const expectedSubtotal = cheapest.price + mostExpensive.price;
    expect(expectMoneyEqual(subtotal, expectedSubtotal)).toBeTruthy();
    expect(expectMoneyEqual(subtotal + tax, total)).toBeTruthy();

    // 7. Validar la confirmación de la compra
    await checkout.finishPurchase();
    await expect(checkout.completeHeader).toHaveText(/Thank you for your order!/i);
  });
});
