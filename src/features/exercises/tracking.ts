// Types de suivi (SPEC_V2 §4.1) : ce que l'on note à chaque série, records et courbes par type.
// Fonctions pures, testées unitairement. Le type `weight_reps` garde les calculs V1 (stats/calc).

import type { TrackingType } from '@/db/schema';
import { recordSet, sessionMax, type SetLike } from '@/features/stats/calc';
import { formatClock } from '@/features/workout/logic';
import type { WeightUnit } from '@/lib/database.types';
import { fr } from '@/i18n/fr';
import { formatNumber, formatWeight } from '@/lib/format';
import { fromKg } from '@/lib/units';

const t = fr.exercises.tracking;

export const TRACKING_TYPES: readonly TrackingType[] = [
  'weight_reps',
  'distance_time',
  'time',
  'reps',
  'calories',
  'weight_distance',
];

/** Types où l'on saisit une charge : le pas des boutons + / − s'applique. */
export const usesWeight = (type: TrackingType): boolean =>
  type === 'weight_reps' || type === 'weight_distance';

/** Série telle qu'enregistrée (`session_sets`), quel que soit le type. */
export type TrackedSet = SetLike & {
  distanceM: number | null;
  durationS: number | null;
  calories: number | null;
};

// —— Formats ——

/** « 400 m », « 1,2 km », « 10 km ». */
export function formatDistance(meters: number): string {
  return meters < 1000
    ? `${formatNumber(meters, 0)} ${fr.units.m}`
    : `${formatNumber(meters / 1000, 2)} ${fr.units.km}`;
}

/** Toujours en mètres (stations Hyrox : « 1000 m ») ; « 400 m ». */
export const formatMeters = (meters: number): string => `${formatNumber(meters, 0)} ${fr.units.m}`;

/** Allure en secondes par kilomètre (null si distance ou temps manquant). */
export function paceSecondsPerKm(
  distanceM: number | null,
  durationS: number | null,
): number | null {
  if (!distanceM || !durationS || distanceM <= 0 || durationS <= 0) return null;
  return (durationS * 1000) / distanceM;
}

/** « 3:50 /km » : l'allure est calculée à l'affichage, jamais stockée. */
export const formatPace = (secondsPerKm: number): string =>
  `${formatClock(Math.round(secondsPerKm))} ${fr.units.perKm}`;

/** Une série, lisible selon le type de suivi (historique, « Dernière fois »). */
export function formatSet(type: TrackingType, set: TrackedSet, unit: WeightUnit): string {
  switch (type) {
    case 'weight_reps':
      return fr.exercises.detail.set(formatWeight(set.weightKg, unit), set.reps);
    case 'distance_time':
      return set.distanceM && set.durationS
        ? t.distanceTime(formatDistance(set.distanceM), formatClock(set.durationS))
        : set.distanceM
          ? formatDistance(set.distanceM)
          : formatClock(set.durationS ?? 0);
    case 'time':
      return formatClock(set.durationS ?? 0);
    case 'reps':
      return t.repsOnly(set.reps);
    case 'calories':
      return `${set.calories ?? 0} ${fr.units.cal}`;
    case 'weight_distance':
      return t.weightDistance(formatWeight(set.weightKg, unit), formatDistance(set.distanceM ?? 0));
  }
}

// —— Records (SPEC_V2 §4.1) ——

/** Distance de référence d'un exercice distance + temps : la plus pratiquée (à égalité, la plus longue). */
export function referenceDistance(sets: readonly TrackedSet[]): number | null {
  const counts = new Map<number, number>();
  for (const set of sets) {
    if (set.distanceM && set.durationS)
      counts.set(set.distanceM, (counts.get(set.distanceM) ?? 0) + 1);
  }
  let best: number | null = null;
  for (const [distance, count] of counts) {
    const bestCount = best === null ? 0 : (counts.get(best) ?? 0);
    if (count > bestCount || (count === bestCount && best !== null && distance > best))
      best = distance;
  }
  return best;
}

const counted = (set: TrackedSet) => set.difficulty !== 'fail';

function bestBy<T extends TrackedSet>(
  sets: readonly T[],
  value: (set: T) => number | null,
  lowerIsBetter = false,
): T | null {
  let best: T | null = null;
  let bestValue = 0;
  for (const set of sets) {
    const v = value(set);
    if (v === null || v <= 0 || !counted(set)) continue;
    if (!best || (lowerIsBetter ? v < bestValue : v > bestValue)) {
      best = set;
      bestValue = v;
    }
  }
  return best;
}

/**
 * Record d'un exercice selon son type : plus grosse charge (V1) ; meilleur temps sur la distance
 * de référence ; durée la plus longue ; plus de reps ; plus de calories ; plus grosse charge
 * portée (à égalité, la plus longue distance).
 */
export function trackingRecord<T extends TrackedSet>(
  type: TrackingType,
  sets: readonly T[],
): T | null {
  switch (type) {
    case 'weight_reps':
      return recordSet(sets);
    case 'distance_time': {
      const distance = referenceDistance(sets);
      return bestBy(
        sets.filter((s) => s.distanceM === distance),
        (s) => s.durationS,
        true,
      );
    }
    case 'time':
      return bestBy(sets, (s) => s.durationS);
    case 'reps':
      return bestBy(sets, (s) => s.reps);
    case 'calories':
      return bestBy(sets, (s) => s.calories);
    case 'weight_distance':
      return bestBy(sets, (s) => s.weightKg * 100_000 + (s.distanceM ?? 0));
  }
}

// —— Courbe de progression (une valeur par séance) ——

