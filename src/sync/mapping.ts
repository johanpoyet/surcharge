import { getTableColumns } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import {
  bodyWeights,
  exercises,
  profiles,
  scheduleOverrides,
  sessions,
  sessionSets,
  templateExercises,
  weeklySchedule,
  workoutTemplates,
  type SyncedTableName,
} from '@/db/schema';

/** Tables synchronisées, dans l'ordre des dépendances (clés étrangères côté Supabase). */
export const SYNC_ORDER: readonly SyncedTableName[] = [
  'profiles',
  'exercises',
  'workout_templates',
  'template_exercises',
  'weekly_schedule',
  'schedule_overrides',
  'sessions',
  'session_sets',
  'body_weights',
];

export const TABLES: Record<SyncedTableName, SQLiteTable> = {
  profiles,
  exercises,
  workout_templates: workoutTemplates,
  template_exercises: templateExercises,
  weekly_schedule: weeklySchedule,
  schedule_overrides: scheduleOverrides,
  sessions,
  session_sets: sessionSets,
  body_weights: bodyWeights,
};

/** Colonnes qui n'existent qu'en local. */
const LOCAL_ONLY = new Set(['dirty', 'photo_local_uri']);
/** Colonnes horodatées : normalisées en ISO 8601 (UTC, millisecondes) à la réception. */
const TIMESTAMPS = new Set([
  'created_at',
  'updated_at',
  'deleted_at',
  'started_at',
  'ended_at',
  'completed_at',
]);

export type RemoteRow = Record<string, unknown>;
type LocalRow = Record<string, unknown>;

const columnsOf = (table: SyncedTableName) =>
  Object.entries(getTableColumns(TABLES[table]) as Record<string, SQLiteColumn>).filter(
    ([, column]) => !LOCAL_ONLY.has(column.name),
  );

/** Ligne locale (noms Drizzle) → ligne Supabase (noms de colonnes SQL). */
export function toRemote(table: SyncedTableName, row: LocalRow): RemoteRow {
  const remote: RemoteRow = {};
  for (const [key, column] of columnsOf(table)) remote[column.name] = row[key] ?? null;
  return remote;
}

/** Ligne Supabase → valeurs locales, marquées comme synchronisées. */
export function fromRemote(table: SyncedTableName, remote: RemoteRow): LocalRow {
  const row: LocalRow = { dirty: false };
  for (const [key, column] of columnsOf(table)) {
    if (!(column.name in remote)) continue;
    const value = remote[column.name];
    row[key] =
      TIMESTAMPS.has(column.name) && typeof value === 'string'
        ? new Date(value).toISOString()
        : value;
  }
  return row;
}

/** Colonne propriétaire (RLS) : seules les lignes de l'utilisateur connecté sont envoyées. */
export const ownerColumn = (table: SyncedTableName) => (table === 'profiles' ? 'id' : 'userId');

/** Colonne Drizzle d'une table synchronisée, par nom de propriété (`id`, `userId`, `updatedAt`…). */
export function columnOf(table: SyncedTableName, key: string): SQLiteColumn {
  const column = (getTableColumns(TABLES[table]) as Record<string, SQLiteColumn>)[key];
  if (!column) throw new Error(`Colonne inconnue : ${table}.${key}`);
  return column;
}
