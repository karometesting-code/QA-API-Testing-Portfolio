import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

/**
 * Prueba de carga - GET /booking (Restful Booker)
 * Configuración requerida: 10 VUs | Ramp-up 30s | Duración 2min
 *
 * Nota: Restful Booker corre en un dyno gratuito de Heroku que "duerme"
 * tras inactividad, por eso se recomienda un warm-up antes de medir
 * latencias reales (ver documentation/01-estrategia-de-pruebas.md).
 * Ejecutar el warm-up manual así, antes de correr k6:
 *   curl https://restful-booker.herokuapp.com/ping
 */

const BASE_URL = 'https://restful-booker.herokuapp.com';
const responseTimeTrend = new Trend('booking_get_duration');

export const options = {
  scenarios: {
    get_booking_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 }, // Ramp-up: 30s hasta 10 VUs
        { duration: '2m', target: 10 }, // Duración sostenida: 2 minutos con 10 VUs
        { duration: '10s', target: 0 }, // Ramp-down (no contabilizado en la ventana de medición)
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(90)<1500', 'p(95)<2500'], // umbrales de aceptación - ajustar tras el análisis
    http_req_failed: ['rate<0.05'], // menos de 5% de errores
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/booking`, {
    tags: { name: 'GET /booking' },
  });

  responseTimeTrend.add(res.timings.duration);

  check(res, {
    'status es 200': (r) => r.status === 200,
    'respuesta es un arreglo de bookings': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  sleep(1); // pacing entre iteraciones por VU, simula usuarios reales (no es espera de sincronización UI)
}

/**
 * Genera un resumen legible en consola + guarda JSON para el pipeline.
 * Las métricas P90/P95/Throughput/errores quedan documentadas en
 * documentation/01-estrategia-de-pruebas.md (sección performance) tras la ejecución real.
 */
export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'reports/performance/k6-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const get = (name, stat) => (m[name] && m[name].values ? m[name].values[stat] : undefined);
  return `
=== Resumen de carga: GET /booking ===
VUs objetivo: 10 | Ramp-up: 30s | Duración sostenida: 2m
Peticiones totales: ${get('http_reqs', 'count')}
Tiempo promedio de respuesta: ${get('http_req_duration', 'avg')?.toFixed(2)} ms
P90: ${get('http_req_duration', 'p(90)')?.toFixed(2)} ms
P95: ${get('http_req_duration', 'p(95)')?.toFixed(2)} ms
Throughput (req/s): ${get('http_reqs', 'rate')?.toFixed(2)}
% de errores: ${((get('http_req_failed', 'rate') || 0) * 100).toFixed(2)}%
`;
}
