import { trend, type Trend } from '@/features/stats/calc';

/** Une ligne par (exercice, séance) : charge max réussie et date de la dernière série. */
export type ExerciseSessionStat = {
  exerciseId: string;
  sessionId: string;
  maxKg: number | null;
  lastAt: string;
};

export type ExerciseSummary = {
  lastUsedAt: string;
  /** Charge max réussie de la dernière séance où l'exercice a une série réussie. */
  lastMaxKg: number | null;
  trend: Trend | null;
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
    });
  }
  return summaries;
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
