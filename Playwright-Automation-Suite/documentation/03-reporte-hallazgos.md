# Reporte de hallazgos

> Esta suite se ejecutó de punta a punta contra `saucedemo.com` y `restful-booker.herokuapp.com` el 15/10/2026 (ver `README.md`, sección Resultados, para el resumen de la corrida). Los hallazgos de esta sección provienen de esa ejecución real, no de hipótesis.

## Plantilla de defecto

| Campo | Descripción |
|---|---|
| **ID** | DEF-XX |
| **Título** | Resumen de una línea |
| **Descripción** | Qué está mal, en qué componente |
| **Pasos para reproducir** | Numerados, desde un estado inicial conocido |
| **Resultado esperado** | Qué debería pasar según el requerimiento/documentación |
| **Resultado actual** | Qué pasa realmente |
| **Severidad** | Crítica / Alta / Media / Baja |
| **Evidencia** | Captura de pantalla, log de consola, respuesta HTTP cruda, link al reporte HTML de Playwright |
| **Ambiente** | Navegador/versión, SO, URL del ambiente, commit/branch de la suite |

---

## DEF-01 — Condición de carrera al leer el carrito justo después de navegar (CORREGIDO)

| Campo | Valor |
|---|---|
| **ID** | DEF-01 |
| **Título** | `CartPage.getItemsWithPrices()` podía leer 0 ítems aunque el carrito tuviera 3 |
| **Descripción** | `getItemsWithPrices()` usaba `locator.count()`, que lee el DOM en el instante exacto en que se llama y **no reintenta**. Al invocarse justo después de `inventory.goToCart()` (un simple `click()`), la navegación a `cart.html` a veces no había terminado de renderizar, y `count()` devolvía 0 aunque el carrito sí tuviera los 3 productos agregados. |
| **Pasos para reproducir** | 1. Login. 2. Agregar 3 productos. 3. `goToCart()` sin esperar navegación. 4. Llamar `getItemsWithPrices()` inmediatamente. |
| **Resultado esperado** | `cartItems.length === 3` |
| **Resultado actual (antes del fix)** | `cartItems.length === 0` — falla intermitente de `TC-UI-04` en Chromium, reproducida en la primera corrida real (ver `test-results/flow2-cart-...-ui-chromium/` para la traza original). |
| **Severidad** | Alta (bloqueaba un caso de prioridad Alta, TC-UI-04) |
| **Causa raíz** | Falta de espera explícita a que la navegación/render terminara antes de contar. |
| **Corrección aplicada** | `InventoryPage.goToCart()` ahora espera `page.waitForURL(/cart\.html/)` después del click (commit de esta entrega, ver `ui/pages/InventoryPage.ts`). |
| **Evidencia** | Captura (`test-failed-1.png`) y traza (`trace.zip`) generadas por Playwright en la corrida que reprodujo el fallo; ambas reemplazadas por una corrida 100% verde tras el fix (ver `reports/html-report/`). |
| **Ambiente** | Chromium (Playwright 1.64), Windows 10, `https://www.saucedemo.com` |

## DEF-02 — Misma condición de carrera al leer el catálogo tras el login (CORREGIDO)

