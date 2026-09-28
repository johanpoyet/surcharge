import type { WeightUnit } from './database.types';

export const LB_PER_KG = 2.20462;

/** Arrondi au dixième (pesées). */
export const roundTenth = (value: number) => Math.round(value * 10) / 10;

/** Les poids sont stockés en kg : conversion depuis l'unité affichée. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value / LB_PER_KG : value;
}

export function fromKg(valueKg: number, unit: WeightUnit): number {
  return unit === 'lb' ? valueKg * LB_PER_KG : valueKg;
}

/** Change l'unité d'une valeur affichée, arrondie au dixième. */
export function convertDisplayed(value: number, from: WeightUnit, to: WeightUnit): number {
  return from === to ? value : roundTenth(fromKg(toKg(value, from), to));
}
