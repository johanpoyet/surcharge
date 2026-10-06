// Schéma SQLite (Drizzle) : miroir local des tables Supabase (supabase/migrations/0001 et 0006),
// plus les colonnes locales `dirty` et les tables `outbox` / `sync_state` (SPEC 6.3).
//
// Conversions : uuid → text, timestamptz → text ISO 8601, date → text AAAA-MM-JJ,
// numeric → real, enum → text typé, boolean → integer 0/1, jsonb et tableaux → text JSON.
// Pas de clés étrangères locales : la synchro peut recevoir un enfant avant son parent, et les
// suppressions sont douces ; l'intégrité est garantie côté Supabase.

import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { Difficulty } from '@/features/workout/difficulty';
import type { Goal, WeightUnit } from '@/lib/database.types';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'abs' | 'other';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';
/** Ce que l'on note à chaque série (SPEC_V2 §4.1). */
export type TrackingType =
  'weight_reps' | 'distance_time' | 'time' | 'reps' | 'calories' | 'weight_distance';
export type Discipline = 'strength' | 'running' | 'cross_training' | 'hyrox' | 'other';
export type BlockType = 'warmup' | 'strength' | 'cardio' | 'circuit' | 'hyrox';
/** Contenu JSON libre (config et résultat d'un bloc), typé par type de bloc côté métier. */
export type JsonObject = Record<string, unknown>;

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
  /** Tableau JSON (Postgres : discipline[]). */
  disciplines: text('disciplines', { mode: 'json' })
    .$type<Discipline[]>()
    .notNull()
    .default(['strength']),
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
    trackingType: text('tracking_type').$type<TrackingType>().notNull().default('weight_reps'),
    discipline: text('discipline').$type<Discipline>().notNull().default('strength'),
    /** Identifiant canonique d'un exercice du catalogue (`bench_press`, `hyrox_skierg`…). */
    catalogKey: text('catalog_key'),
    ...syncColumns,
  },
  (t) => [
    index('exercises_user').on(t.userId),
    index('exercises_catalog_key').on(t.userId, t.catalogKey),
  ],
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

/**
 * Blocs d'une séance type (SPEC_V2 §3). Le bloc Musculation repris d'une séance type V1 a l'id de
 * la séance type (même reprise côté Supabase et sur chaque appareil, sans doublon).
 */
export const templateBlocks = sqliteTable(
  'template_blocks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    templateId: text('template_id').notNull(),
    position: integer('position').notNull(),
    type: text('type').$type<BlockType>().notNull(),
    name: text('name'),
    config: text('config', { mode: 'json' }).$type<JsonObject>().notNull().default({}),
    ...syncColumns,
  },
  (t) => [index('template_blocks_template').on(t.templateId)],
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
    /** Null pour une ligne créée par une ancienne version (rattachée ensuite au bloc Musculation). */
    blockId: text('block_id'),
    targetDistanceM: integer('target_distance_m'),
    targetDurationS: integer('target_duration_s'),
    targetCalories: integer('target_calories'),
    targetWeightKg: real('target_weight_kg'),
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

/** Blocs réalisés pendant une séance (config copiée au démarrage, résultat à la fin). */
export const sessionBlocks = sqliteTable(
  'session_blocks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    sessionId: text('session_id').notNull(),
    templateBlockId: text('template_block_id'),
    position: integer('position').notNull(),
    type: text('type').$type<BlockType>().notNull(),
    name: text('name'),
    config: text('config', { mode: 'json' }).$type<JsonObject>().notNull().default({}),
    result: text('result', { mode: 'json' }).$type<JsonObject>().notNull().default({}),
    startedAt: text('started_at'),
    endedAt: text('ended_at'),
    ...syncColumns,
  },
  (t) => [index('session_blocks_session').on(t.sessionId)],
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
    /** 0 pour une série sans charge (le type de suivi de l'exercice dit comment la lire). */
    weightKg: real('weight_kg').notNull(),
    /** 0 pour une série sans reps. */
    reps: integer('reps').notNull(),
    difficulty: text('difficulty').$type<Difficulty>(),
    completedAt: text('completed_at').notNull(),
    /** Null pour une série V1 : bloc Musculation implicite. */
    blockId: text('block_id'),
    distanceM: integer('distance_m'),
    durationS: integer('duration_s'),
    calories: integer('calories'),
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
  'template_blocks',
  'template_exercises',
  'weekly_schedule',
  'schedule_overrides',
  'sessions',
  'session_blocks',
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

/** Dernier pull par table et par utilisateur : clé `{userId}/{table}` (plusieurs comptes possibles). */
export const syncState = sqliteTable('sync_state', {
  tableName: text('table_name').primaryKey(),
  lastPulledAt: text('last_pulled_at'),
});

/**
 * Local uniquement : état de l'écran de la séance en cours (exercice affiché, séries ajoutées,
 * valeurs saisies, chrono de repos), en JSON. Permet de rouvrir la séance au même endroit si
 * l'app est tuée (SPEC 8.2). Supprimé à la fin de la séance.
 */
export const workoutState = sqliteTable('workout_state', {
  sessionId: text('session_id').primaryKey(),
  state: text('state').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type TemplateBlock = typeof templateBlocks.$inferSelect;
export type TemplateExercise = typeof templateExercises.$inferSelect;
export type WeeklyScheduleEntry = typeof weeklySchedule.$inferSelect;
export type ScheduleOverride = typeof scheduleOverrides.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SessionBlock = typeof sessionBlocks.$inferSelect;
export type SessionSet = typeof sessionSets.$inferSelect;
export type BodyWeight = typeof bodyWeights.$inferSelect;
export type OutboxEntry = typeof outbox.$inferSelect;