| Campo | Valor |
|---|---|
| **ID** | DEF-02 |
| **Título** | `InventoryPage.getProductsWithPrices()` podía leer 0 productos en WebKit |
| **Descripción** | Mismo patrón que DEF-01: `getProductsWithPrices()` contaba con `locator.count()` sin esperar a que la grilla de productos renderizara. En WebKit, `page.waitForURL(/inventory\.html/)` resuelve apenas cambia la URL, antes de que el JS de SauceDemo pinte los `.inventory_item`; eso dejaba una ventana donde `count()` devolvía 0. |
| **Pasos para reproducir** | 1. Login con `standard_user` en el proyecto `ui-webkit`. 2. Llamar `getProductsWithPrices()` inmediatamente después de `expectLoggedIn()`. |
| **Resultado esperado** | 6 productos listados (el catálogo completo de SauceDemo) |
| **Resultado actual (antes del fix)** | 0 productos — reproducido de forma determinística 3/3 veces en `ui-webkit` con `--workers=1 --repeat-each=3` (descartando que fuera flakiness por paralelismo). Diagnosticado con un script aislado (`webkit.launch()` + `devices['Desktop Safari']`) que confirmó `inventoryItems.count() === 0` inmediatamente después de `waitForURL`. |
| **Severidad** | Alta (bloqueaba TC-UI-01 y TC-UI-04 de forma consistente en WebKit) |
| **Causa raíz** | Igual a DEF-01: lectura de DOM sin espera explícita tras una navegación. |
| **Corrección aplicada** | `getProductsWithPrices()` ahora espera `inventoryItems.first().waitFor({ state: 'visible' })` antes de contar; `CartPage.getItemsWithPrices()` recibió la misma espera (tolerando el timeout, porque a diferencia del catálogo el carrito sí puede estar legítimamente vacío). |
| **Evidencia** | Corrida completa 36/36 verde en Chromium + Firefox + WebKit tras el fix (`reports/html-report/`, `reports/junit/results.xml`). |
| **Ambiente** | WebKit (Playwright 1.64, `devices['Desktop Safari']`), Windows 10, `https://www.saucedemo.com` |

**Nota de proceso:** DEF-01 y DEF-02 no son bugs de SauceDemo — son defectos de la propia suite de automatización, encontrados precisamente por ejecutarla de verdad contra el sitio real en vez de darla por buena sin correr. Se documentan aquí porque la causa raíz (confiar en `locator.count()` sin esperar explícitamente) es el tipo exacto de anti-patrón que la prueba técnica pide evitar ("prohibición estricta de esperas fijas, usar esperas explícitas"), y porque sirven de evidencia de que la suite fue depurada contra comportamiento real, no solo redactada.

## DEF-03 — `POST /booking` acepta `totalprice` de tipo incorrecto y lo corrompe silenciosamente (CONFIRMADO, no corregible — API pública de terceros)

| Campo | Valor |
|---|---|
| **ID** | DEF-03 |
| **Título** | La API no valida el tipo de `totalprice` y lo reemplaza por `null` en vez de rechazar la petición |
| **Descripción** | `POST /booking` con `totalprice: "cien"` (string, en vez de `number`) no es rechazado con `400 Bad Request`. En su lugar, la API responde `200 OK` y **persiste el booking con `totalprice: null`**, descartando silenciosamente el valor enviado. Es un defecto de validación de entrada, agravado porque corrompe el dato en vez de simplemente ignorarlo. |
| **Pasos para reproducir** | `POST https://restful-booker.herokuapp.com/booking` con body `{"firstname":"TypeTest","lastname":"Romero","totalprice":"cien","depositpaid":true,"bookingdates":{"checkin":"2026-11-01","checkout":"2026-11-05"}}` |
| **Resultado esperado** | `400 Bad Request` indicando que `totalprice` debe ser numérico |
| **Resultado actual** | `200 OK` — `{"bookingid":4770,"booking":{"firstname":"TypeTest","lastname":"Romero","totalprice":null,"depositpaid":true,"bookingdates":{...}}}` (respuesta real capturada el 15/10/2026; el booking de prueba se eliminó inmediatamente después vía `DELETE` autenticado, sin dejar datos huérfanos). |
| **Severidad** | Media (API pública de práctica, no un sistema productivo — pero el patrón "silently null en vez de rechazar" sería Alta en un sistema real de reservas/pagos) |
| **Prioridad de corrección** | Baja — fuera de nuestro control, es una API de terceros usada como ambiente de práctica. Se documenta como hallazgo de regresión candidato (TC-API-04 en `02-casos-de-prueba.md`), no se automatizó como test fijo en la suite CI porque dependemos de un comportamiento que Restful Booker podría cambiar sin aviso. |
| **Evidencia** | Respuesta HTTP cruda capturada arriba (petición manual con `fetch`, reproducible con cualquier cliente HTTP) |
| **Ambiente** | `https://restful-booker.herokuapp.com`, API v1, 15/10/2026 |

## DEF-04 — Error de tipos en modo `strict` no detectado por el test runner (CORREGIDO)

