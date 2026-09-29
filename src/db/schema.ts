// Schéma SQLite (Drizzle) : miroir local des tables Supabase (supabase/migrations/0001_init.sql),
// plus les colonnes locales `dirty` et les tables `outbox` / `sync_state` (SPEC 6.3).
//
// Conversions : uuid → text, timestamptz → text ISO 8601, date → text AAAA-MM-JJ,
// numeric → real, enum → text typé, boolean → integer 0/1.
// Pas de clés étrangères locales : la synchro peut recevoir un enfant avant son parent, et les
// suppressions sont douces ; l'intégrité est garantie côté Supabase.

import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { Difficulty } from '@/features/workout/difficulty';
import type { Goal, WeightUnit } from '@/lib/database.types';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'abs' | 'other';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';

const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
};

// Colonnes communes aux tables métier synchronisées.
const syncColumns = {
  ...timestamps,
  deletedAt: text('deleted_at'),
  /** 1 tant que la modification locale n'a pas été envoyée à Supabase. */
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false),
};

const notDeleted = sql`deleted_at is null`;

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  goal: text('goal').$type<Goal>(),
  sessionsPerWeek: integer('sessions_per_week'),
  weightUnit: text('weight_unit').$type<WeightUnit>().notNull().default('kg'),
  defaultRestSeconds: integer('default_rest_seconds').notNull().default(120),
  remindersEnabled: integer('reminders_enabled', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
  dirty: integer('dirty', { mode: 'boolean' }).notNull().default(false),
});

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    muscle: text('muscle').$type<MuscleGroup>().notNull(),
    equipment: text('equipment').$type<Equipment>().notNull(),
    weightStep: real('weight_step').notNull().default(2.5),
    photoPath: text('photo_path'),
    /** Local uniquement : fichier photo dans documentDirectory (affichage hors ligne). */
    photoLocalUri: text('photo_local_uri'),
    note: text('note'),
    ...syncColumns,
  },
  (t) => [index('exercises_user').on(t.userId)],
);

export const workoutTemplates = sqliteTable(
  'workout_templates',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    ...syncColumns,
  },
  (t) => [index('workout_templates_user').on(t.userId)],
);

export const templateExercises = sqliteTable(
  'template_exercises',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    templateId: text('template_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    position: integer('position').notNull(),
    targetSets: integer('target_sets').notNull().default(3),
    targetRepsMin: integer('target_reps_min'),
    targetRepsMax: integer('target_reps_max'),
    restSeconds: integer('rest_seconds').notNull().default(120),
    ...syncColumns,
  },
  (t) => [index('template_exercises_template').on(t.templateId)],
);

/** Modèle de semaine : 1 = lundi … 7 = dimanche. */
export const weeklySchedule = sqliteTable(
  'weekly_schedule',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    weekday: integer('weekday').notNull(),
    templateId: text('template_id').notNull(),
    ...syncColumns,
  },
  (t) => [uniqueIndex('weekly_schedule_unique').on(t.userId, t.weekday).where(notDeleted)],
);

/** Exceptions à une date précise (templateId null = repos forcé). */
export const scheduleOverrides = sqliteTable(
  'schedule_overrides',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    templateId: text('template_id'),
    ...syncColumns,
  },
  (t) => [uniqueIndex('schedule_overrides_unique').on(t.userId, t.date).where(notDeleted)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    templateId: text('template_id'),
    /** Copie du nom au moment de la séance. */
    name: text('name').notNull(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    note: text('note'),
    ...syncColumns,
  },
  (t) => [index('sessions_user_started').on(t.userId, t.startedAt)],
);

export const sessionSets = sqliteTable(
  'session_sets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    sessionId: text('session_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    exerciseOrder: integer('exercise_order').notNull(),
    setNumber: integer('set_number').notNull(),
    weightKg: real('weight_kg').notNull(),
    reps: integer('reps').notNull(),
    difficulty: text('difficulty').$type<Difficulty>(),
    completedAt: text('completed_at').notNull(),
    ...syncColumns,
  },
  (t) => [
    index('session_sets_exercise').on(t.userId, t.exerciseId, t.completedAt),
    index('session_sets_session').on(t.sessionId),
  ],
);

export const bodyWeights = sqliteTable(
  'body_weights',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    measuredOn: text('measured_on').notNull(),
    weightKg: real('weight_kg').notNull(),
    ...syncColumns,
  },
  (t) => [uniqueIndex('body_weights_unique').on(t.userId, t.measuredOn).where(notDeleted)],
);

/** Tables synchronisées, dans l'ordre des dépendances (SPEC 7). */
export const SYNCED_TABLES = [
  'profiles',
  'exercises',
  'workout_templates',
  'template_exercises',
  'weekly_schedule',
  'schedule_overrides',
  'sessions',
  'session_sets',
  'body_weights',
] as const;
export type SyncedTableName = (typeof SYNCED_TABLES)[number];

export type OutboxOp = 'upsert' | 'delete';

/** Modifications locales à envoyer à Supabase (une ligne par enregistrement modifié). */
export const outbox = sqliteTable(
  'outbox',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tableName: text('table_name').$type<SyncedTableName>().notNull(),
    rowId: text('row_id').notNull(),
    op: text('op').$type<OutboxOp>().notNull(),
    createdAt: text('created_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
  },
  (t) => [uniqueIndex('outbox_row').on(t.tableName, t.rowId)],
);

export const syncState = sqliteTable('sync_state', {
  tableName: text('table_name').$type<SyncedTableName>().primaryKey(),
  lastPulledAt: text('last_pulled_at'),
});

export type Profile = typeof profiles.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type TemplateExercise = typeof templateExercises.$inferSelect;
export type WeeklyScheduleEntry = typeof weeklySchedule.$inferSelect;
export type ScheduleOverride = typeof scheduleOverrides.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SessionSet = typeof sessionSets.$inferSelect;
export type BodyWeight = typeof bodyWeights.$inferSelect;
export type OutboxEntry = typeof outbox.$inferSelect;
