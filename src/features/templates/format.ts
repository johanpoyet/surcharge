// Saisie et affichage des cibles d'une séance type (maquette creer-seance).

import { fr } from '@/i18n/fr';

export type RepsTarget = { min: number | null; max: number | null };

const MAX_REPS = 100;
const MAX_REST_SECONDS = 15 * 60;

/** « 8–10 », « 8-10 », « 8 à 10 », « 8 » ; vide = pas de cible. Retourne null si invalide. */
export function parseRepsTarget(input: string): RepsTarget | null {
  const text = input.trim();
  if (!text) return { min: null, max: null };
  const match = /^(\d{1,3})\s*(?:[-–—]|à|a)?\s*(\d{1,3})?$/i.exec(text);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] === undefined ? first : Number(match[2]);
  const [min, max] = first <= second ? [first, second] : [second, first];
  if (min < 1 || max > MAX_REPS) return null;
  return { min, max };
}

export function formatRepsTarget({ min, max }: RepsTarget): string {
  if (min === null && max === null) return '';
  if (min === null || max === null || min === max) return String(min ?? max);
  return `${min}–${max}`;
}

/** « 2:00 », « 1:30 », « 90 » (secondes) ou « 2 min ». Retourne null si invalide. */
export function parseRest(input: string): number | null {
  const text = input.trim().toLowerCase();
  const clock = /^(\d{1,2}):([0-5]\d)$/.exec(text);
  const minutes = /^(\d{1,2})\s*min$/.exec(text);
  const seconds = /^(\d{1,3})\s*s?$/.exec(text);
  let value: number | null = null;
  if (clock) value = Number(clock[1]) * 60 + Number(clock[2]);
  else if (minutes) value = Number(minutes[1]) * 60;
  else if (seconds) value = Number(seconds[1]);
  if (value === null || value > MAX_REST_SECONDS) return null;
  return value;
}

/** 120 → « 2:00 » */
export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Temps d'exécution d'une série dans l'estimation (SPEC 9.4). */
export const SECONDS_PER_SET = 45;

/** Σ séries × (45 s + repos), arrondi à 5 min (SPEC 9.4). */
export function estimateMinutes(
  items: readonly { targetSets: number; restSeconds: number }[],
): number {
  const seconds = items.reduce(
    (sum, i) => sum + i.targetSets * (SECONDS_PER_SET + i.restSeconds),
    0,
  );
  return Math.round(seconds / 60 / 5) * 5;
}

/** 90 → « 1 h 30 », 55 → « 55 min » (durée estimée d'une séance type). */
export function formatEstimate(minutes: number): string {
  if (minutes < 60) return fr.templates.blocks.minutes(minutes);
  return fr.templates.blocks.hours(Math.floor(minutes / 60), minutes % 60);
}
