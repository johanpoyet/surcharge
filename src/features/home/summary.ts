// Calculs de l'accueil (SPEC 8.1). Fonctions pures.

import { parseISO } from 'date-fns';

import { sessionMax } from '@/features/stats/calc';
import { daysBetween, recordSets, type DatedSet } from '@/features/stats/regularity';
import { isStrength } from '@/features/stats/typed';

type SessionSetRow = DatedSet & { sessionId: string };

export type Progression = {
  exerciseId: string;
  /** Charge max réussie des dernières séances, de la plus ancienne à la plus récente. */
  maxes: number[];
  deltaKg: number;
  weeks: number;
};

const BARS = 8;

/** Exercice le plus pratiqué (en séances) et ses 8 dernières charges max. */
export function progressionOf(sets: readonly SessionSetRow[]): Progression | null {
  const byExercise = new Map<string, Map<string, SessionSetRow[]>>();
  // Courbe de charge : exercices de musculation seulement.
  for (const set of sets.filter(isStrength)) {
    const sessions = byExercise.get(set.exerciseId) ?? new Map<string, SessionSetRow[]>();
    sessions.set(set.sessionId, [...(sessions.get(set.sessionId) ?? []), set]);
    byExercise.set(set.exerciseId, sessions);
  }
  let best: [string, Map<string, SessionSetRow[]>] | null = null;
  for (const entry of byExercise) {
    if (!best || entry[1].size > best[1].size) best = entry;
  }
  if (!best) return null;

  const sessions = [...best[1].values()]
    .map((list) => ({
      max: sessionMax(list),
      at: list.reduce((max, s) => (s.completedAt > max ? s.completedAt : max), ''),
    }))
    .filter((s): s is { max: number; at: string } => s.max !== null)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-BARS);
  if (sessions.length === 0) return null;
  const first = sessions[0]!;
  const last = sessions[sessions.length - 1]!;
  return {
    exerciseId: best[0],
    maxes: sessions.map((s) => s.max),
    deltaKg: Math.round((last.max - first.max) * 100) / 100,
    weeks: Math.max(1, Math.round(daysBetween(parseISO(first.at), parseISO(last.at)) / 7)),
  };
}

export type BodyWeightSummary = { latestKg: number; deltaKg: number | null; pointsKg: number[] };

/** Dernière pesée, variation sur 30 jours, points de la courbe (30 derniers jours). */
export function bodyWeightSummary(
  weights: readonly { measuredOn: string; weightKg: number }[],
): BodyWeightSummary | null {
  const sorted = [...weights].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
  const latest = sorted[sorted.length - 1];
  if (!latest) return null;
  const from = new Date(parseISO(latest.measuredOn).getTime() - 30 * 24 * 3600 * 1000);
  const recent = sorted.filter((w) => parseISO(w.measuredOn) >= from);
  const first = recent[0]!;
  return {
    latestKg: latest.weightKg,
    deltaKg: recent.length > 1 ? Math.round((latest.weightKg - first.weightKg) * 10) / 10 : null,
    pointsKg: recent.map((w) => w.weightKg),
  };
}

/** Séances et records du mois de `today`. */
export function monthCounts(
  sessionStarts: readonly string[],
  sets: readonly DatedSet[],
  today: Date,
): { sessions: number; records: number } {
  const inMonth = (iso: string) => {
    const date = parseISO(iso);
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  };
  return {
    sessions: sessionStarts.filter(inMonth).length,
    records: recordSets(sets).filter((s) => inMonth(s.completedAt)).length,
  };
}

/** Kilomètres courus dans le mois de `today` : exercices de course et courses Hyrox. */
export function kmInMonth(
  sets: readonly {
    completedAt: string;
    distanceM?: number | null;
    discipline?: string | null;
    catalogKey?: string | null;
  }[],
  today: Date,
): number {
  const meters = sets.reduce((sum, set) => {
    const date = parseISO(set.completedAt);
    const running = set.discipline === 'running' || set.catalogKey === 'hyrox_run';
    const inMonth =
      date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
    return running && inMonth ? sum + (set.distanceM ?? 0) : sum;
  }, 0);
  return Math.round(meters / 100) / 10;
}

export type HyroxRun = { endedAt: string; totalS: number };

/** Simus Hyrox complètes terminées, de la plus ancienne à la plus récente (carte d'accueil). */
export function hyroxHistory(
  blocks: readonly {
    endedAt: string | null;
    config: Record<string, unknown>;
    result: Record<string, unknown>;
  }[],
): HyroxRun[] {
  return blocks
    .flatMap((block) =>
      block.endedAt && block.config.format === 'full' && typeof block.result.totalS === 'number'
        ? [{ endedAt: block.endedAt, totalS: block.result.totalS }]
        : [],
    )
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt));
}
