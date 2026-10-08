/**
 * @jest-environment node
 */
import { and, eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { exercises } from '@/db/schema';
import { seedDefaultExercises } from '@/features/exercises/repository';
import { createTestDb } from '@/test/testDb';
import { addPreset, CATALOG_BY_KEY, presetEstimateBlocks, uniqueName } from '../addPreset';
import { estimateTemplateMinutes } from '../estimate';
import { PRESETS } from '../presets';
import { listTemplateBlocks, listTemplates } from '../repository';

const USER = '11111111-1111-1111-1111-111111111111';
let db: AppDatabase;
beforeEach(async () => {
  db = await createTestDb();
  seedDefaultExercises(db, USER);
});

const preset = (key: string) => PRESETS.find((p) => p.key === key)!;

it('chaque séance toute prête n’utilise que des exercices du catalogue, avec une durée', () => {
  for (const p of PRESETS) {
    for (const item of p.blocks.flatMap((b) => b.items ?? [])) {
      expect([p.key, CATALOG_BY_KEY.has(item.key)]).toEqual([p.key, true]);
    }
    expect(estimateTemplateMinutes(presetEstimateBlocks(p))).toBeGreaterThan(0);
  }
  expect(new Set(PRESETS.map((p) => p.key)).size).toBe(PRESETS.length);
});

it('ajoute une copie modifiable : blocs, exercices de la bibliothèque, cibles', () => {
  const id = addPreset(db, USER, preset('run_intervals_400'));
  const [warmup, cardio] = listTemplateBlocks(db, id);
  expect(warmup?.type).toBe('warmup');
  expect(cardio?.items[0]).toMatchObject({ targetSets: 10, targetDistanceM: 400, restSeconds: 90 });
  // L'exercice de course manquant a été ajouté à la bibliothèque.
  const run = db
    .select()
    .from(exercises)
    .where(and(eq(exercises.userId, USER), eq(exercises.catalogKey, 'run_intervals')))
    .get();
  expect(run?.id).toBe(cardio?.items[0]?.exerciseId);
});

it('réutilise les exercices existants et restaure un exercice supprimé', () => {
  const squat = db.select().from(exercises).where(eq(exercises.catalogKey, 'squat')).get()!;
  db.update(exercises)
    .set({ deletedAt: '2026-10-01T00:00:00.000Z' })
    .where(eq(exercises.id, squat.id))
    .run();
  const id = addPreset(db, USER, preset('legs'));
  const [block] = listTemplateBlocks(db, id);
  expect(block?.items[0]?.exerciseId).toBe(squat.id);
  expect(db.select().from(exercises).where(eq(exercises.id, squat.id)).get()?.deletedAt).toBeNull();
});

it('deux ajouts de la même séance : deux séances distinctes, noms uniques', () => {
  addPreset(db, USER, preset('push'));
  addPreset(db, USER, preset('push'));
  expect(listTemplates(db, USER).map((t) => t.name)).toEqual(['Push', 'Push 2']);
  expect(uniqueName('Push', new Set(['Push', 'Push 2']))).toBe('Push 3');
});
