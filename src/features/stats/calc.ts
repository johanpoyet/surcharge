// Calculs de stats (SPEC 9.2). Fonctions pures : testées unitairement.

import type { Difficulty } from '@/features/workout/difficulty';

export type SetLike = {
  weightKg: number;
  reps: number;
  difficulty: Difficulty | null;
};

const roundHalf = (value: number) => Math.round(value * 2) / 2;

/** Série réussie : au moins une rep et pas marquée échec. */
export const isSuccessful = (set: SetLike) => set.reps > 0 && set.difficulty !== 'fail';

/** 1RM estimé (Epley) : reps = 1 → la charge, sinon w × (1 + reps / 30), arrondi à 0,5 kg. */
export function epley(weightKg: number, reps: number): number {
  return roundHalf(reps === 1 ? weightKg : weightKg * (1 + reps / 30));
}

/** Meilleur 1RM estimé d'un ensemble de séries (séries en échec à 0 rep ignorées). */
export function bestEstimated1RM(sets: readonly SetLike[]): number | null {
  const values = sets.filter((s) => s.reps > 0).map((s) => epley(s.weightKg, s.reps));
  return values.length ? Math.max(...values) : null;
}

/** `a` bat `b` : charge plus lourde, ou même charge et plus de reps. */
export function beats(a: SetLike, b: SetLike): boolean {
  return a.weightKg > b.weightKg || (a.weightKg === b.weightKg && a.reps > b.reps);
}

/** Record d'un exercice : plus grosse charge réussie, à égalité le plus de reps. */
export function recordSet<T extends SetLike>(sets: readonly T[]): T | null {
  let best: T | null = null;
  for (const set of sets) {
    if (!isSuccessful(set)) continue;
    if (!best || beats(set, best)) best = set;
  }
  return best;
}

/** Charge max d'une séance : la plus grosse charge réussie (hors échec). */
export function sessionMax(sets: readonly SetLike[]): number | null {
  const weights = sets.filter(isSuccessful).map((s) => s.weightKg);
  return weights.length ? Math.max(...weights) : null;
}

/** Volume : Σ charge × reps. */
export function volume(sets: readonly SetLike[]): number {
  // Seules les séries « charge × reps » comptent (pas les wall balls d'un Hyrox, SPEC_V2 §4.1).
  return sets.reduce((sum, s) => {
    const type = (s as { trackingType?: string | null }).trackingType;
    return type && type !== 'weight_reps' ? sum : sum + s.weightKg * s.reps;
  }, 0);
}

export type Trend =
  | { kind: 'record' }
  | { kind: 'up'; deltaKg: number }
  | { kind: 'same' }
  | { kind: 'down'; deltaKg: number };

/**
 * Tendance de la liste des exercices : compare la charge max des 2 dernières séances
 * (du plus récent au plus ancien). Record si la dernière dépasse toutes les précédentes.
 * Moins de 2 séances : pas de tendance.
 */
export function trend(sessionMaxes: readonly number[]): Trend | null {
  const [last, previous, ...older] = sessionMaxes;
  if (last === undefined || previous === undefined) return null;
  if (last > Math.max(previous, ...older)) return { kind: 'record' };
  const delta = Math.round((last - previous) * 100) / 100;
  if (delta > 0) return { kind: 'up', deltaKg: delta };
  if (delta < 0) return { kind: 'down', deltaKg: -delta };
  return { kind: 'same' };
}
