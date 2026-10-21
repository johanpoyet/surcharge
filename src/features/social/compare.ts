// Comparaison « Toi vs ami » (SPEC_V2 §7.3). Fonctions pures.

import { toLocalDateString } from '@/lib/format';
import type { FriendExerciseStats, FriendStats } from './api';
import { HYROX_FULL_KEY, weekStart, type PublicStatsRow } from './publicStats';

export type Period = 'week' | 'month';

export type PeriodStats = { sessions: number; goalPct: number; records: number };

type Stats = { updated_at?: string } & Pick<
  PublicStatsRow | FriendStats,
  | 'week_start'
  | 'sessions_this_week'
  | 'weekly_goal'
  | 'sessions_this_month'
  | 'records_this_week'
  | 'records_this_month'
>;

/**
 * Séances, objectif hebdo atteint (en %, plafonné à 100) et records sur la période. Des stats
 * envoyées avant ce lundi (ou avant ce mois) comptent pour 0.
 */
export function periodStats(stats: Stats | null, period: Period, today: Date): PeriodStats {
  if (!stats) return { sessions: 0, goalPct: 0, records: 0 };
  const goal = Math.max(1, stats.weekly_goal);
  if (period === 'week') {
    const fresh = stats.week_start === toLocalDateString(weekStart(today));
    const sessions = fresh ? stats.sessions_this_week : 0;
    return {
      sessions,
      goalPct: Math.min(100, Math.round((sessions / goal) * 100)),
      records: fresh ? stats.records_this_week : 0,
    };
  }
  // Mois : valable si les stats ont été envoyées ce mois-ci (les miennes sont calculées à l'instant).
  const updated = 'updated_at' in stats && stats.updated_at ? new Date(stats.updated_at) : today;
  const sameMonth =
    updated.getFullYear() === today.getFullYear() && updated.getMonth() === today.getMonth();
  const sessions = sameMonth ? stats.sessions_this_month : 0;
  const weeks = Math.max(1, Math.ceil(today.getDate() / 7));
  return {
    sessions,
    goalPct: Math.min(100, Math.round((sessions / (goal * weeks)) * 100)),
    records: sameMonth ? stats.records_this_month : 0,
  };
}

export type CommonExercise = {
  key: string;
  mine:
    | FriendExerciseStats
    | Pick<FriendExerciseStats, 'progress_pct_3m' | 'best_weight_kg' | 'best_time_s'>;
  theirs: FriendExerciseStats;
};

/** Exercices du catalogue faits par les deux (même clé), Simu Hyrox à part. */
export function commonExercises(
  mine: readonly {
    catalog_key: string;
    progress_pct_3m: number | null;
    best_weight_kg: number | null;
    best_time_s: number | null;
  }[],
  theirs: readonly FriendExerciseStats[],
): { exercises: CommonExercise[]; hyrox: CommonExercise | null } {
  const byKey = new Map(theirs.map((row) => [row.catalog_key, row]));
  const exercises: CommonExercise[] = [];
  let hyrox: CommonExercise | null = null;
  for (const row of mine) {
    const other = byKey.get(row.catalog_key);
    if (!other) continue;
    const entry = { key: row.catalog_key, mine: row, theirs: other };
    if (row.catalog_key === HYROX_FULL_KEY) hyrox = entry;
    else exercises.push(entry);
  }
  return { exercises, hyrox };
}
