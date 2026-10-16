# Estrategia de pruebas

## Alcance

**Dentro de alcance:**
- Automatización UI de 2 flujos funcionales sobre SauceDemo (selección dinámica por precio, carrito, checkout).
- Automatización del ciclo de vida completo (CRUD) de una reserva sobre la API Restful Booker.
- Prueba de carga sobre `GET /booking`.
- Integración de ambas suites (UI + API) en un único pipeline CI/CD con reportes publicados.

**Fuera de alcance:**
- Pruebas de seguridad (penetration testing), accesibilidad (WCAG) y compatibilidad cross-browser/cross-device exhaustiva.
- Pruebas de carga sobre otros endpoints distintos a `GET /booking`.
- Automatización de los flujos de autenticación de Restful Booker como suite independiente (se usa únicamente como prerrequisito técnico para PUT/DELETE).

## Objetivo de las pruebas

Validar, mediante automatización mantenible:
1. El flujo de compra de SauceDemo calcula bien sus montos (Subtotal + Impuesto = Total) de extremo a extremo
2. El carrito refleja el estado real tras agregar/eliminar productos y bloquea un checkout incompleto
3. El ciclo de vida de una reserva en Restful Booker (CRUD) funciona según su contrato, incluyendo errores
4. `GET /booking` sostiene una carga concurrente moderada (10 usuarios) en tiempos razonables

## Tipos de prueba considerados

| Tipo | Aplicado en |
|---|---|
| Funcional (positivo) | UI (flujos 1 y 2), API (CRUD completo) |
| Funcional (negativo) | UI (checkout incompleto), API (reserva inexistente, operación sin token) |
| De negocio / reglas de cálculo | UI (fórmula Subtotal + Impuesto = Total) |
| De integración | API (ciclo de vida completo encadenado: POST → GET → PUT → GET → DELETE → GET) |
| No funcional - rendimiento | `GET /booking` bajo carga |
| De regresión (candidatos) | Ver `02-casos-de-prueba.md`, sección de priorización |

## Riesgos identificados

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Restful Booker corre en un dyno gratuito de Heroku que "duerme" por inactividad, afectando la primera petición y las métricas de performance | Alta | Medio | Paso de warm-up (`GET /ping`) antes de medir; documentarlo explícitamente |
| R2 | El catálogo de SauceDemo puede reordenarse o cambiar precios entre corridas, rompiendo pruebas con datos fijos | Media | Alto | Selección 100% dinámica por precio leído en tiempo de ejecución, nunca por nombre/posición |
| R3 | API pública compartida (Restful Booker): otros usuarios ejecutando pruebas simultáneamente pueden generar datos que interfieran | Media | Bajo | Datos de prueba únicos por corrida (timestamp), teardown explícito (DELETE) de lo creado |
| R4 | Flakiness por sincronización UI (esperas mal implementadas) | Media | Alto | Prohibido `sleep` fijo; uso exclusivo de auto-waiting y `expect().toX()` de Playwright |
| R5 | Entorno de CI sin acceso realista a SauceDemo/Restful Booker (firewalls corporativos) | Baja | Alto | Pipeline corre en runners de GitHub-hosted (acceso a internet estándar) |

## Priorización

Prioridad **Alta** (automatizar primero, son los casos "columna vertebral" del negocio):
- TC-UI-01 (compra completa con validación de montos)
- TC-UI-04 (carrito: conteo + eliminación + validación de error)
- TC-API-01 (ciclo de vida completo de reserva)

Prioridad **Media** (casos negativos / manejo de errores, aportan cobertura de robustez):
- TC-API-02 (actualización sin autenticación)
- TC-API-03 (consulta de recurso inexistente)

Prioridad **Baja** (exploratorios / no automatizados en esta entrega, ver `02-casos-de-prueba.md`):
- Casos de validación de campos individuales del formulario de checkout (ej. código postal vacío vs. apellido vacío por separado)
- Casos de ordenamiento por nombre y por precio descendente

## Herramientas seleccionadas

