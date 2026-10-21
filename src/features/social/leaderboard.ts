// Classement de la semaine et fil d'activité des amis (SPEC_V2 §7.1). Fonctions pures.

import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';

import { formatClock } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import { formatNumber, toLocalDateString } from '@/lib/format';
import type { PublicStatsRow } from './publicStats';
import { weekStart } from './publicStats';

const t = fr.friends;

export type Criterion = 'regularity' | 'progress' | 'records';

export type LeaderboardPerson = {
  userId: string;
  name: string;
  isMe: boolean;
  stats: Pick<
    PublicStatsRow,
    'week_start' | 'sessions_this_week' | 'weekly_goal' | 'records_this_week'
  > | null;
  /** Moyenne des progressions sur 3 mois (exercices du catalogue), en %. */
  progress: number | null;
};

export type LeaderboardRow = {
  person: LeaderboardPerson;
  rank: number;
  /** « 5/4 », « +6 % », « 3 ». */
  value: string;
  /** Remplissage de la barre, entre 0 et 1. */
  fill: number;
};

/** Stats de la semaine en cours seulement : un ami qui n'a rien envoyé depuis lundi repart à 0. */
function thisWeek(person: LeaderboardPerson, today: Date) {
  const current = toLocalDateString(weekStart(today));
  const stats = person.stats;
  const fresh = stats && stats.week_start === current;
  return {
    sessions: fresh ? stats.sessions_this_week : 0,
    goal: Math.max(1, stats?.weekly_goal ?? 1),
    records: fresh ? stats.records_this_week : 0,
  };
}

export const average = (values: readonly (number | null)[]): number | null => {
  const known = values.filter((v): v is number => v !== null);
  return known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : null;
};

export const formatPct = (value: number): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(Math.round(value)), 0)} %`;

/**
 * Classement selon le critère : assiduité (séances ÷ objectif, plafonnée à 100 %, puis nombre de
 * séances), progression moyenne, ou records de la semaine. Ex æquo : même rang.
 */
export function leaderboard(
  people: readonly LeaderboardPerson[],
  criterion: Criterion,
  today: Date,
): LeaderboardRow[] {
  const scored = people.map((person) => {
    const week = thisWeek(person, today);
    switch (criterion) {
      case 'regularity':
        return {
          person,
          score: [Math.min(1, week.sessions / week.goal), week.sessions],
          value: `${week.sessions}/${week.goal}`,
          raw: Math.min(1, week.sessions / week.goal),
        };
      case 'progress':
        return {
          person,
          score: [person.progress ?? -Infinity, 0],
          value: person.progress === null ? '—' : formatPct(person.progress),
          raw: person.progress ?? 0,
        };
      case 'records':
        return {
          person,
          score: [week.records, 0],
          value: String(week.records),
          raw: week.records,
        };
    }
  });
  scored.sort(
    (a, b) =>
      b.score[0]! - a.score[0]! ||
      b.score[1]! - a.score[1]! ||
      Number(b.person.isMe) - Number(a.person.isMe) ||
      a.person.name.localeCompare(b.person.name),
  );
  const max = Math.max(0, ...scored.map((s) => s.raw));
  let rank = 0;
  return scored.map((entry, index) => {
    const previous = scored[index - 1];
    const tied =
      previous && previous.score[0] === entry.score[0] && previous.score[1] === entry.score[1];
    if (!tied) rank = index + 1;
    const fill =
      criterion === 'regularity' ? entry.raw : max > 0 ? Math.max(0, entry.raw) / max : 0;
    return { person: entry.person, rank, value: entry.value, fill };
  });
}

export type FeedEvent = {
  id: string;
  userId: string;
  type: 'record' | 'streak' | 'hyrox_done' | 'session_done';
  payload: Record<string, unknown>;
  createdAt: string;
};

/** Phrase d'une activité : sujet (prénom), texte, mot mis en gras, valeur en grand. */
export function describeEvent(event: FeedEvent): {
  text: string;
  strong: string;
  value: string | null;
} {
  const p = event.payload;
  switch (event.type) {
    case 'record':
      return {
        text: t.feed.record,
        strong: typeof p.exerciseName === 'string' ? p.exerciseName.toLowerCase() : '',
        value: typeof p.value === 'string' ? p.value : null,
      };
    case 'hyrox_done': {
      const format = p.format === 'half' ? 'half' : p.format === 'station' ? 'station' : 'full';
      return {
        text: t.feed.hyrox,
        strong: t.feed.hyroxFormats[format],
        value: typeof p.totalS === 'number' ? formatClock(p.totalS) : null,
      };
    }
    case 'streak':
      return {
        text: t.feed.streak,
        strong: t.feed.weeks(typeof p.weeks === 'number' ? p.weeks : 2),
        value: null,
      };
    case 'session_done':
      return { text: t.feed.session, strong: '', value: null };
  }
}

/** « à l'instant », « il y a 2 h », « hier », « lun. 12 oct. ». */
export function timeAgo(iso: string, now: Date): string {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return t.ago.now;
  if (minutes < 60) return t.ago.minutes(minutes);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return t.ago.hours(Math.floor(minutes / 60));
  if (date.toDateString() === yesterday.toDateString()) return t.ago.yesterday;
  return format(date, 'EEE d MMM', { locale: frLocale });
}
