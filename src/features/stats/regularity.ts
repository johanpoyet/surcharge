// Régularité et records sur une période (SPEC 9.2). Fonctions pures.

import { beats, isSuccessful, type SetLike } from './calc';

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

export type DatedSet = SetLike & { exerciseId: string; completedAt: string };

/**
 * Séries qui ont battu le record de leur exercice au moment où elles ont été faites.
 * La toute première série d'un exercice ne compte pas (il n'y avait pas de record à battre).
 */
export function recordSets<T extends DatedSet>(sets: readonly T[]): T[] {
  const best = new Map<string, SetLike>();
  const records: T[] = [];
  for (const set of [...sets].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
    if (!isSuccessful(set)) continue;
    const previous = best.get(set.exerciseId);
    if (!previous) best.set(set.exerciseId, set);
    else if (beats(set, previous)) {
      best.set(set.exerciseId, set);
      records.push(set);
    }
  }
  return records;
}

/** Nombre de jours entiers entre deux dates (pour « +7,5 kg en 8 sem. »). */
export const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / DAY_MS);