| Herramienta | Uso | Por qué |
|---|---|---|
| **Playwright + TypeScript** | UI y API | Un solo framework para ambas capas, mismo repo y config. Auto-waiting nativo, `APIRequestContext` cubre API sin herramienta extra |
| **k6** | Rendimiento | JS (mismo ecosistema del repo), liviano, integración nativa con GitHub Actions, métricas P90/P95/throughput out-of-the-box |
| **GitHub Actions** | CI/CD | Triggers push/PR nativos, runners con navegadores preinstalables, artefactos integrados |

## Estrategia de automatización

- **Patrón Page Object Model (POM)** para UI: separa la interacción con el DOM (`ui/pages/`) de la lógica de aserciones (`ui/tests/`), facilitando mantenimiento si cambian selectores.
- **Selección dinámica obligatoria**: ningún test depende de nombres de producto ni posiciones fijas; todo se calcula leyendo el DOM en tiempo de ejecución.
- **Independencia de pruebas**: cada test hace login/setup propio en `beforeEach`; no hay dependencia de orden de ejecución ni estado compartido entre tests.
- **Datos de prueba dinámicos en API**: cada corrida genera un booking con datos únicos (timestamp), evitando colisiones y permitiendo ejecución paralela segura.
- **Esperas explícitas**: exclusivamente `expect(locator).toHaveText(...)`, `toBeVisible()`, etc. (reintentan automáticamente), cero `page.waitForTimeout()` ni `sleep()`.

## Criterios de entrada

- Ambientes públicos (SauceDemo, Restful Booker) accesibles.
- Credenciales de prueba válidas (`standard_user` / `secret_sauce`; `admin` / `password123` para Restful Booker).
- Dependencias instalables (`npm ci`, `playwright install`).

## Criterios de salida

- 100% de los casos de prioridad Alta automatizados y ejecutándose en verde en al menos una corrida de CI.
- Pipeline CI/CD funcional con evidencia de una ejecución exitosa y una fallida (ver `README.md`, sección Pipeline).
- Reporte de hallazgos documentado para cualquier defecto encontrado durante la ejecución.
- Métricas de performance capturadas y analizadas con una conclusión formal sobre si el endpoint soporta la carga definida.

## Resultados de la prueba de carga (ejecución real, 15/10/2026)

Prueba ejecutada con k6 v2.2.0 contra `GET /booking`, con la configuración exacta pedida (10 VUs, ramp-up 30s, duración sostenida 2min, más 10s de ramp-down no contabilizado), precedida de un warm-up manual (`GET /ping`) para despertar el dyno de Heroku.

| Métrica | Resultado |
|---|---|
| Peticiones totales | 1138 |
| Tiempo promedio de respuesta | 219.91 ms |
| P90 | 238.29 ms |
| P95 | 299.78 ms |
| Throughput | 7.07 req/s |
| % de errores | 0.09% (1 de 1138) |
| Umbral P90 < 1500ms | ✅ cumplido (238.29 ms) |
| Umbral P95 < 2500ms | ✅ cumplido (299.78 ms) |
| Umbral de errores < 5% | ✅ cumplido (0.09%) |

La única petición fallida: `error_code 1101` ("lookup: no such host") — fallo de DNS del cliente de prueba, no del servidor (las otras 1137 devolvieron `200 OK`). No es un defecto de la API.

**Respuesta formal — ¿el endpoint soporta adecuadamente la carga definida?**

**Sí.** Con 10 VUs sostenidos 2 minutos:
- Mediana ~220ms, P95 ~300ms — ambos con holgura de más de 5x sobre los umbrales configurados (P90<1500ms/P95<2500ms)
- 0% de error atribuible al servidor

Dos matices para una lectura honesta:
- 10 VUs es carga moderada — no dice nada sobre el comportamiento bajo picos mucho mayores (100+) ni sobre el punto de quiebre
- Restful Booker corre en un dyno gratuito de Heroku (práctica, no producción) — el resultado prueba que no se degrada bajo esta carga puntual, no que cumpla estándares de un servicio productivo real
