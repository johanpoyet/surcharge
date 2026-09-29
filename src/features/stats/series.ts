// Séries et agrégats pour les graphiques et le profil (SPEC 9.2). Fonctions pures.

import { parseISO } from 'date-fns';

import type { Difficulty } from '@/features/workout/difficulty';
import { toLocalDateString } from '@/lib/format';
import { recordSet, sessionMax, volume, type SetLike } from './calc';
import { recordSets, type DatedSet } from './regularity';

export type ChartMetric = 'weight' | 'volume' | 'reps';

export type SessionPoint = {
  sessionId: string;
  startedAt: string;
  weight: number | null;
  volume: number;
  reps: number;
  /** Une série de cette séance a battu le record de l'exercice. */
  record: boolean;
};

type HistorySession = { sessionId: string; startedAt: string; sets: (DatedSet & { id: string })[] };

/** Une valeur par séance, de la plus ancienne à la plus récente (courbe du détail exercice). */
export function exerciseSeries(history: readonly HistorySession[]): SessionPoint[] {
  const recordIds = new Set(recordSets(history.flatMap((h) => h.sets)).map((s) => s.id));
  return [...history]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((h) => ({
      sessionId: h.sessionId,
      startedAt: h.startedAt,
      weight: sessionMax(h.sets),
      volume: volume(h.sets),
      reps: h.sets.reduce((sum, s) => sum + s.reps, 0),
      record: h.sets.some((s) => recordIds.has(s.id)),
    }));
}

export function metricValue(point: SessionPoint, metric: ChartMetric): number | null {
  return metric === 'weight' ? point.weight : metric === 'volume' ? point.volume : point.reps;
}

/** Stats globales du profil : séances, heures à la salle, tonnes soulevées, jours à la salle. */
export function globalStats(
  sessions: readonly { startedAt: string; endedAt: string | null }[],
  sets: readonly SetLike[],
): { sessions: number; hours: number; tonnes: number; gymDays: number } {
  const seconds = sessions.reduce((sum, s) => {
    if (!s.endedAt) return sum;
    return (
      sum + Math.max(0, (parseISO(s.endedAt).getTime() - parseISO(s.startedAt).getTime()) / 1000)
    );
  }, 0);
  return {
    sessions: sessions.length,
    hours: Math.round(seconds / 3600),
    tonnes: Math.round(volume(sets) / 1000),
    gymDays: new Set(sessions.map((s) => toLocalDateString(parseISO(s.startedAt)))).size,
  };
}

export type DifficultyCounts = Record<Difficulty, number>;

/** Répartition des ressentis des séries faites à une charge (bloc « Ressenti à X kg »). */
export function difficultyAt(
  sets: readonly (SetLike & { weightKg: number })[],
  weightKg: number,
): { counts: DifficultyCounts; rated: number; total: number } {
  const atWeight = sets.filter((s) => s.weightKg === weightKg);
  const counts: DifficultyCounts = { easy: 0, medium: 0, hard: 0, fail: 0 };
  for (const set of atWeight) if (set.difficulty) counts[set.difficulty] += 1;
  const rated = counts.easy + counts.medium + counts.hard + counts.fail;
  return { counts, rated, total: atWeight.length };
}

export type Period = '1M' | '3M' | '1A';
const PERIOD_DAYS: Record<Period, number> = { '1M': 30, '3M': 91, '1A': 365 };

/** Pesées sur une période (courbe du profil) et variation sur cette période. */
export function weightsInPeriod<T extends { measuredOn: string; weightKg: number }>(
  weights: readonly T[],
  period: Period,
  today: Date,
): { points: T[]; deltaKg: number | null } {
  const from = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - PERIOD_DAYS[period],
  );
  const points = [...weights]
    .filter((w) => parseISO(w.measuredOn) >= from)
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
  const first = points[0];
  const last = points[points.length - 1];
  return {
    points,
    deltaKg:
      first && last && points.length > 1
        ? Math.round((last.weightKg - first.weightKg) * 10) / 10
        : null,
  };
}

/** Record personnel de chaque exercice, le plus récent d'abord. */
export function personalRecords<T extends DatedSet>(sets: readonly T[]): T[] {
  const byExercise = new Map<string, T[]>();
  for (const set of sets)
    byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
  return [...byExercise.values()]
    .flatMap((list) => {
      const best = recordSet(list);
      return best ? [best] : [];
    })
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}
