// Régularité et records sur une période (SPEC 9.2). Fonctions pures.

import { beatsTyped, isCounted, recordKey, type TypedSet } from './typed';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Lundi (minuit local) de la semaine ISO d'une date. */
function weekKey(date: Date): number {
  const day = date.getDay() === 0 ? 7 : date.getDay();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - (day - 1)).getTime();
}

/**
 * Semaines de régularité : semaines ISO consécutives, en remontant depuis la semaine précédente,
 * où le nombre de séances atteint l'objectif ; plus la semaine en cours si l'objectif y est
 * déjà atteint.
 */
export function regularityWeeks(
  sessionDates: readonly Date[],
  perWeek: number | null,
  today: Date,
): number {
  const goal = Math.max(1, perWeek ?? 1);
  const counts = new Map<number, number>();
  for (const date of sessionDates) {
    const key = weekKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const current = weekKey(today);
  let streak = (counts.get(current) ?? 0) >= goal ? 1 : 0;
  // Semaine précédente : même heure locale une semaine avant (robuste au changement d'heure).
  for (let week = new Date(current); ;) {
    week = new Date(week.getFullYear(), week.getMonth(), week.getDate() - 7);
    if ((counts.get(week.getTime()) ?? 0) >= goal) streak += 1;
    else break;
  }
  return streak;
}

export type DatedSet = TypedSet & { exerciseId: string; completedAt: string };

/**
 * Séries qui ont battu le record de leur exercice au moment où elles ont été faites, selon son
 * type de suivi (SPEC_V2 §4.1 ; pour la course : sur la même distance). La toute première série
 * ne compte pas (il n'y avait pas de record à battre).
 */
export function recordSets<T extends DatedSet>(sets: readonly T[]): T[] {
  const best = new Map<string, TypedSet>();
  const records: T[] = [];
  for (const set of [...sets].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
    if (!isCounted(set)) continue;
    const key = recordKey(set);
    const previous = best.get(key);
    if (!previous) best.set(key, set);
    else if (beatsTyped(set, previous)) {
      best.set(key, set);
      records.push(set);
    }
  }
  return records;
}

/** Nombre de jours entiers entre deux dates (pour « +7,5 kg en 8 sem. »). */
export const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / DAY_MS);
