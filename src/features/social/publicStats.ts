// Stats publiques vues par les amis (SPEC_V2 §6.3), calculées en local à partir des séances et
// envoyées au serveur. Fonctions pures, testées unitairement. Jamais de poids corporel, jamais
// de série brute : seulement des totaux, des records et des pourcentages de progression.

import type { TrackingType } from '@/db/schema';
import { recordSets, regularityWeeks, type DatedSet } from '@/features/stats/regularity';
import { isCounted, typeOf } from '@/features/stats/typed';
import { formatClock } from '@/features/workout/logic';
import { formatWeight, toLocalDateString } from '@/lib/format';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Clé de la ligne « Simu Hyrox » de public_exercise_stats (meilleur temps d'une simu complète). */
export const HYROX_FULL_KEY = 'hyrox_full_simulation';
/** Les activités ne remontent pas au-delà : pas de fil inondé au premier lancement. */
export const EVENT_WINDOW_DAYS = 7;

export type ShareSettings = {
  shareSessions: boolean;
  shareRecords: boolean;
  shareExactWeights: boolean;
};

export type StatsSet = DatedSet & {
  id: string;
  catalogKey: string | null;
  trackingType: TrackingType | null;
};

export type StatsInput = {
  userId: string;
  today: Date;
  sessionsPerWeek: number | null;
  share: ShareSettings;
  /** Débuts des séances terminées. */
  sessionStarts: readonly string[];
  sets: readonly StatsSet[];
  /** Blocs Hyrox terminés (simus complètes, demies ou stations). */
  hyroxBlocks: readonly { id: string; endedAt: string; format: string; totalS: number | null }[];
  exerciseNames: ReadonlyMap<string, string>;
};

export type PublicStatsRow = {
  user_id: string;
  week_start: string;
  sessions_this_week: number;
  weekly_goal: number;
  streak_weeks: number;
  sessions_this_month: number;
  records_this_week: number;
  records_this_month: number;
};

export type ExerciseStatsRow = {
  user_id: string;
  catalog_key: string;
  progress_pct_3m: number | null;
  best_weight_kg: number | null;
  best_time_s: number | null;
};

export type ActivityEvent = {
  /** Clé stable : le même événement garde le même id d'un calcul à l'autre. */
  key: string;
  type: 'record' | 'streak' | 'hyrox_done';
  payload: Record<string, string | number | null>;
  created_at: string;
};

export type PublicSnapshot = {
  share: ShareSettings;
  stats: PublicStatsRow;
  exercises: ExerciseStatsRow[];
  events: ActivityEvent[];
};

/** Lundi (date locale) de la semaine de `date`. */
export function weekStart(date: Date): Date {
  const day = date.getDay() === 0 ? 7 : date.getDay();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - (day - 1));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Meilleure valeur d'une série pour la progression : charge (muscu) ou allure en s/km (course). */
function progressValue(set: StatsSet): number | null {
  if (!isCounted(set)) return null;
  switch (typeOf(set)) {
    case 'weight_reps':
      return set.weightKg;
    case 'distance_time':
      return set.distanceM && set.durationS ? (set.durationS * 1000) / set.distanceM : null;
    default:
      return null;
  }
}

/**
 * Progression sur 3 mois, en % : meilleure valeur des 14 derniers jours contre la meilleure des
 * 14 jours qui finissent il y a 90 jours. Pour une allure (plus bas = mieux), le % est inversé.
 * Null s'il manque l'une des deux périodes.
 */
export function progressPct3m(sets: readonly StatsSet[], today: Date): number | null {
  const now = today.getTime();
  const lowerIsBetter = sets.some((s) => typeOf(s) === 'distance_time');
  const bestIn = (fromDays: number, toDays: number) => {
    const values = sets
      .filter((s) => {
        const age = (now - new Date(s.completedAt).getTime()) / DAY_MS;
        return age >= fromDays && age < toDays;
      })
      .map(progressValue)
      .filter((v): v is number => v !== null && v > 0);
    if (values.length === 0) return null;
    return lowerIsBetter ? Math.min(...values) : Math.max(...values);
  };
  const recent = bestIn(0, 14);
  const before = bestIn(90, 104);
  if (recent === null || before === null) return null;
  const pct = lowerIsBetter
    ? ((before - recent) / before) * 100
    : ((recent - before) / before) * 100;
  return round2(Math.max(-9999, Math.min(9999, pct)));
}

/** Texte d'un record pour le fil des amis, selon le réglage « charges exactes ». */
function recordValue(set: StatsSet, exact: boolean): string | null {
  switch (typeOf(set)) {
    case 'weight_reps':
      return exact ? `${formatWeight(set.weightKg, 'kg')} × ${set.reps}` : null;
    case 'distance_time':
      return set.durationS ? formatClock(set.durationS) : null;
    case 'time':
      return set.durationS ? formatClock(set.durationS) : null;
    case 'reps':
      return String(set.reps);
    case 'calories':
      return set.calories ? `${set.calories} cal` : null;
    case 'weight_distance':
      return exact ? `${formatWeight(set.weightKg, 'kg')}` : null;
  }
}

/** Tout ce que les amis peuvent voir, calculé à partir des données locales. */
export function publicSnapshot(input: StatsInput): PublicSnapshot {
  const { today, share } = input;
  const monday = weekStart(today);
  const inWeek = (iso: string) => new Date(iso) >= monday;
  const inMonth = (iso: string) => {
    const date = new Date(iso);
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  };
  const records = recordSets(input.sets);
  const streak = regularityWeeks(
    input.sessionStarts.map((iso) => new Date(iso)),
    input.sessionsPerWeek,
    today,
  );

  // Un partage désactivé envoie des zéros : les amis ne voient plus rien de ce qu'il couvre.
  const sessionsShared = share.shareSessions;
  const recordsShared = share.shareRecords;
  const stats: PublicStatsRow = {
    user_id: input.userId,
    week_start: toLocalDateString(monday),
    sessions_this_week: sessionsShared ? input.sessionStarts.filter(inWeek).length : 0,
    weekly_goal: Math.max(1, input.sessionsPerWeek ?? 1),
    streak_weeks: sessionsShared ? streak : 0,
    sessions_this_month: sessionsShared ? input.sessionStarts.filter(inMonth).length : 0,
    records_this_week: recordsShared ? records.filter((s) => inWeek(s.completedAt)).length : 0,
    records_this_month: recordsShared ? records.filter((s) => inMonth(s.completedAt)).length : 0,
  };

  // Par exercice du catalogue (comparaison « exercices en commun »).
  const byKey = new Map<string, StatsSet[]>();
  for (const set of input.sets) {
    if (!set.catalogKey) continue;
    byKey.set(set.catalogKey, [...(byKey.get(set.catalogKey) ?? []), set]);
  }
  // Records et progression non partagés : aucune stat par exercice.
  const shownKeys = recordsShared ? [...byKey] : [];
  const exercises: ExerciseStatsRow[] = shownKeys.flatMap(([catalogKey, sets]) => {
    const counted = sets.filter(isCounted);
    if (counted.length === 0) return [];
    const strength = counted.filter((s) => typeOf(s) === 'weight_reps');
    const paces = counted
      .filter((s) => typeOf(s) === 'distance_time')
      .map(progressValue)
      .filter((v): v is number => v !== null);
    return [
      {
        user_id: input.userId,
        catalog_key: catalogKey,
        progress_pct_3m: progressPct3m(counted, today),
        best_weight_kg:
          share.shareExactWeights && strength.length > 0
            ? Math.max(...strength.map((s) => s.weightKg))
            : null,
        best_time_s: paces.length > 0 ? Math.round(Math.min(...paces)) : null,
      },
    ];
  });

  // Simu Hyrox complète : meilleur temps, comparé comme un exercice du catalogue.
  const fullRuns = input.hyroxBlocks.filter((b) => b.format === 'full' && b.totalS !== null);
  if (sessionsShared && fullRuns.length > 0) {
    exercises.push({
      user_id: input.userId,
      catalog_key: HYROX_FULL_KEY,
      progress_pct_3m: null,
      best_weight_kg: null,
      best_time_s: Math.min(...fullRuns.map((b) => b.totalS ?? Infinity)),
    });
  }

  // Activités récentes (records, série de semaines paire, simu Hyrox terminée).
  const since = today.getTime() - EVENT_WINDOW_DAYS * DAY_MS;
  const recent = (iso: string) => new Date(iso).getTime() >= since;
  const events: ActivityEvent[] = [];
  if (share.shareRecords) {
    for (const set of records.filter((s) => recent(s.completedAt))) {
      events.push({
        key: `record:${set.id}`,
        type: 'record',
        payload: {
          exerciseName: input.exerciseNames.get(set.exerciseId) ?? '',
          value: recordValue(set, share.shareExactWeights),
        },
        created_at: set.completedAt,
      });
    }
  }
  if (share.shareSessions && streak >= 2 && streak % 2 === 0) {
    events.push({
      key: `streak:${stats.week_start}:${streak}`,
      type: 'streak',
      payload: { weeks: streak },
      created_at: monday.toISOString(),
    });
  }
  if (share.shareSessions) {
    for (const block of input.hyroxBlocks.filter((b) => recent(b.endedAt))) {
      events.push({
        key: `hyrox:${block.id}`,
        type: 'hyrox_done',
        payload: { format: block.format, totalS: block.totalS },
        created_at: block.endedAt,
      });
    }
  }
  return { share, stats, exercises, events };
}
