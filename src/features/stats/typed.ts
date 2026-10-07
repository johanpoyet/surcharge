// Records et volume selon le type de suivi de l'exercice (SPEC_V2 §4.1). Fonctions pures.
// Une série sans `trackingType` est une série « charge × reps » (V1).

import type { TrackingType } from '@/db/schema';
import { beats, isSuccessful, type SetLike } from './calc';

export type TypedSet = SetLike & {
  trackingType?: TrackingType | null;
  distanceM?: number | null;
  durationS?: number | null;
  calories?: number | null;
};

export const typeOf = (set: TypedSet): TrackingType => set.trackingType ?? 'weight_reps';

/** Série de musculation (charge × reps) : la seule qui compte dans le volume et le 1RM. */
export const isStrength = (set: TypedSet): boolean => typeOf(set) === 'weight_reps';

/** Série exploitable pour un record : réussie et avec une mesure. */
export function isCounted(set: TypedSet): boolean {
  if (set.difficulty === 'fail') return false;
  switch (typeOf(set)) {
    case 'weight_reps':
      return isSuccessful(set);
    case 'distance_time':
      return (set.distanceM ?? 0) > 0 && (set.durationS ?? 0) > 0;
    case 'time':
      return (set.durationS ?? 0) > 0;
    case 'reps':
      return set.reps > 0;
    case 'calories':
      return (set.calories ?? 0) > 0;
    case 'weight_distance':
      return set.weightKg > 0 && (set.distanceM ?? 0) > 0;
  }
}

/**
 * `a` bat `b` (même exercice, même type) : charge × reps (V1) ; temps plus court sur la même
 * distance ; durée plus longue ; plus de reps ; plus de calories ; charge plus lourde, à égalité
 * distance plus longue.
 */
export function beatsTyped(a: TypedSet, b: TypedSet): boolean {
  switch (typeOf(a)) {
    case 'weight_reps':
      return beats(a, b);
    case 'distance_time':
      return a.distanceM === b.distanceM && (a.durationS ?? 0) < (b.durationS ?? 0);
    case 'time':
      return (a.durationS ?? 0) > (b.durationS ?? 0);
    case 'reps':
      return a.reps > b.reps;
    case 'calories':
      return (a.calories ?? 0) > (b.calories ?? 0);
    case 'weight_distance':
      return (
        a.weightKg > b.weightKg ||
        (a.weightKg === b.weightKg && (a.distanceM ?? 0) > (b.distanceM ?? 0))
      );
  }
}

/** Groupe de comparaison : l'exercice, et la distance pour un exercice distance + temps. */
export const recordKey = (set: TypedSet & { exerciseId: string }): string =>
  typeOf(set) === 'distance_time' ? `${set.exerciseId}@${set.distanceM ?? 0}` : set.exerciseId;
