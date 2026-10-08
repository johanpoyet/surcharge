import { eq } from 'drizzle-orm';

import { exercises, type Discipline } from '@/db/schema';
import {
  BASE_EXERCISES,
  CROSS_TRAINING_EXERCISES,
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
      // Muscu et machines de cardio : la base de tous les comptes.
      return BASE_EXERCISES;
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

const normalized = (name: string) => name.trim().toLowerCase();

/**
 * Ajoute les exercices du catalogue des disciplines données qui manquent encore. Un exercice du
 * catalogue supprimé par l'utilisateur n'est pas remis. Un exercice perso du même nom (même
 * supprimé) n'est pas doublé : il est rattaché au catalogue. Retourne le nombre de lignes ajoutées
 * ou rattachées (à envoyer).
 */
export function ensureCatalogExercises(
  tx: Tx,
  userId: string,
  disciplines: readonly Discipline[],
): number {
  let added = 0;
  const rows = tx
    .select({ id: exercises.id, name: exercises.name, catalogKey: exercises.catalogKey })
    .from(exercises)
    .where(eq(exercises.userId, userId))
    .all();
  const keys = new Set(rows.flatMap((r) => (r.catalogKey ? [r.catalogKey] : [])));
  // Exercices perso (sans clé) par nom : l'ajout du catalogue ne les double pas.
  const custom = new Map(
    rows.filter((r) => !r.catalogKey).map((r) => [normalized(r.name), r.id] as const),
  );
  for (const discipline of new Set(disciplines)) {
    for (const seed of catalogFor(discipline)) {
      if (keys.has(seed.catalogKey)) continue;
      keys.add(seed.catalogKey);
      const sameName = custom.get(normalized(seed.name));
      if (sameName) {
        custom.delete(normalized(seed.name));
        tx.update(exercises)
          .set({ catalogKey: seed.catalogKey, updatedAt: nowIso(), dirty: true })
          .where(eq(exercises.id, sameName))
          .run();
        enqueue(tx, 'exercises', sameName, 'upsert');
        added++;
        continue;
      }
      insertCatalogExercise(tx, userId, seed);
      added++;
    }
  }
  return added;
}
