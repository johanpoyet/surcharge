import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import {
  exercises,
  sessions,
  sessionSets,
  type Discipline,
  type Equipment,
  type Exercise,
  type MuscleGroup,
  type TrackingType,
} from '@/db/schema';
import { BASE_EXERCISES, defaultWeightStep } from '@/db/seed';
import { nowIso } from '@/db/time';
import { newId } from '@/lib/id';
import { enqueue, type Tx } from '@/sync/outbox';

import { insertCatalogExercise } from './catalog';

export type ExerciseInput = {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  weightStep?: number;
  note?: string | null;
  photoLocalUri?: string | null;
  trackingType?: TrackingType;
  discipline?: Discipline;
};

export function createExercise(db: AppDatabase, userId: string, input: ExerciseInput): string {
  const id = newId();
  const now = nowIso();
  db.transaction((tx) => {
    tx.insert(exercises)
      .values({
        id,
        userId,
        name: input.name.trim(),
        muscle: input.muscle,
        equipment: input.equipment,
        weightStep: input.weightStep ?? defaultWeightStep(input.equipment),
        note: input.note ?? null,
        photoLocalUri: input.photoLocalUri ?? null,
        trackingType: input.trackingType ?? 'weight_reps',
        discipline: input.discipline ?? 'strength',
        createdAt: now,
        updatedAt: now,
        dirty: true,
      })
      .run();
    enqueue(tx, 'exercises', id, 'upsert');
  });
  return id;
}

export function updateExercise(
  db: AppDatabase,
  id: string,
  patch: Partial<ExerciseInput> & { photoPath?: string | null },
): void {
  db.transaction((tx) => {
    // Type de suivi verrouillé dès qu'il y a des séries (SPEC_V2 §5.2) : historique cohérent.
    const { trackingType, ...rest } = patch;
    const keepTracking = trackingType !== undefined && !exerciseHasSets(tx, id);
    tx.update(exercises)
      .set({
        ...rest,
        ...(keepTracking ? { trackingType } : {}),
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        // Nouvelle photo (ou photo retirée) : la version en ligne n'est plus la bonne.
        ...(patch.photoLocalUri !== undefined && patch.photoPath === undefined
          ? { photoPath: null }
          : {}),
        updatedAt: nowIso(),
        dirty: true,
      })
      .where(eq(exercises.id, id))
      .run();
    enqueue(tx, 'exercises', id, 'upsert');
  });
}

/** L'exercice a au moins une série enregistrée (non supprimée). */
export function exerciseHasSets(db: Tx, exerciseId: string): boolean {
  return (
    db
      .select({ id: sessionSets.id })
      .from(sessionSets)
      .where(and(eq(sessionSets.exerciseId, exerciseId), isNull(sessionSets.deletedAt)))
      .limit(1)
      .all().length > 0
  );
}

/** Nombre de séries d'un exercice (verrouillage du type de suivi dans le formulaire). */
export const exerciseSetCountQuery = (db: AppDatabase, exerciseId: string) =>
  db
    .select({ count: sql<number>`count(*)` })
    .from(sessionSets)
    .where(and(eq(sessionSets.exerciseId, exerciseId), isNull(sessionSets.deletedAt)));

/** Suppression douce : la ligne reste pour l'historique des séances et la synchro. */
export function deleteExercise(db: AppDatabase, id: string): void {
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(exercises)
      .set({ deletedAt: now, updatedAt: now, dirty: true })
      .where(eq(exercises.id, id))
      .run();
    enqueue(tx, 'exercises', id, 'delete');
  });
}

export const activeExercisesQuery = (db: AppDatabase, userId: string) =>
  db
    .select()
    .from(exercises)
    .where(and(eq(exercises.userId, userId), isNull(exercises.deletedAt)))
    .orderBy(asc(exercises.name));

export function listExercises(db: AppDatabase, userId: string): Exercise[] {
  return activeExercisesQuery(db, userId).all();
}

export function getExercise(db: AppDatabase, id: string): Exercise | undefined {
  return db.select().from(exercises).where(eq(exercises.id, id)).get();
}

/**
 * Bibliothèque vide (compte sans onboarding, tout supprimé…) : ajoute les exercices par défaut
 * dont le nom n'existe pas déjà parmi les exercices actifs. Retourne le nombre ajouté.
 */
