# Feedback y conclusiones

### 1. ¿Cuál fue el principal riesgo identificado?

- No fue uno de los previstos en la planeación inicial, sino uno que solo apareció al ejecutar la suite de verdad: **condiciones de carrera reales** en los page objects (`DEF-01`, `DEF-02`, `DEF-06` — ver `03-reporte-hallazgos.md`)
- El más profundo (`DEF-06`): `page.waitForURL()` no garantiza que la página destino haya terminado de renderizar
- Lección clave: **código limpio no es lo mismo que código correcto** — una suite nunca ejecutada puede verse perfecta y aun así fallar contra el sitio real
- Segunda lección: **una corrida verde no basta** — el fix de DEF-01/02 parecía suficiente hasta estresarlo con 10 repeticiones, donde apareció DEF-06
- Riesgo de infraestructura previsto (Heroku dormido, DNS inestable) también se materializó parcialmente: 1 de 1138 peticiones de la prueba de carga falló por DNS local, no por el servidor

### 2. ¿Qué pruebas considera prioritarias para una regresión?

- **TC-UI-01** — compra completa con validación de montos (flujo de negocio de extremo a extremo)
- **TC-API-01** — ciclo de vida completo de una reserva (idem, sobre la API)
- **TC-UI-04** — carrito + manejo de errores; fue el caso que en la práctica expuso los defectos de sincronización, buena señal de que detecta regresiones silenciosas reales

### 3. ¿Qué pruebas adicionales automatizaría?

- Los casos diseñados pero no automatizados: TC-UI-03, TC-UI-05, TC-API-05 (ver `02-casos-de-prueba.md`)
- **TC-API-04** (validación de tipos) — ya verificado manualmente como hallazgo confirmado (`DEF-03`), pero no fijado como assertion de CI porque depende de comportamiento de una API de terceros que podría cambiar
- Pruebas de contrato (JSON Schema) sobre las respuestas de Restful Booker
- Performance de `POST /booking` (escritura) — el endpoint medido en esta entrega es solo de lectura

### 4. ¿Qué oportunidades de mejora identifica en la solución desarrollada?

Ya aplicadas durante esta misma entrega:

- Toda navegación ahora espera un elemento **exclusivo de la página destino**, no solo la URL (`DEF-06`)
- Toda lectura de listas usa `locator.evaluateAll()` (atómico) en vez de `.count()` + bucle (`DEF-01`/`DEF-02`/`DEF-06`)
- `npm run typecheck` agregado localmente y en CI (`DEF-04`)

Pendientes para una siguiente iteración:

- `expect.poll` para el warm-up de Restful Booker en vez de un `curl` manual
- Separar UI y API en jobs paralelos de CI (ya son proyectos separados de Playwright, pero el pipeline los corre juntos en un job)
- Regla de equipo explícita: ninguna acción de page object debe leer/escribir justo después de disparar una navegación sin esperar primero un elemento exclusivo del destino

### 5. Si estas pruebas fueran a un proyecto real, ¿qué mejoraría de la estrategia?

- **Teardown garantizado**: hoy el teardown de API depende de que el test llegue al `DELETE`; usaría un hook `afterEach` que limpie cualquier recurso creado, exitoso o no
- **Ambientes dedicados** en vez de aplicaciones públicas compartidas
- **Accesibilidad básica** (axe-core) en la suite UI
- **Trazabilidad real**: reporte de hallazgos conectado a Jira/Xray en vez de markdown
- **Política de equipo**: ninguna suite se da por "entregada" sin al menos una corrida completa contra el ambiente real — en esta entrega, la ejecución real encontró 3 defectos de sincronización que una revisión de código no habría detectado
