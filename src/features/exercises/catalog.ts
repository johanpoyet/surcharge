import { and, eq } from 'drizzle-orm';

import { exercises, type Discipline } from '@/db/schema';
import {
  CROSS_TRAINING_EXERCISES,
  DEFAULT_EXERCISES,
  defaultWeightStep,
  RUNNING_EXERCISES,
  type SeedExercise,
} from '@/db/seed';
import { nowIso } from '@/db/time';
import { HYROX_EXERCISES } from '@/features/hyrox/catalog';
import { stableId } from '@/lib/stableId';
import { enqueue, type Tx } from '@/sync/outbox';

/** Exercices du catalogue proposés pour une discipline (SPEC_V2 §4.3 et §5.5). */
export function catalogFor(discipline: Discipline): readonly SeedExercise[] {
  switch (discipline) {
    case 'strength':
      return DEFAULT_EXERCISES;
    case 'running':
      return RUNNING_EXERCISES;
    case 'cross_training':
      return CROSS_TRAINING_EXERCISES;
    case 'hyrox':
      return HYROX_EXERCISES;
    case 'other':
      return [];
  }
}

/**
 * Identifiant d'un exercice du catalogue pour un compte : le même sur tous les appareils, pour
 * que deux ajouts hors ligne du même exercice ne créent pas de doublon.
 */
export const catalogExerciseId = (userId: string, catalogKey: string): string =>
  stableId(userId, 'exercise', catalogKey);

/** Ajoute un exercice du catalogue (sans vérifier s'il existe déjà). */
export function insertCatalogExercise(tx: Tx, userId: string, seed: SeedExercise): string {
  const id = catalogExerciseId(userId, seed.catalogKey);
  const now = nowIso();
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
    .onConflictDoNothing({ target: exercises.id })
    .run();
  enqueue(tx, 'exercises', id, 'upsert');
  return id;
}

/**
 * Ajoute les exercices du catalogue des disciplines données qui manquent encore. Un exercice du
 * catalogue supprimé par l'utilisateur n'est pas remis. Retourne le nombre d'exercices ajoutés.
 */
export function ensureCatalogExercises(
  tx: Tx,
  userId: string,
  disciplines: readonly Discipline[],
): number {
  let added = 0;
  for (const discipline of disciplines) {
    for (const seed of catalogFor(discipline)) {
      const existing = tx
        .select({ id: exercises.id })
        .from(exercises)
        .where(and(eq(exercises.userId, userId), eq(exercises.catalogKey, seed.catalogKey)))
        .get();
      if (existing) continue;
      insertCatalogExercise(tx, userId, seed);
      added++;
    }
  }
  return added;
}
