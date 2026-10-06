import type { TrackingType } from '@/db/schema';
import { trend, type Trend } from '@/features/stats/calc';
import { lowerIsBetter, valueTrend, type TrackingMetric, type ValueTrend } from './tracking';

/** Une ligne par (exercice, séance) : charge max réussie et date de la dernière série. */
export type ExerciseSessionStat = {
  exerciseId: string;
  sessionId: string;
  maxKg: number | null;
  lastAt: string;
  bestPace?: number | null;
  maxDurationS?: number | null;
  maxReps?: number | null;
  maxCalories?: number | null;
  maxCarryKg?: number | null;
};

export type ExerciseSummary = {
  lastUsedAt: string;
  /** Charge max réussie de la dernière séance où l'exercice a une série réussie. */
  lastMaxKg: number | null;
  trend: Trend | null;
  /** Séances de l'exercice, de la plus récente à la plus ancienne. */
  sessions: ExerciseSessionStat[];
};

/** Résumé par exercice pour la liste : dernière utilisation, charge max, tendance (SPEC 9.2). */
export function summarizeExercises(
  rows: readonly ExerciseSessionStat[],
): Map<string, ExerciseSummary> {
  const byExercise = new Map<string, ExerciseSessionStat[]>();
  for (const row of rows) {
    const list = byExercise.get(row.exerciseId) ?? [];
    list.push(row);
    byExercise.set(row.exerciseId, list);
  }

  const summaries = new Map<string, ExerciseSummary>();
  for (const [exerciseId, list] of byExercise) {
    const sorted = [...list].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    const maxes = sorted.flatMap((row) => (row.maxKg === null ? [] : [row.maxKg]));
    summaries.set(exerciseId, {
      lastUsedAt: sorted[0]!.lastAt,
      lastMaxKg: maxes[0] ?? null,
      trend: trend(maxes),
      sessions: sorted,
    });
  }
  return summaries;
}

/** Valeur affichée dans la bibliothèque pour un type de suivi autre que charge × reps. */
const ROW_METRIC: Record<Exclude<TrackingType, 'weight_reps'>, TrackingMetric> = {
  distance_time: 'pace',
  time: 'duration',
  reps: 'reps',
  calories: 'calories',
  weight_distance: 'weight',
};

function rowValue(metric: TrackingMetric, row: ExerciseSessionStat): number | null {
  switch (metric) {
    case 'pace':
      return row.bestPace ?? null;
    case 'duration':
      return row.maxDurationS ?? null;
    case 'reps':
      return row.maxReps ?? null;
    case 'calories':
      return row.maxCalories ?? null;
    default:
      return row.maxCarryKg ?? null;
  }
}

/**
 * Dernière valeur et tendance d'un exercice non « charge × reps » (meilleure allure, durée max…),
 * dans le sens du progrès (une allure qui baisse est un progrès).
 */
export function typedSummary(
  type: Exclude<TrackingType, 'weight_reps'>,
  summary: ExerciseSummary,
): { metric: TrackingMetric; value: number; trend: ValueTrend | null } | null {
  const metric = ROW_METRIC[type];
  const values = summary.sessions.flatMap((row) => {
    const value = rowValue(metric, row);
    return value === null || value <= 0 ? [] : [value];
  });
  const [value] = values;
  if (value === undefined) return null;
  return { metric, value, trend: valueTrend(values, lowerIsBetter(metric)) };
}

type Sortable = { id: string; name: string };

/** Tri par dernière utilisation (les plus récents d'abord), puis alphabétique. */
export function sortByLastUse<T extends Sortable>(
  items: readonly T[],
  summaries: Map<string, ExerciseSummary>,
): T[] {
  return [...items].sort((a, b) => {
    const lastA = summaries.get(a.id)?.lastUsedAt ?? '';
    const lastB = summaries.get(b.id)?.lastUsedAt ?? '';
    if (lastA !== lastB) return lastB.localeCompare(lastA);
    return a.name.localeCompare(b.name, 'fr');
  });
}

/** Recherche sans tenir compte des accents ni de la casse (« eleva » trouve « Élévations »). */
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
