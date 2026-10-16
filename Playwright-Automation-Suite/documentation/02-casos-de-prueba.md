# Diseño de escenarios y casos de prueba

Leyenda de prioridad: 🔴 Alta (automatizado) · 🟡 Media (automatizado) · ⚪ Baja (diseñado, no automatizado)

![Catálogo ordenado por precio, usado para la selección dinámica de TC-UI-01](images/inventory-sorted-by-price.png)

## Flujo 1 — Selección dinámica y validación de compra (UI)

| ID | Tipo | Título | Pasos clave | Resultado esperado | Prioridad |
|---|---|---|---|---|---|
| TC-UI-01 | Positivo / Negocio | Compra con producto más barato y más caro, validando Subtotal + Impuesto = Total | Ordenar por precio asc → agregar el más barato y el más caro → checkout → validar fórmula → finalizar | Compra completada; `subtotal + tax == total` con tolerancia de 1 centavo; página de confirmación visible | 🔴 Automatizado |
| TC-UI-02 | Negativo | Intentar finalizar checkout con código postal vacío | Llenar nombre y apellido, dejar código postal vacío, continuar | Mensaje de error "Postal Code is required" | 🟡 Automatizado (`ui/tests/cart-and-checkout-extra.spec.ts`) |
| TC-UI-03 | Funcional | Validar que el botón "Cancel" en checkout regresa al carrito sin perder los productos agregados | Agregar productos, ir a checkout, cancelar | Vuelve a `cart.html` con los mismos productos en el carrito | ⚪ Diseñado, no automatizado |

## Flujo 2 — Carrito y validaciones (UI)

| ID | Tipo | Título | Pasos clave | Resultado esperado | Prioridad |
|---|---|---|---|---|---|
| TC-UI-04 | Positivo + Negativo | Agregar 3 productos, eliminar el más caro, validar contador y error de checkout incompleto | Agregar 3 → validar badge=3 → eliminar el de mayor precio → validar badge=2 → checkout vacío → validar error | Badge actualizado correctamente en cada paso; mensaje "First Name is required" visible | 🔴 Automatizado |
| TC-UI-05 | Negocio | Eliminar el producto de menor precio en vez del mayor, validar que el restante sea el correcto | Agregar 3 → eliminar el de menor precio → validar que los 2 restantes sean los de mayor precio | El carrito conserva los 2 productos correctos (no solo la cantidad, sino identidad) | ⚪ Diseñado, no automatizado (variante de TC-UI-04) |
| TC-UI-06 | Funcional | Carrito vacío no permite ir a checkout / no muestra badge | Login sin agregar productos, ir directo a `cart.html` | Badge no visible (cuenta 0), carrito vacío | 🟡 Automatizado (`ui/tests/cart-and-checkout-extra.spec.ts`) |

## Login y carrito básico — regresión complementaria

No pedidos por el enunciado original; se incorporaron para mantener la cobertura de login/carrito que ya existía en este portafolio (`ui/tests/login.spec.ts`, `ui/tests/cart-and-checkout-extra.spec.ts`).

| ID | Tipo | Título | Resultado esperado | Prioridad |
|---|---|---|---|---|
| TC-UI-07 | Positivo | Login con credenciales válidas | Redirige a `inventory.html` | 🟡 Automatizado |
| TC-UI-08 | Negativo | Login con usuario bloqueado (`locked_out_user`) | Error "Sorry, this user has been locked out" | 🟡 Automatizado |
| TC-UI-09 | Negativo | Login con contraseña incorrecta | Error "...do not match" | 🟡 Automatizado |
| TC-UI-10 | Negativo | Envío de formulario de login vacío | Error "Username is required" | 🟡 Automatizado |
| TC-UI-11 | Funcional | Agregar y eliminar productos por nombre actualiza el contador del carrito | Badge refleja el conteo correcto en cada paso | 🟡 Automatizado |
| TC-UI-12 | Funcional | El carrito lista exactamente los productos agregados/eliminados | `getItemNames()` coincide con lo agregado | 🟡 Automatizado |

## API — Ciclo de vida de una reserva (Restful Booker)

| ID | Tipo | Título | Pasos clave | Resultado esperado | Prioridad |
|---|---|---|---|---|---|
| TC-API-01 | Positivo / Integración | Ciclo completo CRUD de una reserva | POST crear → validar datos → GET → PUT actualizar → GET validar cambio → DELETE → GET validar ausencia | 200 en create/get/update, 200/201 en delete, 404 tras eliminar; datos enviados == datos recibidos en cada paso | 🔴 Automatizado |
| TC-API-02 | Negativo | Actualizar una reserva sin token de autenticación | PUT sin header `Cookie`/`Authorization` | 403 Forbidden, la reserva original no se modifica | 🟡 Automatizado |
| TC-API-03 | Negativo | Consultar una reserva con ID inexistente | GET `/booking/999999999` | 404 Not Found | 🟡 Automatizado |
| TC-API-04 | Negativo | Crear una reserva con `totalprice` como texto en vez de número | POST con `totalprice: "cien"` | Debería rechazar (400) | ⚪ Diseñado, no automatizado — **confirmado manualmente como defecto real: `DEF-03`** en `03-reporte-hallazgos.md` |
| TC-API-05 | Funcional | Actualización parcial con PATCH | PATCH solo `totalprice` | Solo el campo enviado cambia; el resto de campos se mantiene igual | ⚪ Diseñado, no automatizado |

## Datos de prueba

- **UI**: no requiere datos propios más allá del usuario fijo del ejercicio (`standard_user` / `secret_sauce`) y datos de checkout genéricos (nombre/apellido/código postal cualquiera, ya que SauceDemo no valida formato, solo que no estén vacíos).
- **API**: cada ejecución genera un `firstname` único (`Karen` + timestamp) para evitar colisiones entre corridas paralelas o repetidas sobre el ambiente público compartido de Restful Booker.

## Priorización para automatización — por qué

- **TC-UI-01, TC-UI-04, TC-API-01 primero**: son los flujos de negocio "felices" de extremo a extremo — los que más se ejecutarían en cada regresión y los que más valor entregan si se rompen
- **Negativos de API (TC-API-02/03) antes que los de UI (TC-UI-02/03)**: más baratos de automatizar (sin navegador) y suelen estar menos cubiertos en la práctica → más cobertura marginal por el mismo esfuerzo
