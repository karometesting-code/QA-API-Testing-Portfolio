# Playwright Automation Suite — UI + API + Performance + CI/CD

Suite de automatización end-to-end: pruebas UI y API con Playwright, pruebas de rendimiento con k6, e integración continua con GitHub Actions. Cubre el ciclo completo de aseguramiento de calidad — planeación, diseño de casos, automatización UI/API, performance, CI/CD y reporte formal de hallazgos — en un único repositorio.

## Descripción del proyecto

- **UI**: Playwright + TypeScript sobre [SauceDemo](https://www.saucedemo.com), con Page Object Model, cross-browser (Chromium, Firefox, WebKit). Cubre selección dinámica de productos por precio, validación matemática de checkout (Subtotal + Impuesto = Total), gestión del carrito con validación de errores, y una suite de regresión complementaria (login positivo/negativo, carrito básico).
- **API**: Playwright (`APIRequestContext`) sobre [Restful Booker](https://restful-booker.herokuapp.com), cubriendo el ciclo de vida completo de una reserva (POST/GET/PUT/DELETE) y casos negativos de manejo de errores.
- **Performance**: k6, prueba de carga sobre `GET /booking` (10 VUs, ramp-up 30s, duración 2min).
- **Pipeline**: GitHub Actions, triggers en `push` y `pull_request`, dos jobs (tests funcionales y performance), con reportes publicados como artefactos.

Esta suite se ejecutó de punta a punta contra los sitios reales — ver la sección **Resultados** más abajo para los números reales de la última corrida, incluyendo dos defectos de sincronización encontrados y corregidos durante esa ejecución.

## Herramientas utilizadas

| Herramienta | Para qué | Justificación |
|---|---|---|
| Playwright + TypeScript | Automatización UI y API | Un solo lenguaje y un solo framework para ambas suites, en el mismo repositorio y la misma configuración (`playwright.config.ts` con proyectos separados por capa). Auto-waiting nativo (cumple la prohibición de `Thread.sleep`), `APIRequestContext` cubre las pruebas de API sin herramienta adicional, y cross-browser real (Chromium/Firefox/WebKit) sin configuración extra. |
| k6 | Prueba de carga | Scripts en JavaScript (mismo ecosistema que el resto del repo), liviano, se integra de forma nativa en GitHub Actions, y da métricas P90/P95/throughput out-of-the-box sin la sobrecarga de una GUI como JMeter. |
| GitHub Actions | CI/CD | Triggers nativos de push/PR, runners con navegadores preinstalables (`playwright install`) y acceso a internet real, publicación de artefactos integrada. |
| Node.js 20 | Runtime | — |

Justificación completa (incluyendo riesgos, priorización y criterios de entrada/salida) en [`documentation/01-estrategia-de-pruebas.md`](documentation/01-estrategia-de-pruebas.md).

## Requisitos

- Node.js 20+
- npm
- [k6](https://k6.io/docs/get-started/installation/) instalado localmente (solo si se quiere correr performance fuera del pipeline — el binario portable sin instalador funciona igual de bien que el paquete con instalador)

## Instalación

```bash
npm install
npx playwright install --with-deps chromium firefox webkit
```

## Configuración

No requiere variables de entorno ni secretos: SauceDemo y Restful Booker usan credenciales públicas de práctica (`standard_user`/`secret_sauce` y `admin`/`password123` respectivamente), ya incluidas en el código de los tests.

## Ejecución

```bash
# Solo UI (Chromium, rápido — el que corre en CI)
npm run test:ui

# UI en los 3 navegadores (Chromium + Firefox + WebKit)
npm run test:ui:all-browsers

# Solo API
npm run test:api

# UI (Chromium) + API
npm run test:all

# UI con navegador visible (debugging)
npm run test:headed

# Ver el último reporte HTML de Playwright
npm run test:report

# Performance (requiere k6 instalado o el binario portable en el PATH)
npm run perf:booking
```

## Generación de reportes

- Playwright genera automáticamente reporte HTML (`reports/html-report/`) y JUnit XML (`reports/junit/`) en cada corrida (ver `playwright.config.ts`).
- k6 imprime un resumen en consola y guarda `reports/performance/k6-summary.json` (+ `k6-result.json` con el detalle punto a punto si se usa `--out json=...`).
- En CI, ambos reportes se publican como artefactos descargables del workflow (ver pestaña *Actions* del repositorio). El workflow vive en `/.github/workflows/ci.yml` (raíz del repositorio, no en esta carpeta) porque GitHub Actions solo descubre workflows ahí; está acotado a este proyecto con `paths` filters y `working-directory`.

## Resultados (última ejecución real — 15/10/2026)

### UI

- **39/39 tests en verde** en Chromium, Firefox y WebKit (13 tests × 3 navegadores): Flujo 1, Flujo 2, login (4 casos) y carrito/checkout complementario (6 casos).
- La primera corrida real encontró y corrigió **2 defectos de sincronización** en los page objects (`DEF-01`, `DEF-02` — ver [`documentation/03-reporte-hallazgos.md`](documentation/03-reporte-hallazgos.md)): lecturas de carrito/catálogo con `locator.count()` inmediatamente después de una navegación, sin esperar a que el DOM terminara de renderizar. Intermitente en Chromium, consistente (3/3) en WebKit. Corregido con esperas explícitas.
- Al refactorizar los locators para priorizar `getByRole`/`getByTestId` (ver sección "Estrategia de locators"), una batería de estrés (`--workers=1 --repeat-each=10` en WebKit) expuso un defecto más profundo (`DEF-06`): `page.waitForURL()` puede resolver antes de que la página destino termine de renderizar su contenido, no solo antes de que `locator.count()` cuente bien (DEF-01/02), sino también haciendo que un `.fill()` en el primer campo de un formulario recién montado se perdiera silenciosamente. Corregido esperando un elemento exclusivo de cada página destino además de la URL, y leyendo listas con `locator.evaluateAll()` (atómico) en vez de `.count()` + bucle. Confirmado con 80/80 corridas en verde tras el fix.

### API

- **3/3 tests en verde** contra Restful Booker: ciclo de vida completo de reserva (TC-API-01) y 2 casos negativos (TC-API-02, TC-API-03).
- Se confirmó un hallazgo adicional (`DEF-03`): `POST /booking` acepta `totalprice` con tipo incorrecto (string) sin rechazarlo, y lo persiste como `null` en vez de conservar o validar el valor. Documentado como defecto de la API pública, no corregible desde este repositorio.
- `npx tsc --noEmit` encontró un error de tipos real en modo `strict` que el test runner no detectaba (`DEF-04`, ver reporte de hallazgos). Corregido, y agregado como paso (`npm run typecheck`) tanto localmente como en el pipeline de CI para que no vuelva a pasar inadvertido.

### Performance

Prueba de carga real con k6 v2.2.0 sobre `GET /booking` (10 VUs, ramp-up 30s, 2min sostenidos):

| Métrica | Resultado | Umbral | Cumple |
|---|---|---|---|
| Peticiones totales | 1138 | — | — |
| Tiempo promedio | 219.91 ms | — | — |
| P90 | 238.29 ms | < 1500 ms | ✅ |
| P95 | 299.78 ms | < 2500 ms | ✅ |
| Throughput | 7.07 req/s | — | — |
| % de errores | 0.09% (1/1138, falla de DNS del cliente, no del servidor) | < 5% | ✅ |

**Conclusión formal:** sí, el endpoint soporta adecuadamente la carga definida — los tres umbrales se cumplieron con holgura de más de 5x y la tasa de error atribuible al servidor fue 0%. Análisis completo, con matices sobre el alcance de esta conclusión, en [`documentation/01-estrategia-de-pruebas.md`](documentation/01-estrategia-de-pruebas.md).

### Pipeline CI/CD

El primer push con el workflow reveló un quinto hallazgo (`DEF-05`, crítico): el archivo estaba en `Playwright-Automation-Suite/.github/workflows/ci.yml`, una ruta que GitHub Actions no indexa (solo descubre workflows en `.github/workflows/` en la raíz del repositorio) — confirmado vía la API de GitHub (`"total_count": 0` workflows registrados). Corregido moviendo el archivo a la raíz del repo con `paths` filters acotando el pipeline a este proyecto.

Evidencia real de ambos escenarios pedidos por el enunciado:

| Corrida | Resultado | Detalle |
|---|---|---|
| [Run #1 — main, commit `7b3e036`](https://github.com/karometesting-code/QA-API-Testing-Portfolio/actions/runs/38827004657) | ✅ Exitosa | 14/14 pasos en verde (incluye `typecheck`), job de performance corrido, 3 artefactos publicados (`playwright-html-report`, `playwright-junit-report`, `k6-performance-report`) |
| [Run #2 — rama `evidence/ci-failing-run` (temporal, ya eliminada)](https://github.com/karometesting-code/QA-API-Testing-Portfolio/actions/runs/38828517953) | ❌ Fallida (intencional) | TC-UI-04 roto a propósito (badge esperado `'99'` en vez de `'2'`) para demostrar que el pipeline detecta y reporta un fallo real: el job de pruebas terminó en `failure`, el job de performance se saltó por la dependencia no satisfecha (`needs`), y los reportes HTML/JUnit se publicaron igual gracias al `if: always()` en los pasos de artefactos |

La rama de la corrida fallida se eliminó después de capturar la evidencia (nunca se mezcló a `main`); el run en sí queda permanentemente visible en la pestaña *Actions* del repositorio, enlazado por su commit, independientemente de que la rama ya no exista.

## Decisiones técnicas relevantes

- **Un solo framework (Playwright) para UI y API**: simplifica el repositorio, el pipeline y la curva de aprendizaje, en vez de mezclar herramientas distintas para cada capa.
- **Selección 100% dinámica de productos en los Flujos 1 y 2**: ningún test de esos flujos depende de nombres ni posiciones fijas en el catálogo, cumpliendo explícitamente la consideración del enunciado original. Las pruebas de regresión complementarias (login, carrito básico) sí usan nombres de producto fijos de forma deliberada — no son los casos que exigen selección dinámica, y usar nombres ahí hace esos tests más legibles.
- **Cero `Thread.sleep()` / esperas fijas**: toda sincronización usa el auto-waiting nativo de Playwright o esperas explícitas (`waitForURL`, `locator.waitFor(...)`, `expect(locator).toX()`). Este principio es, de hecho, la causa raíz documentada de los defectos reales encontrados durante la ejecución (`DEF-01`, `DEF-02`, `DEF-06`): cada vez que una lectura o escritura ocurrió justo después de una navegación sin esperar explícitamente a que la página destino estuviera realmente lista, la suite falló contra el sitio real — ver `documentation/03-reporte-hallazgos.md` para el análisis completo, incluyendo por qué ni siquiera `page.waitForURL()` es, por sí solo, una garantía suficiente.
- **Ejecución real antes de considerar la entrega terminada**: el código se corrió de punta a punta contra SauceDemo y Restful Booker reales (no solo se validó por lectura), lo que permitió encontrar y corregir bugs de sincronización que una revisión de código no habría detectado.
- **Locators integrados de Playwright por encima de selectores genéricos**: ver sección "Estrategia de locators" más abajo.
- **Datos de API únicos por corrida + teardown explícito**: evita colisiones en el ambiente público y compartido de Restful Booker; los tests de API limpian lo que crean.
- **k6 sobre JMeter**: mismo lenguaje (JS) que el resto del repo, scripting como código versionable (vs. GUI/XML de JMeter), e integración nativa con GitHub Actions vía `grafana/setup-k6-action`.
- **CI corre solo Chromium**: Firefox y WebKit quedan disponibles para correr cross-browser en local (`npm run test:ui:all-browsers`); limitar CI a un navegador mantiene el pipeline rápido y estable en runners compartidos, una decisión común en equipos reales para no inflar el tiempo de feedback de cada push.

## Estrategia de locators

Los page objects de la suite UI priorizan los locators integrados de Playwright por encima de selectores CSS/atributo escritos a mano, siguiendo el orden que Playwright mismo recomienda en su documentación:

1. **`getByRole` / `getByLabel` / `getByPlaceholder`** — el elemento tiene un rol ARIA y un nombre accesible reales (botones, inputs con `aria-label`, el mensaje de error con `role="alert"`, el combobox de orden). Es la forma en que un usuario real o una tecnología de asistencia identifica el elemento, no un detalle de implementación como una clase CSS — y por eso es más resistente a cambios de estilos/markup que no afectan el significado del elemento.
2. **`getByTestId`** — cuando el elemento no tiene semántica de rol propia útil (una tarjeta de producto genérica, un `<span>` numérico de badge) pero sí expone un atributo de prueba explícito. SauceDemo usa `data-test` en vez del `data-testid` que Playwright busca por defecto, así que se configuró `testIdAttribute: 'data-test'` en `playwright.config.ts` para poder usar `getByTestId()` en vez de escribir `page.locator('[data-test="..."]')` a mano — sigue siendo el locator integrado, solo apuntando al atributo correcto del sitio.
3. **Selector CSS/atributo manual (`page.locator(...)`)** — último recurso, reservado para un elemento que de verdad no tenga ni rol accesible ni atributo de prueba. En la práctica, SauceDemo cubre con `data-test` prácticamente todo lo que no tiene rol propio, así que este nivel casi no se necesitó en esta suite; donde sí aparece (por ejemplo, `.querySelector('[data-test="..."]')` *dentro* de un callback de `locator.evaluateAll()`) no es una excepción a esta regla — ahí se está escribiendo JS que corre en el navegador, no usando la API de locators de Playwright, así que no aplica la misma jerarquía.

Por qué importa la diferencia entre niveles 1 y 2: un locator por rol describe *qué es* el elemento para quien lo usa (un botón llamado "Checkout"), mientras que uno por `data-test` solo describe que *alguien lo marcó para pruebas* — sigue siendo mucho más estable que una clase CSS (que cambia por razones de diseño, no de automatización), pero no aporta la misma garantía de que el elemento sea realmente interactuable como lo haría un usuario (ej. un `<div>` con `data-test` puede no ser accesible por teclado; un `<button role="button">` sí lo es por definición). De ahí la prioridad: rol primero, `data-test` después, CSS manual solo si no queda otra opción.

## Estructura del repositorio

```
Playwright-Automation-Suite/
├── ui/
│   ├── fixtures/
│   │   └── users.ts          # Cuentas de prueba de SauceDemo
│   ├── pages/                 # Page Object Model
│   │   ├── LoginPage.ts
│   │   ├── InventoryPage.ts
│   │   ├── CartPage.ts
│   │   └── CheckoutPage.ts
│   ├── tests/
│   │   ├── flow1-purchase.spec.ts         # TC-UI-01 (enunciado original)
│   │   ├── flow2-cart.spec.ts             # TC-UI-04 (enunciado original)
│   │   ├── login.spec.ts                  # Regresión: login positivo/negativo
│   │   └── cart-and-checkout-extra.spec.ts # Regresión: carrito y checkout complementarios
│   └── utils/
│       └── money.ts
├── api/
│   ├── tests/           # Ciclo de vida de reserva + casos negativos
│   └── utils/
├── performance/
│   └── load-test-booking.js   # Script k6
├── reports/               # Reportes generados (gitignored salvo estructura)
├── documentation/
│   ├── 01-estrategia-de-pruebas.md
│   ├── 02-casos-de-prueba.md
│   ├── 03-reporte-hallazgos.md
│   └── 04-feedback-conclusiones.md
├── playwright.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Documentación

- [Estrategia de pruebas](documentation/01-estrategia-de-pruebas.md)
- [Casos de prueba](documentation/02-casos-de-prueba.md)
- [Reporte de hallazgos](documentation/03-reporte-hallazgos.md)
- [Feedback y conclusiones](documentation/04-feedback-conclusiones.md)

## Autora

**Karen Romero** — QA Engineer Portfolio
GitHub: https://github.com/karometesting-code
