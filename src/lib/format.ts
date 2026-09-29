// Formatage des nombres à la française (« 82,5 kg »).

import type { WeightUnit } from './database.types';
import { fromKg } from './units';

/** Nombre avec virgule décimale, sans zéros inutiles (82.5 → « 82,5 », 80 → « 80 »). */
export function formatNumber(value: number, maxDecimals = 1): string {
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded).replace('.', ',');
}

/** Les poids sont stockés en kg ; la conversion en lb ne se fait qu'à l'affichage. */
export function formatWeight(weightKg: number, unit: WeightUnit = 'kg'): string {
  return `${formatNumber(fromKg(weightKg, unit))} ${unit}`;
}

/** Date du jour au format `AAAA-MM-JJ` dans le fuseau local (colonnes `date` Postgres). */
export function toLocalDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Grand nombre avec espace fine insécable entre les milliers (« 4 520 »). */
export function formatThousands(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}
