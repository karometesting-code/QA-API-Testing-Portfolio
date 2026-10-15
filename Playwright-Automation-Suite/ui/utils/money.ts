/**
 * Compara montos monetarios con tolerancia de 1 centavo para evitar falsos
 * negativos por redondeo de punto flotante (ej. 0.1 + 0.2 !== 0.3 en JS).
 */
export function expectMoneyEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}