export function addMissingDefaultExercises(db: AppDatabase, userId: string): number {
  return db.transaction((tx) => {
    const existing = new Set(
      tx
        .select({ name: exercises.name })
        .from(exercises)
        .where(and(eq(exercises.userId, userId), isNull(exercises.deletedAt)))
        .all()
        .map((e) => e.name.trim().toLowerCase()),
    );
    const now = nowIso();
    let added = 0;
    for (const seed of BASE_EXERCISES) {
      if (existing.has(seed.name.toLowerCase())) continue;
      // Nouvel id : l'exercice du catalogue d'origine (id stable) peut exister, supprimé.
      const id = newId();
      tx.insert(exercises)
        .values({
          id,
          userId,
          name: seed.name,
          muscle: seed.muscle,
          equipment: seed.equipment,
          weightStep: defaultWeightStep(seed.equipment),
          trackingType: seed.trackingType,
          discipline: seed.discipline,
          catalogKey: seed.catalogKey,
          createdAt: now,
          updatedAt: now,
          dirty: true,
        })
        .run();
      enqueue(tx, 'exercises', id, 'upsert');
      added += 1;
    }
    return added;
  });
}

/**
 * Ajoute la bibliothèque par défaut si l'utilisateur n'a encore aucun exercice (même supprimé) :
 * ne s'exécute qu'une fois par compte. Retourne le nombre d'exercices créés.
 */
export function seedDefaultExercises(db: AppDatabase, userId: string): number {
  return db.transaction((tx) => {
    const existing = tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(eq(exercises.userId, userId))
      .limit(1)
      .all();
    if (existing.length > 0) return 0;
    for (const seed of BASE_EXERCISES) insertCatalogExercise(tx, userId, seed);
    return BASE_EXERCISES.length;
  });
}

const ok = sql`(${sessionSets.difficulty} is null or ${sessionSets.difficulty} <> 'fail')`;

/** Charge max réussie et dernière série, par exercice et par séance (liste des exercices). */
export const exerciseSessionStatsQuery = (db: AppDatabase, userId: string) =>
  db
    .select({
      exerciseId: sessionSets.exerciseId,
      sessionId: sessionSets.sessionId,
      maxKg: sql<
        number | null
      >`max(case when ${sessionSets.reps} > 0 and (${sessionSets.difficulty} is null or ${sessionSets.difficulty} <> 'fail') then ${sessionSets.weightKg} end)`,
      lastAt: sql<string>`max(${sessionSets.completedAt})`,
      // Types de suivi V2 (séries hors échec) : meilleure allure (s/km), durée, reps, calories,
      // charge portée.
      bestPace: sql<
        number | null
      >`min(case when ${ok} and ${sessionSets.distanceM} > 0 and ${sessionSets.durationS} > 0 then ${sessionSets.durationS} * 1000.0 / ${sessionSets.distanceM} end)`,
      maxDurationS: sql<number | null>`max(case when ${ok} then ${sessionSets.durationS} end)`,
      maxReps: sql<number | null>`max(case when ${ok} then ${sessionSets.reps} end)`,
      maxCalories: sql<number | null>`max(case when ${ok} then ${sessionSets.calories} end)`,
      maxCarryKg: sql<number | null>`max(case when ${ok} then ${sessionSets.weightKg} end)`,
    })
    .from(sessionSets)
    .where(and(eq(sessionSets.userId, userId), isNull(sessionSets.deletedAt)))
    .groupBy(sessionSets.exerciseId, sessionSets.sessionId);

/** Séries d'un exercice avec leur séance, de la plus récente à la plus ancienne (détail). */
export const exerciseHistoryQuery = (db: AppDatabase, exerciseId: string) =>
  db
    .select({
      id: sessionSets.id,
      sessionId: sessionSets.sessionId,
      sessionName: sessions.name,
      startedAt: sessions.startedAt,
      setNumber: sessionSets.setNumber,
      weightKg: sessionSets.weightKg,
      reps: sessionSets.reps,
      difficulty: sessionSets.difficulty,
      completedAt: sessionSets.completedAt,
      distanceM: sessionSets.distanceM,
      durationS: sessionSets.durationS,
      calories: sessionSets.calories,
    })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessions.id, sessionSets.sessionId))
    .where(
      and(
        eq(sessionSets.exerciseId, exerciseId),
        isNull(sessionSets.deletedAt),
        isNull(sessions.deletedAt),
      ),
    )
    .orderBy(desc(sessions.startedAt), asc(sessionSets.setNumber));

export type ExerciseHistoryRow = ReturnType<ReturnType<typeof exerciseHistoryQuery>['all']>[number];

export type HistorySession = {
  sessionId: string;
  sessionName: string;
  startedAt: string;
  sets: ExerciseHistoryRow[];
};

/** Regroupe l'historique par séance, dans l'ordre de la requête. */
export function groupHistory(rows: readonly ExerciseHistoryRow[]): HistorySession[] {
  const groups: HistorySession[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last?.sessionId === row.sessionId) {
      last.sets.push(row);
    } else {
      groups.push({
        sessionId: row.sessionId,
        sessionName: row.sessionName,
        startedAt: row.startedAt,
        sets: [row],
      });
    }
  }
  return groups;
}
