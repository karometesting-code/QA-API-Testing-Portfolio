import { test, expect, APIRequestContext } from '@playwright/test';
import { buildTestBooking, Booking } from '../utils/bookingFactory';

/**
 * Ciclo de vida completo de una reserva (Restful Booker).
 * Caso prioritario: TC-API-01 (ver documentation/02-casos-de-prueba.md)
 *
 * Teardown: el DELETE del paso 6 limpia el dato creado en el paso 1,
 * por lo que la prueba no deja basura en el ambiente compartido. El
 * bookingid se obtiene dinámicamente del POST y se reutiliza en cada
 * llamada siguiente (nunca se hardcodea).
 */
test.describe('API - Ciclo de vida de una reserva', () => {
  let token: string;

  test.beforeAll(async ({ playwright }) => {
    // Se autentica una sola vez para las pruebas que requieren token (PUT/DELETE)
    const request = await playwright.request.newContext({
      baseURL: 'https://restful-booker.herokuapp.com',
    });
    const authResponse = await request.post('/auth', {
      data: { username: 'admin', password: 'password123' },
    });
    expect(authResponse.status()).toBe(200);
    const authBody = await authResponse.json();
    token = authBody.token;
    expect(token).toBeTruthy();
    await request.dispose();
  });

  test('TC-API-01: crear, consultar, actualizar, eliminar y validar ausencia de una reserva', async ({
    request,
  }) => {
    const newBooking: Booking = buildTestBooking();

    // 1. Crear una reserva (POST)
    const createStart = Date.now();
    const createResponse = await request.post('/booking', { data: newBooking });
    const createDuration = Date.now() - createStart;

    // Validaciones mínimas: status code, estructura, tiempo de respuesta
    expect(createResponse.status()).toBe(200);
    expect(createDuration).toBeLessThan(3000);
    const createBody = await createResponse.json();
    expect(createBody).toHaveProperty('bookingid');
    expect(createBody).toHaveProperty('booking');

    const bookingId = createBody.bookingid; // uso dinámico en los pasos siguientes
    expect(typeof bookingId).toBe('number');

    // 2. Validar que la reserva haya sido creada correctamente (datos enviados vs. recibidos)
    expect(createBody.booking.firstname).toBe(newBooking.firstname);
    expect(createBody.booking.lastname).toBe(newBooking.lastname);
    expect(createBody.booking.totalprice).toBe(newBooking.totalprice);
    expect(createBody.booking.depositpaid).toBe(newBooking.depositpaid);
    expect(createBody.booking.bookingdates).toEqual(newBooking.bookingdates);

    // 3. Obtener la reserva utilizando el bookingid generado (GET)
    const getResponse = await request.get(`/booking/${bookingId}`);
    expect(getResponse.status()).toBe(200);
    const getBody = await getResponse.json();
    // Cast necesario: `toMatchObject` espera un `Record<string, unknown>` y `Booking`
    // es una interfaz nominal sin index signature (TS2345 en modo strict sin el cast).
    expect(getBody).toMatchObject(newBooking as unknown as Record<string, unknown>);

    // 4. Actualizar uno de los datos de la reserva (PUT) - requiere autenticación
    const updatedBooking: Booking = { ...newBooking, totalprice: 999 };
    const putResponse = await request.put(`/booking/${bookingId}`, {
      data: updatedBooking,
      headers: { Cookie: `token=${token}` },
    });
    expect(putResponse.status()).toBe(200);
    const putBody = await putResponse.json();
    expect(putBody.totalprice).toBe(999);

    // 5. Consultar nuevamente la reserva y validar la actualización
    const getAfterUpdate = await request.get(`/booking/${bookingId}`);
    expect(getAfterUpdate.status()).toBe(200);
    const getAfterUpdateBody = await getAfterUpdate.json();
    expect(getAfterUpdateBody.totalprice).toBe(999);

    // 6. Eliminar la reserva (DELETE) - requiere autenticación (teardown del dato creado)
    const deleteResponse = await request.delete(`/booking/${bookingId}`, {
      headers: { Cookie: `token=${token}` },
    });
    expect([200, 201]).toContain(deleteResponse.status());

    // 7. Validar que la reserva ya no esté disponible
    const getAfterDelete = await request.get(`/booking/${bookingId}`);
    expect(getAfterDelete.status()).toBe(404);
  });

  test('TC-API-02 (negativo): manejo de errores - actualizar sin token debe ser rechazado', async ({
    request,
  }) => {
    const booking = buildTestBooking();
    const createResponse = await request.post('/booking', { data: booking });
    const { bookingid } = await createResponse.json();

    // PUT sin header de autenticación -> debe fallar (403 Forbidden según documentación de la API)
    const putWithoutAuth = await request.put(`/booking/${bookingid}`, {
      data: { ...booking, totalprice: 1 },
    });
    expect(putWithoutAuth.status()).toBe(403);

    // Teardown con el token de sesión global, para no dejar datos huérfanos
    await request.delete(`/booking/${bookingid}`, { headers: { Cookie: `token=${token}` } });
  });

  test('TC-API-03 (negativo): consultar una reserva inexistente debe responder 404', async ({
    request,
  }) => {
    const nonExistentId = 999999999;
    const response = await request.get(`/booking/${nonExistentId}`);
    expect(response.status()).toBe(404);
  });
});
