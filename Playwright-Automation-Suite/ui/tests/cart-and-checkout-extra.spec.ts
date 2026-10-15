import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { users } from '../fixtures/users';

const BACKPACK = 'Sauce Labs Backpack';
const BIKE_LIGHT = 'Sauce Labs Bike Light';

/**
 * Carrito y checkout — casos de regresión complementarios a los Flujos 1 y 2
 * (TC-UI-02, TC-UI-03, TC-UI-05, TC-UI-06 de documentation/02-casos-de-prueba.md).
 * Aquí la selección por nombre fijo es intencional: no son los casos que el
 * enunciado exige con selección dinámica por precio (eso vive en flow1/flow2),
 * sino cobertura adicional del comportamiento del carrito y del formulario.
 */
test.describe('Carrito y checkout - casos complementarios', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(users.standardUser.username, users.standardUser.password);
    await login.expectLoggedIn();
  });

  test('TC-UI-06: el carrito inicia vacío para una sesión recién autenticada', async ({ page }) => {
    const inventory = new InventoryPage(page);
    // SauceDemo no renderiza el badge en absoluto cuando el carrito está vacío.
    await expect(inventory.cartBadge).toHaveCount(0);
  });

  test('agregar múltiples productos acumula el contador del carrito', async ({ page }) => {
    const inventory = new InventoryPage(page);
    await inventory.addProductToCart(BACKPACK);
    await inventory.addProductToCart(BIKE_LIGHT);

    await expect(inventory.cartBadge).toHaveText('2');
  });

  test('eliminar un producto desde el catálogo actualiza el contador', async ({ page }) => {
    const inventory = new InventoryPage(page);
    await inventory.addProductToCart(BACKPACK);
    await inventory.addProductToCart(BIKE_LIGHT);

    await inventory.removeProductFromCart(BACKPACK);

    await expect(inventory.cartBadge).toHaveText('1');
  });

  test('el carrito lista exactamente los productos agregados', async ({ page }) => {
    const inventory = new InventoryPage(page);
    const cart = new CartPage(page);

    await inventory.addProductToCart(BACKPACK);
    await inventory.addProductToCart(BIKE_LIGHT);
    await inventory.goToCart();

    const itemNames = await cart.getItemNames();
    expect(itemNames).toHaveLength(2);
    expect(itemNames).toEqual(expect.arrayContaining([BACKPACK, BIKE_LIGHT]));
  });

  test('eliminar un producto desde la página del carrito actualiza la lista y el contador', async ({
    page,
  }) => {
    const inventory = new InventoryPage(page);
    const cart = new CartPage(page);

    await inventory.addProductToCart(BACKPACK);
    await inventory.addProductToCart(BIKE_LIGHT);
    await inventory.goToCart();

    await cart.removeProduct(BACKPACK);

    await expect(cart.cartItems).toHaveCount(1);
    expect(await cart.getItemNames()).toEqual([BIKE_LIGHT]);
  });

  test('TC-UI-02: código postal vacío bloquea el checkout con el error correspondiente', async ({
    page,
  }) => {
    const inventory = new InventoryPage(page);
    const cart = new CartPage(page);
    const checkout = new CheckoutPage(page);

    await inventory.addProductToCart(BACKPACK);
    await inventory.goToCart();
    await cart.goToCheckout();

    await checkout.fillInfo('Karen', 'Romero', '');
    await checkout.continueToOverview();

    await expect(checkout.errorMessage).toBeVisible();
    await expect(checkout.errorMessage).toContainText(/Postal Code is required/i);
  });
});
