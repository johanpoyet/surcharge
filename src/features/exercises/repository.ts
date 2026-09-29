import { and, asc, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { exercises, type Equipment, type Exercise, type MuscleGroup } from '@/db/schema';
import { DEFAULT_EXERCISES, defaultWeightStep } from '@/db/seed';
import { nowIso } from '@/db/time';
import { newId } from '@/lib/id';
import { enqueue } from '@/sync/outbox';

export type ExerciseInput = {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  weightStep?: number;
  note?: string | null;
  photoLocalUri?: string | null;
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
    tx.update(exercises)
      .set({
        ...patch,
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        updatedAt: nowIso(),
        dirty: true,
      })
      .where(eq(exercises.id, id))
      .run();
    enqueue(tx, 'exercises', id, 'upsert');
  });
}

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

    const now = nowIso();
    for (const seed of DEFAULT_EXERCISES) {
      const id = newId();
      tx.insert(exercises)
        .values({
          id,
          userId,
          name: seed.name,
          muscle: seed.muscle,
          equipment: seed.equipment,
          weightStep: defaultWeightStep(seed.equipment),
          createdAt: now,
          updatedAt: now,
          dirty: true,
        })
        .run();
      enqueue(tx, 'exercises', id, 'upsert');
    }
    return DEFAULT_EXERCISES.length;
  });
}