export type TrackingMetric =
  'weight' | 'volume' | 'reps' | 'time' | 'pace' | 'distance' | 'duration' | 'calories';

/** Courbes proposées dans le détail d'un exercice, la première par défaut. */
export function metricsFor(type: TrackingType): readonly TrackingMetric[] {
  switch (type) {
    case 'weight_reps':
      return ['weight', 'volume', 'reps'];
    case 'distance_time':
      return ['time', 'pace', 'distance'];
    case 'time':
      return ['duration'];
    case 'reps':
      return ['reps'];
    case 'calories':
      return ['calories'];
    case 'weight_distance':
      return ['weight', 'distance'];
  }
}

/** Un temps ou une allure qui baisse est un progrès. */
export const lowerIsBetter = (metric: TrackingMetric): boolean =>
  metric === 'time' || metric === 'pace';

const sum = (values: readonly (number | null)[]) =>
  values.reduce<number>((t, v) => t + (v ?? 0), 0);
const maxOf = (values: readonly (number | null)[]): number | null => {
  const kept = values.filter((v): v is number => v !== null && v > 0);
  return kept.length ? Math.max(...kept) : null;
};
const minOf = (values: readonly (number | null)[]): number | null => {
  const kept = values.filter((v): v is number => v !== null && v > 0);
  return kept.length ? Math.min(...kept) : null;
};

/**
 * Valeur d'une séance pour une courbe. `time` : meilleur temps sur la distance de référence de
 * l'exercice ; `reps` hors `weight_reps` : le maximum d'une série (en V1 : le total).
 */
export function sessionMetric(
  type: TrackingType,
  metric: TrackingMetric,
  sets: readonly TrackedSet[],
  refDistance: number | null,
): number | null {
  const ok = sets.filter(counted);
  switch (metric) {
    case 'weight':
      return type === 'weight_reps' ? sessionMax(sets) : maxOf(ok.map((s) => s.weightKg));
    case 'volume':
      return sum(sets.map((s) => s.weightKg * s.reps));
    case 'reps':
      return type === 'weight_reps' ? sum(sets.map((s) => s.reps)) : maxOf(ok.map((s) => s.reps));
    case 'time':
      return minOf(ok.filter((s) => s.distanceM === refDistance).map((s) => s.durationS));
    case 'pace':
      return minOf(ok.map((s) => paceSecondsPerKm(s.distanceM, s.durationS)));
    case 'distance':
      return sum(sets.map((s) => s.distanceM)) || null;
    case 'duration':
      return maxOf(ok.map((s) => s.durationS));
    case 'calories':
      return maxOf(ok.map((s) => s.calories));
  }
}

/** Valeur d'une courbe, lisible (axe, écart). */
export function formatMetric(metric: TrackingMetric, value: number, unit: WeightUnit): string {
  switch (metric) {
    case 'weight':
      return formatWeight(value, unit);
    case 'volume':
      return `${formatNumber(fromKg(value, unit), 0)} ${unit}`;
    case 'reps':
      return `${formatNumber(value, 0)} ${fr.units.reps}`;
    case 'time':
    case 'duration':
      return formatClock(Math.round(value));
    case 'pace':
      return formatPace(value);
    case 'distance':
      return formatDistance(value);
    case 'calories':
      return `${formatNumber(value, 0)} ${fr.units.cal}`;
  }
}

// —— Tendance de la bibliothèque ——

export type ValueTrend =
  | { kind: 'record' }
  | { kind: 'better'; delta: number }
  | { kind: 'same' }
  | { kind: 'worse'; delta: number };

/**
 * Compare les 2 dernières séances (du plus récent au plus ancien), dans le sens du progrès.
 * Record si la dernière bat toutes les précédentes. Moins de 2 séances : pas de tendance.
 */
export function valueTrend(values: readonly number[], lowerBetter: boolean): ValueTrend | null {
  const [last, previous, ...older] = values;
  if (last === undefined || previous === undefined) return null;
  const others = [previous, ...older];
  const beatsAll = lowerBetter ? last < Math.min(...others) : last > Math.max(...others);
  if (beatsAll) return { kind: 'record' };
  const delta = Math.round(Math.abs(last - previous) * 100) / 100;
  if (delta === 0) return { kind: 'same' };
  const better = lowerBetter ? last < previous : last > previous;
  return better ? { kind: 'better', delta } : { kind: 'worse', delta };
}

/** Valeur courte d'une série (tuiles du détail) et sa précision : « 1:32 » + « 400 m ». */
export function shortSetValue(
  type: TrackingType,
  set: TrackedSet,
  unit: WeightUnit,
): { value: string; detail: string | null } {
  switch (type) {
    case 'weight_reps':
      return { value: formatWeight(set.weightKg, unit), detail: t.repsOnly(set.reps) };
    case 'distance_time':
      return {
        value: formatClock(set.durationS ?? 0),
        detail: set.distanceM ? formatDistance(set.distanceM) : null,
      };
    case 'time':
      return { value: formatClock(set.durationS ?? 0), detail: null };
    case 'reps':
      return { value: String(set.reps), detail: fr.units.reps };
    case 'calories':
      return { value: String(set.calories ?? 0), detail: fr.units.cal };
    case 'weight_distance':
      return {
        value: formatWeight(set.weightKg, unit),
        detail: set.distanceM ? formatDistance(set.distanceM) : null,
      };
  }
}

/** Meilleure allure de toutes les séries (secondes par km). */
export function bestPace(sets: readonly TrackedSet[]): number | null {
  return minOf(sets.filter(counted).map((s) => paceSecondsPerKm(s.distanceM, s.durationS)));
}
