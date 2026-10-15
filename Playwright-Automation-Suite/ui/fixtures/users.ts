/**
 * Datos de prueba centralizados: cuentas predefinidas de SauceDemo.
 *
 * Centralizar las credenciales en un solo lugar evita strings mágicos
 * repetidos en cada spec y documenta, junto a cada cuenta, qué comportamiento
 * específico de la aplicación sirve para probar.
 */
export interface SauceDemoUser {
  username: string;
  password: string;
  description: string;
}

const PASSWORD = 'secret_sauce';

export const users = {
  /** Cuenta sin restricciones — camino feliz. */
  standardUser: {
    username: 'standard_user',
    password: PASSWORD,
    description: 'Usuario regular sin restricciones',
  },
  /** SauceDemo bloquea esta cuenta explícitamente — usada en pruebas negativas de login. */
  lockedOutUser: {
    username: 'locked_out_user',
    password: PASSWORD,
    description: 'Cuenta deshabilitada por la aplicación',
  },
} as const satisfies Record<string, SauceDemoUser>;

/** Contraseña deliberadamente incorrecta, usada para el caso de credenciales inválidas. */
export const invalidPassword = 'wrong_password';
