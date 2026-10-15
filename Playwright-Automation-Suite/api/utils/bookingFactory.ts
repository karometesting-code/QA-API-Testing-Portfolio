export interface BookingDates {
  checkin: string;
  checkout: string;
}

export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string;
}

/** Genera un booking de prueba único por ejecución (evita colisiones entre corridas). */
export function buildTestBooking(overrides: Partial<Booking> = {}): Booking {
  const uniqueSuffix = Date.now().toString().slice(-6);
  return {
    firstname: `Karen${uniqueSuffix}`,
    lastname: 'Romero',
    totalprice: 150,
    depositpaid: true,
    bookingdates: {
      checkin: '2026-11-01',
      checkout: '2026-11-05',
    },
    additionalneeds: 'Breakfast',
    ...overrides,
  };
}