| Campo | Valor |
|---|---|
| **ID** | DEF-04 |
| **Título** | `api/tests/booking-crud.spec.ts` no compilaba en modo `strict` de TypeScript |
| **Descripción** | `expect(getBody).toMatchObject(newBooking)` pasaba un valor de tipo `Booking` (interfaz nominal, sin index signature) donde Playwright espera `Record<string, unknown>`. El test runner de Playwright transpila con `esbuild` sin chequeo de tipos completo, así que el test **pasaba en ejecución** aunque el archivo no compilara con `tsc --noEmit` — un caso real de "los tests están en verde pero el código no es correcto", que solo aparece si se corre el type-checker, no solo el test runner. |
| **Pasos para reproducir** | `npx tsc --noEmit` sobre el repositorio con el código original de la entrega. |
| **Resultado esperado** | 0 errores de compilación (`tsconfig.json` ya declara `"strict": true`) |
| **Resultado actual (antes del fix)** | `TS2345: Argument of type 'Booking' is not assignable to parameter of type 'unknown[] | Record<string, unknown>'` |
| **Severidad** | Baja (no afectaba el comportamiento en ejecución, solo la garantía de tipos) |
| **Corrección aplicada** | Cast explícito y documentado (`newBooking as unknown as Record<string, unknown>`) en la línea del `toMatchObject`. Se agregó `npm run typecheck` como script y como paso del pipeline de CI (antes de ejecutar las pruebas), para que este tipo de defecto no pueda volver a pasar inadvertido. |
| **Evidencia** | Salida de `npx tsc --noEmit` antes y después del fix (limpia tras la corrección) |
| **Ambiente** | TypeScript 5.6, `tsconfig.json` con `"strict": true` |

## DEF-05 — El pipeline de CI nunca se habría ejecutado: workflow ubicado fuera de donde GitHub Actions lo busca (CORREGIDO)

