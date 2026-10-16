# Playwright Automation Suite — UI + API + Performance + CI/CD

Suite de automatización end-to-end: pruebas UI y API con Playwright, pruebas de rendimiento con k6, e integración continua con GitHub Actions. Construida originalmente como prueba técnica de QA para Ceiba (ver `documentation/`) y ampliada para formar parte de mi portafolio: cubre el ciclo completo de aseguramiento de calidad — planeación, diseño de casos, automatización UI/API, performance, CI/CD y reporte formal de hallazgos — en un único repositorio.

## Descripción del proyecto

- **UI**: Playwright + TypeScript sobre [SauceDemo](https://www.saucedemo.com), con Page Object Model, cross-browser (Chromium, Firefox, WebKit). Cubre selección dinámica de productos por precio, validación matemática de checkout (Subtotal + Impuesto = Total), gestión del carrito con validación de errores, y una suite de regresión complementaria (login positivo/negativo, carrito básico).
- **API**: Playwright (`APIRequestContext`) sobre [Restful Booker](https://restful-booker.herokuapp.com), cubriendo el ciclo de vida completo de una reserva (POST/GET/PUT/DELETE) y casos negativos de manejo de errores.
- **Performance**: k6, prueba de carga sobre `GET /booking` (10 VUs, ramp-up 30s, duración 2min).
- **Pipeline**: GitHub Actions, triggers en `push` y `pull_request`, dos jobs (tests funcionales y performance), con reportes publicados como artefactos.

Esta suite se ejecutó de punta a punta contra los sitios reales (no solo se escribió y se asumió correcta) — ver la sección **Resultados** más abajo para los números reales de la última corrida, incluyendo dos defectos de sincronización encontrados y corregidos durante esa ejecución.

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

- **36/36 tests en verde** en Chromium, Firefox y WebKit (12 tests × 3 navegadores): Flujo 1, Flujo 2, login (4 casos) y carrito/checkout complementario (6 casos).
- La primera corrida real encontró y corrigió **2 defectos de sincronización** en los page objects (`DEF-01`, `DEF-02` — ver [`documentation/03-reporte-hallazgos.md`](documentation/03-reporte-hallazgos.md)): lecturas de carrito/catálogo con `locator.count()` inmediatamente después de una navegación, sin esperar a que el DOM terminara de renderizar. Intermitente en Chromium, consistente (3/3) en WebKit. Corregido con esperas explícitas (`waitForURL`, `locator.first().waitFor(...)`).

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

El primer push con el workflow reveló un quinto hallazgo (`DEF-05`, crítico): el archivo estaba en `Playwright-Automation-Suite/.github/workflows/ci.yml`, una ruta que GitHub Actions no indexa (solo descubre workflows en `.github/workflows/` en la raíz del repositorio) — confirmado vía la API de GitHub (`"total_count": 0` workflows registrados). Corregido moviendo el archivo a la raíz del repo con `paths` filters acotando el pipeline a este proyecto. Ver evidencia de ejecución exitosa/fallida en la pestaña *Actions* del repositorio.

## Decisiones técnicas relevantes

- **Un solo framework (Playwright) para UI y API**: simplifica el repositorio, el pipeline y la curva de aprendizaje, en vez de mezclar herramientas distintas para cada capa.
- **Selección 100% dinámica de productos en los Flujos 1 y 2**: ningún test de esos flujos depende de nombres ni posiciones fijas en el catálogo, cumpliendo explícitamente la consideración del enunciado original. Las pruebas de regresión complementarias (login, carrito básico) sí usan nombres de producto fijos de forma deliberada — no son los casos que exigen selección dinámica, y usar nombres ahí hace esos tests más legibles.
- **Cero `Thread.sleep()` / esperas fijas**: toda sincronización usa el auto-waiting nativo de Playwright o esperas explícitas (`waitForURL`, `locator.waitFor(...)`, `expect(locator).toX()`). Este principio es, de hecho, la causa raíz documentada de los dos defectos reales encontrados en la primera ejecución (`DEF-01`/`DEF-02`): en los dos lugares donde se usó `locator.count()` sin una espera explícita previa, la suite falló contra el sitio real.
- **Ejecución real antes de considerar la entrega terminada**: el código se corrió de punta a punta contra SauceDemo y Restful Booker reales (no solo se validó por lectura), lo que permitió encontrar y corregir bugs de sincronización que una revisión de código no habría detectado.
- **Datos de API únicos por corrida + teardown explícito**: evita colisiones en el ambiente público y compartido de Restful Booker; los tests de API limpian lo que crean.
- **k6 sobre JMeter**: mismo lenguaje (JS) que el resto del repo, scripting como código versionable (vs. GUI/XML de JMeter), e integración nativa con GitHub Actions vía `grafana/setup-k6-action`.
- **CI corre solo Chromium**: Firefox y WebKit quedan disponibles para correr cross-browser en local (`npm run test:ui:all-browsers`); limitar CI a un navegador mantiene el pipeline rápido y estable en runners compartidos, una decisión común en equipos reales para no inflar el tiempo de feedback de cada push.

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
