import { and, asc, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { exercises, profiles } from '@/db/schema';
import { DEFAULT_EXERCISES } from '@/db/seed';
import { nowIso } from '@/db/time';
import { ensureCatalogExercises } from '@/features/exercises/catalog';
import { ensureStrengthBlocks } from '@/features/templates/blocks';
import { enqueue, type Tx } from '@/sync/outbox';

/**
 * Exercices par défaut d'un compte V1 (créés sans `catalog_key`) : on leur donne leur clé en les
 * retrouvant par leur nom d'origine. Un exercice renommé n'est pas reconnu (il reste « perso »).
 */
function tagDefaultExercises(tx: Tx, userId: string): number {
  let changed = 0;
  for (const seed of DEFAULT_EXERCISES) {
    const tagged = tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.userId, userId), eq(exercises.catalogKey, seed.catalogKey)))
      .get();
    if (tagged) continue;
    const match = tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, userId),
          eq(exercises.name, seed.name),
          isNull(exercises.catalogKey),
          isNull(exercises.deletedAt),
        ),
      )
      .orderBy(asc(exercises.createdAt))
      .get();
    if (!match) continue;
    tx.update(exercises)
      .set({ catalogKey: seed.catalogKey, updatedAt: nowIso(), dirty: true })
      .where(eq(exercises.id, match.id))
      .run();
    enqueue(tx, 'exercises', match.id, 'upsert');
    changed++;
  }
  return changed;
}

/**
 * Mise à niveau V2 des données locales, idempotente (SPEC_V2 §3 et §4.3) : lancée après chaque
 * pull, pour reprendre aussi les données créées par une ancienne version sur un autre appareil.
 * Retourne le nombre de lignes modifiées (à envoyer).
 */
export function upgradeLocalData(db: AppDatabase, userId: string): number {
  return db.transaction((tx) => {
    const profile = tx
      .select({ disciplines: profiles.disciplines })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .get();
    // La muscu a déjà sa bibliothèque (onboarding V1) ; les autres disciplines reçoivent leur
    // catalogue quand elles sont choisies.
    const extra = (profile?.disciplines ?? []).filter((d) => d !== 'strength');
    return (
      tagDefaultExercises(tx, userId) +
      ensureStrengthBlocks(tx, userId) +
      ensureCatalogExercises(tx, userId, extra)
    );
  });
}