| Campo | Valor |
|---|---|
| **ID** | DEF-05 |
| **Título** | `ci.yml` estaba en `Playwright-Automation-Suite/.github/workflows/`, una ruta que GitHub Actions no indexa |
| **Descripción** | GitHub Actions descubre workflows **únicamente** en `.github/workflows/` en la **raíz** del repositorio. Como este repositorio es un portafolio monorepo (varios proyectos en subcarpetas), el archivo quedó anidado dentro de `Playwright-Automation-Suite/.github/workflows/ci.yml` — una ruta válida en el sistema de archivos, pero invisible para GitHub Actions. El pipeline nunca se habría disparado con ningún `push`, aunque el YAML en sí era válido. |
| **Pasos para reproducir** | 1. Hacer push de un commit que agrega `Playwright-Automation-Suite/.github/workflows/ci.yml`. 2. Consultar `GET /repos/{owner}/{repo}/actions/workflows` vía la API de GitHub. |
| **Resultado esperado** | El workflow aparece listado y se dispara en el push |
| **Resultado actual (antes del fix)** | `{"total_count": 0, "workflows": []}` — cero workflows registrados pese al push exitoso del archivo (confirmado vía API real tras el primer push de esta entrega) |
| **Severidad** | Crítica (invalidaba por completo el entregable "Pipeline CI/CD funcional con evidencia de ejecución") |
| **Causa raíz** | Desconocimiento/descuido de la restricción de ubicación de GitHub Actions en un repositorio multi-proyecto. |
| **Corrección aplicada** | Se movió el archivo a `/.github/workflows/ci.yml` (raíz del repo). Se agregaron `paths` filters (`Playwright-Automation-Suite/**`) para que el pipeline no se dispare por cambios en los otros proyectos del portafolio (Jira, Postman), y `defaults.run.working-directory: Playwright-Automation-Suite` para que los pasos `run:` operen dentro de la carpeta del proyecto sin repetir `cd` en cada comando. |
| **Evidencia** | Respuesta de la API antes (`total_count: 0`) vs. después del fix: tras mover el archivo, [el primer run real quedó en verde](https://github.com/karometesting-code/QA-API-Testing-Portfolio/actions/runs/38827004657) (14/14 pasos, 3 artefactos publicados), y una segunda corrida con una aserción rota a propósito [quedó correctamente en rojo](https://github.com/karometesting-code/QA-API-Testing-Portfolio/actions/runs/38828517953), confirmando que el pipeline detecta y reporta fallos reales — ver `README.md`, sección Pipeline CI/CD, para el detalle de ambas corridas |
| **Ambiente** | `github.com/karometesting-code/QA-API-Testing-Portfolio`, GitHub Actions, 15/10/2026 |

## DEF-06 — Causa raíz más profunda de DEF-01/DEF-02: `page.waitForURL()` puede resolver antes de que el documento nuevo termine de renderizar (CORREGIDO)

| Campo | Valor |
|---|---|
| **ID** | DEF-06 |
| **Título** | Esperar solo la URL tras una navegación no garantiza que el contenido de la página destino ya esté disponible |
| **Descripción** | Al refactorizar los locators para priorizar `getByRole`/`getByTestId` (ver README, sección "Estrategia de locators"), `flow2-cart.spec.ts` y dos pruebas de `cart-and-checkout-extra.spec.ts` volvieron a fallar en WebKit pese a que DEF-01/DEF-02 ya estaban corregidos. Se analizó la traza real de un fallo (`trace.zip` de Playwright) y se confirmó la causa exacta: tras el `click()` en el link del carrito, `page.waitForURL(/cart\.html/)` se resolvió en apenas unos milisegundos — demasiado rápido para una carga real de página — porque el navegador actualiza la barra de direcciones casi de inmediato al iniciar la navegación, **antes** de que el documento nuevo termine de cargar y renderizar su contenido. La siguiente lectura (`getByTestId('inventory-item')`, el mismo test id que comparten las tarjetas del catálogo y las filas del carrito) se resolvió contra el DOM **todavía en inventory.html**. El mismo patrón, en su variante de escritura, hacía que `CheckoutPage.fillInfo()` llenara el campo "First Name" mientras checkout-step-one.html aún se estaba hidratando: `.fill()` no reportaba error, pero el valor se perdía (quedaba vacío), mientras que los campos siguientes (ya con la página estable) sí se guardaban correctamente. |
| **Pasos para reproducir** | Correr `flow1-purchase.spec.ts`, `flow2-cart.spec.ts` y `cart-and-checkout-extra.spec.ts` en el proyecto `ui-webkit` con `--workers=1 --repeat-each=10`: antes del fix, 2/80 corridas fallaban de forma intermitente (2.5%) — una con `cartItems` leyendo el catálogo completo en vez del carrito, otra con el campo "First Name" vacío pese a haberse llenado. |
| **Resultado esperado** | Cualquier lectura o escritura posterior a una navegación debe operar sobre el documento realmente cargado, no sobre el anterior |
| **Resultado actual (antes del fix)** | Lecturas devolviendo datos de la página anterior; escrituras perdiéndose silenciosamente en el primer campo de un formulario recién montado |
| **Severidad** | Alta (flakiness real e intermitente en WebKit, exactamente el tipo de defecto que compromete la confiabilidad de una suite de automatización) |
| **Causa raíz** | `page.waitForURL()` (y, en general, confiar únicamente en un cambio de URL) no es una señal suficiente de que el documento destino terminó de renderizar su contenido — es necesario esperar además un elemento exclusivo de esa página destino. |
| **Corrección aplicada** | `InventoryPage.goToCart()` ahora espera también al botón "Checkout" (exclusivo de cart.html) después de `waitForURL`; `CartPage.goToCheckout()` ahora espera al campo "First Name" (exclusivo de checkout-step-one.html) después del click. Además, `getProductsWithPrices()`/`getItemsWithPrices()`/`getItemNames()` se reescribieron para leer con `locator.evaluateAll()` (una sola llamada atómica) en vez de `.count()` + bucle de `.nth(i)` (múltiples llamadas separadas, cada una una ventana de carrera adicional). |
| **Evidencia** | Traza real de Playwright (`trace.zip`) con los timestamps de cada acción, mostrando el `waitForSelector` del carrito resolviéndose en ~12ms tras `waitForURL` — demasiado rápido para una carga real; 80/80 corridas en verde tras aplicar ambas correcciones (`--workers=1 --repeat-each=10` en `ui-webkit`) |
| **Ambiente** | WebKit (Playwright 1.64, `devices['Desktop Safari']`), Windows 10, `https://www.saucedemo.com` |
