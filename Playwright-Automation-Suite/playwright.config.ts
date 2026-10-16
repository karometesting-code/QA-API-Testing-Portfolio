import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración central de Playwright.
 * - UI: corre contra SauceDemo (saucedemo.com), con cobertura cross-browser
 *   (Chromium, Firefox, WebKit) para las pruebas locales/manuales.
 * - API: corre contra Restful Booker, sin navegador (usa APIRequestContext).
 * Ambas suites conviven en el mismo repositorio/config, diferenciadas por carpeta (testDir implícito por proyecto).
 *
 * Nota de CI: el pipeline (.github/workflows/ci.yml) ejecuta únicamente el
 * proyecto `ui-chromium` + `api-restful-booker` para mantener el pipeline
 * rápido y estable en runners compartidos; Firefox y WebKit quedan
 * disponibles para correr cross-browser en local (`npm run test:all-browsers`).
 */
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  // SauceDemo marca sus elementos de prueba con `data-test` (no el `data-testid`
  // que Playwright usa por defecto). Configurarlo aquí permite usar el locator
  // integrado `getByTestId()` en vez de selectores manuales `[data-test="..."]`
  // — ver README, sección "Estrategia de locators", para el criterio completo.
  use: { testIdAttribute: 'data-test' },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
  ],
  outputDir: 'test-results',

  projects: [
    {
      name: 'ui-chromium',
      testDir: './ui/tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://www.saucedemo.com',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
    {
      name: 'ui-firefox',
      testDir: './ui/tests',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: 'https://www.saucedemo.com',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
    {
      name: 'ui-webkit',
      testDir: './ui/tests',
      use: {
        ...devices['Desktop Safari'],
        baseURL: 'https://www.saucedemo.com',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
    {
      name: 'api-restful-booker',
      testDir: './api/tests',
      use: {
        baseURL: 'https://restful-booker.herokuapp.com',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    },
  ],
});
