// Formatage des nombres à la française (« 82,5 kg »).

const LB_PER_KG = 2.20462;

export type WeightUnit = 'kg' | 'lb';

/** Nombre avec virgule décimale, sans zéros inutiles (82.5 → « 82,5 », 80 → « 80 »). */
export function formatNumber(value: number, maxDecimals = 1): string {
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded).replace('.', ',');
}

/** Les poids sont stockés en kg ; la conversion en lb ne se fait qu'à l'affichage. */
export function formatWeight(weightKg: number, unit: WeightUnit = 'kg'): string {
  const value = unit === 'lb' ? weightKg * LB_PER_KG : weightKg;
  return `${formatNumber(value)} ${unit}`;
}
