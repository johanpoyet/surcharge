import { and, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { exercises, workoutTemplates } from '@/db/schema';
import {
  BASE_EXERCISES,
  CROSS_TRAINING_EXERCISES,
  RUNNING_EXERCISES,
  type SeedExercise,
} from '@/db/seed';
import { nowIso } from '@/db/time';
import { insertCatalogExercise } from '@/features/exercises/catalog';
import { HYROX_EXERCISES } from '@/features/hyrox/catalog';
import { enqueue } from '@/sync/outbox';
import type { EstimateBlock } from './estimate';
import type { Preset } from './presets';
import { saveTemplate, type BlockInput } from './repository';

/** Tous les exercices du catalogue, par clé. */
export const CATALOG_BY_KEY: ReadonlyMap<string, SeedExercise> = new Map(
  [...BASE_EXERCISES, ...RUNNING_EXERCISES, ...CROSS_TRAINING_EXERCISES, ...HYROX_EXERCISES].map(
    (seed) => [seed.catalogKey, seed],
  ),
);

/** Blocs d'une séance toute prête pour l'estimation de durée (§4.6). */
export function presetEstimateBlocks(preset: Preset): EstimateBlock[] {
  return preset.blocks.map((block) => ({
    type: block.type,
    config: block.config ?? {},
    items: (block.items ?? []).map((item) => ({
      targetSets: item.sets,
      restSeconds: item.restS ?? 90,
      targetDistanceM: item.distanceM ?? null,
      targetDurationS: item.durationS ?? null,
      running: CATALOG_BY_KEY.get(item.key)?.discipline === 'running',
    })),
  }));
}

/** Nom libre parmi les séances types actives : « Push », sinon « Push 2 », « Push 3 »… */
export function uniqueName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  for (let n = 2; ; n++) if (!taken.has(`${name} ${n}`)) return `${name} ${n}`;
}

/**
 * Copie une séance toute prête dans les séances de l'utilisateur (modifiable ensuite comme
 * n'importe quelle séance type). Les exercices du catalogue manquants sont ajoutés à sa
 * bibliothèque, ceux qu'il avait supprimés sont restaurés. Retourne l'id de la séance type.
 */
export function addPreset(db: AppDatabase, userId: string, preset: Preset): string {
  const ids = new Map<string, string>();
  db.transaction((tx) => {
    for (const key of new Set(preset.blocks.flatMap((b) => (b.items ?? []).map((i) => i.key)))) {
      const rows = tx
        .select({ id: exercises.id, deletedAt: exercises.deletedAt })
        .from(exercises)
        .where(and(eq(exercises.userId, userId), eq(exercises.catalogKey, key)))
        .all();
      const active = rows.find((r) => !r.deletedAt);
      if (active) {
        ids.set(key, active.id);
      } else if (rows[0]) {
        const now = nowIso();
        tx.update(exercises)
          .set({ deletedAt: null, updatedAt: now, dirty: true })
          .where(eq(exercises.id, rows[0].id))
          .run();
        enqueue(tx, 'exercises', rows[0].id, 'upsert');
        ids.set(key, rows[0].id);
      } else {
        const seed = CATALOG_BY_KEY.get(key);
        if (!seed) throw new Error(`Exercice inconnu du catalogue : ${key}`);
        ids.set(key, insertCatalogExercise(tx, userId, seed));
      }
    }
  });

  const taken = new Set(
    db
      .select({ name: workoutTemplates.name })
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.userId, userId), isNull(workoutTemplates.deletedAt)))
      .all()
      .map((t) => t.name),
  );
  const blocks: BlockInput[] = preset.blocks.map((block) => ({
    type: block.type,
    name: block.name ?? null,
    config: block.config ?? {},
    items: (block.items ?? []).map((item) => ({
      exerciseId: ids.get(item.key)!,
      targetSets: item.sets,
      targetRepsMin: item.reps?.[0] ?? null,
      targetRepsMax: item.reps?.[1] ?? null,
      restSeconds: item.restS ?? 90,
      targetDistanceM: item.distanceM ?? null,
      targetDurationS: item.durationS ?? null,
      targetCalories: item.calories ?? null,
    })),
  }));
  return saveTemplate(db, userId, {
    name: uniqueName(preset.name, taken),
    weekdays: [],
    blocks,
  });
}
