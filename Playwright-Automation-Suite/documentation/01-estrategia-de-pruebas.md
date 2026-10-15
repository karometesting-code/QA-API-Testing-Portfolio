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

Validar, mediante automatización mantenible, que:
1. El flujo de compra de SauceDemo calcula correctamente sus montos (Subtotal + Impuesto = Total) y permite completar una compra de extremo a extremo.
2. El carrito de SauceDemo refleja correctamente el estado tras agregar/eliminar productos y bloquea un checkout con datos incompletos.
3. El ciclo de vida de una reserva en Restful Booker (crear, leer, actualizar, eliminar) funciona según su contrato documentado, incluyendo el manejo de errores (datos inexistentes, operaciones sin autenticación).
4. El endpoint `GET /booking` sostiene una carga concurrente moderada (10 usuarios) dentro de tiempos de respuesta razonables.

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

| Herramienta | Uso | Justificación |
|---|---|---|
| **Playwright + TypeScript** | UI y API | Un solo lenguaje y un solo framework para ambas suites, dentro del mismo repositorio y la misma configuración (`playwright.config.ts` con 2 proyectos). Auto-waiting nativo (cumple la prohibición de `Thread.sleep`), `APIRequestContext` cubre las pruebas de API sin herramienta adicional, y es la herramienta que ya uso en producción (coherencia con mi experiencia actual). |
| **k6** | Rendimiento | Scripts en JavaScript (mismo ecosistema que el resto del repo), liviano, se integra de forma nativa en GitHub Actions, y da métricas P90/P95/throughput out-of-the-box sin la sobrecarga de una GUI como JMeter. |
| **GitHub Actions** | CI/CD | Triggers nativos de push/PR, runners con navegadores preinstalables (`playwright install`) y acceso a internet real, publicación de artefactos integrada. |

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

La única petición fallida registró `error_code 1101` ("lookup: no such host") — un fallo de resolución DNS del lado del cliente de prueba, no una respuesta de error del servidor (todas las demás 1137 peticiones devolvieron `200 OK`). Se descarta como defecto de la API; es ruido de red local, consistente con la inestabilidad intermitente de DNS observada en el entorno usado para esta ejecución durante toda la sesión de pruebas.

**Respuesta formal — ¿el endpoint soporta adecuadamente la carga definida?**

Sí. Con 10 usuarios virtuales sostenidos durante 2 minutos, `GET /booking` respondió con una mediana de ~220ms y un P95 de ~300ms, muy por debajo de umbrales razonables para una API REST de lectura (los umbrales de aceptación configurados, P90<1500ms/P95<2500ms, se cumplieron con holgura de más de 5x). La tasa de error real atribuible al servidor fue 0% — el único fallo fue de infraestructura de red del cliente, no del servicio. Dicho esto, dos matices importantes para una lectura honesta del resultado: (1) 10 VUs es una carga moderada — no permite concluir nada sobre el comportamiento del servicio bajo picos mucho mayores (100+ VUs) ni sobre su punto de quiebre; y (2) Restful Booker corre en un dyno gratuito de Heroku pensado para práctica, no en infraestructura productiva, por lo que estos resultados no son representativos de lo que debería exigirse a un servicio real en producción — son válidos únicamente como evidencia de que el servicio no se degrada de forma notoria bajo esta carga específica y acotada.
