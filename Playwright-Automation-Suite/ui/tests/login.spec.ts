import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { users, invalidPassword } from '../fixtures/users';

/**
 * Login — casos de regresión complementarios a los Flujos 1 y 2.
 * No forman parte del enunciado de la prueba técnica, pero cubren el punto
 * de entrada de toda la suite (login) con escenarios positivos y negativos,
 * siguiendo el mismo patrón AAA (Arrange-Act-Assert) del resto de specs.
 */
test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
  });

  test('un usuario estándar puede iniciar sesión con credenciales válidas', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(users.standardUser.username, users.standardUser.password);

    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('un usuario bloqueado ve un mensaje de error que impide el acceso', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(users.lockedOutUser.username, users.lockedOutUser.password);

    await expect(login.errorMessage).toBeVisible();
    await expect(login.errorMessage).toContainText('locked out');
  });

  test('una contraseña incorrecta es rechazada', async ({ page }) => {
    const login = new LoginPage(page);
    await login.login(users.standardUser.username, invalidPassword);

    await expect(login.errorMessage).toBeVisible();
    await expect(login.errorMessage).toContainText('do not match');
  });

  test('enviar el formulario vacío muestra un error de validación', async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginButton.click();

    await expect(login.errorMessage).toBeVisible();
    await expect(login.errorMessage).toContainText('Username is required');
  });
});
