import { and, asc, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import {
  exercises,
  templateBlocks,
  templateExercises,
  weeklySchedule,
  workoutTemplates,
  type BlockType,
  type JsonObject,
  type TemplateExercise,
  type WorkoutTemplate,
} from '@/db/schema';
import { nowIso } from '@/db/time';
import { newId } from '@/lib/id';
import { ensureCatalogExercises } from '@/features/exercises/catalog';
import { assignWeekday, weekdaysForTemplate } from '@/features/planning/repository';
import { enqueue, type Tx } from '@/sync/outbox';

import { strengthBlockFor } from './blocks';

export type TemplateExerciseInput = {
  /** Présent pour une ligne existante (modification), absent pour un ajout. */
  id?: string;
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  restSeconds: number;
  /** Cibles des types de suivi V2 (cardio, circuit). */
  targetDistanceM?: number | null;
  targetDurationS?: number | null;
  targetCalories?: number | null;
  targetWeightKg?: number | null;
};

/** Bloc d'une séance type à enregistrer (SPEC_V2 §3), dans l'ordre de la séance. */
export type BlockInput = {
  /** Présent pour un bloc existant. */
  id?: string;
  type: BlockType;
  name: string | null;
  config: JsonObject;
  /** Exercices du bloc (aucun pour un bloc Hyrox : ses segments viennent du catalogue). */
  items: readonly TemplateExerciseInput[];
};

export function createTemplate(
  db: AppDatabase,
  userId: string,
  name: string,
  items: readonly TemplateExerciseInput[],
): string {
  const id = newId();
  const now = nowIso();
  db.transaction((tx) => {
    const position = tx
      .select({ id: workoutTemplates.id })
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.userId, userId), isNull(workoutTemplates.deletedAt)))
      .all().length;
    tx.insert(workoutTemplates)
      .values({
        id,
        userId,
        name: name.trim(),
        position,
        createdAt: now,
        updatedAt: now,
        dirty: true,
      })
      .run();
    enqueue(tx, 'workout_templates', id, 'upsert');
    strengthBlockFor(tx, userId, id);
    writeItems(tx, userId, id, items);
  });
  return id;
}

export function renameTemplate(db: AppDatabase, id: string, name: string): void {
  db.transaction((tx) => {
    tx.update(workoutTemplates)
      .set({ name: name.trim(), updatedAt: nowIso(), dirty: true })
      .where(eq(workoutTemplates.id, id))
      .run();
    enqueue(tx, 'workout_templates', id, 'upsert');
  });
}

/**
 * Remplace la liste d'exercices d'une séance type : met à jour les lignes gardées (ordre = index),
 * ajoute les nouvelles et supprime (doucement) celles retirées.
 */
export function setTemplateExercises(
  db: AppDatabase,
  userId: string,
  templateId: string,
  items: readonly TemplateExerciseInput[],
): void {
  db.transaction((tx) => replaceItems(tx, userId, templateId, items));
}

export function deleteTemplate(db: AppDatabase, id: string): void {
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(workoutTemplates)
      .set({ deletedAt: now, updatedAt: now, dirty: true })
      .where(eq(workoutTemplates.id, id))
      .run();
    enqueue(tx, 'workout_templates', id, 'delete');
    for (const row of activeItems(tx, id)) {
      tx.update(templateExercises)
        .set({ deletedAt: now, updatedAt: now, dirty: true })
        .where(eq(templateExercises.id, row.id))
        .run();
      enqueue(tx, 'template_exercises', row.id, 'delete');
    }
    const blocks = tx
      .select({ id: templateBlocks.id })
      .from(templateBlocks)
      .where(and(eq(templateBlocks.templateId, id), isNull(templateBlocks.deletedAt)))
      .all();
    for (const block of blocks) {
      tx.update(templateBlocks)
        .set({ deletedAt: now, updatedAt: now, dirty: true })
        .where(eq(templateBlocks.id, block.id))
        .run();
      enqueue(tx, 'template_blocks', block.id, 'delete');
    }
    // Les jours où elle était prévue redeviennent des jours de repos.
    const template = tx
      .select({ userId: workoutTemplates.userId })
      .from(workoutTemplates)
      .where(eq(workoutTemplates.id, id))
      .get();
    if (template) {
      for (const weekday of weekdaysForTemplate(tx, template.userId, id)) {
        assignWeekday(tx, template.userId, weekday, null);
      }
    }
  });
}

export function listTemplates(db: AppDatabase, userId: string): WorkoutTemplate[] {
  return db
    .select()
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.userId, userId), isNull(workoutTemplates.deletedAt)))
    .orderBy(asc(workoutTemplates.position), asc(workoutTemplates.createdAt))
    .all();
}

export function listTemplateExercises(db: AppDatabase, templateId: string): TemplateExercise[] {
  return activeItems(db, templateId);
}

function activeItems(tx: Tx, templateId: string): TemplateExercise[] {
  return tx
    .select()
    .from(templateExercises)
    .where(and(eq(templateExercises.templateId, templateId), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.position))
    .all();
}

function writeItems(
  tx: Tx,
  userId: string,
  templateId: string,
  items: readonly TemplateExerciseInput[],
): void {
  const now = nowIso();
  // Éditeur V1 : tous les exercices vont dans le bloc Musculation de la séance type.
  const blockId = items.some((item) => !item.id) ? strengthBlockFor(tx, userId, templateId) : null;
  items.forEach((item, position) => {
    const values = {
      exerciseId: item.exerciseId,
      position,
      targetSets: item.targetSets,
      targetRepsMin: item.targetRepsMin,
      targetRepsMax: item.targetRepsMax,
      restSeconds: item.restSeconds,
      updatedAt: now,
      dirty: true,
    };
    const id = item.id ?? newId();
    if (item.id) {
      tx.update(templateExercises).set(values).where(eq(templateExercises.id, id)).run();
    } else {
      tx.insert(templateExercises)
        .values({ ...values, id, userId, templateId, blockId, createdAt: now })
        .run();
    }
    enqueue(tx, 'template_exercises', id, 'upsert');
  });
}

export type TemplateDraft = {
  /** Absent pour une nouvelle séance type. */
  id?: string;
  name: string;
  /** Séance type en blocs (V2). Sinon, `items` : un seul bloc Musculation (API V1). */
  blocks?: readonly BlockInput[];
  items?: readonly TemplateExerciseInput[];
  /** Jours au planning (1 = lundi … 7 = dimanche). */
  weekdays: readonly number[];
};

/**
 * Enregistre une séance type en une transaction : nom, exercices dans l'ordre et jours au modèle
 * de semaine. Un jour déjà pris par une autre séance type lui est réattribué.
 */
export function saveTemplate(db: AppDatabase, userId: string, draft: TemplateDraft): string {
  return db.transaction((tx) => {
    const now = nowIso();
    let id = draft.id;
    if (id) {
      tx.update(workoutTemplates)
        .set({ name: draft.name.trim(), updatedAt: now, dirty: true })
        .where(eq(workoutTemplates.id, id))
        .run();
      enqueue(tx, 'workout_templates', id, 'upsert');
      if (draft.blocks) replaceBlocks(tx, userId, id, draft.blocks);
      else replaceItems(tx, userId, id, draft.items ?? []);
    } else {
      id = newId();
      const position = tx
        .select({ id: workoutTemplates.id })
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.userId, userId), isNull(workoutTemplates.deletedAt)))
        .all().length;
      tx.insert(workoutTemplates)
        .values({
          id,
          userId,
          name: draft.name.trim(),
          position,
          createdAt: now,
          updatedAt: now,
          dirty: true,
        })
        .run();
      enqueue(tx, 'workout_templates', id, 'upsert');
      if (draft.blocks) {
        replaceBlocks(tx, userId, id, draft.blocks);
      } else {
        strengthBlockFor(tx, userId, id);
        writeItems(tx, userId, id, draft.items ?? []);
      }
    }

    const templateId = id;
    const wanted = new Set(draft.weekdays);
    for (const weekday of weekdaysForTemplate(tx, userId, templateId)) {
      if (!wanted.has(weekday)) assignWeekday(tx, userId, weekday, null);
    }
    for (const weekday of wanted) assignWeekday(tx, userId, weekday, templateId);
    return templateId;
  });
}

/** Copie une séance type avec ses blocs (sans ses jours au planning). */
export function duplicateTemplate(
  db: AppDatabase,
  userId: string,
  id: string,
  name: string,
): string {
  const blocks = listTemplateBlocks(db, id).map((block) => ({
    type: block.type,
    name: block.name,
    config: block.config,
    items: block.items.map(({ id: _id, ...item }) => item),
  }));
  return saveTemplate(db, userId, { name, blocks, weekdays: [] });
}

/** Bloc relu pour l'éditeur, avec ses exercices dans l'ordre. */
export type LoadedBlock = {
  /** Absent pour un bloc Musculation pas encore créé (exercices d'une ancienne version). */
  id?: string;
  type: BlockType;
  name: string | null;
  config: JsonObject;
  items: (TemplateExerciseInput & { id: string })[];
};

const toInput = (row: TemplateExercise): TemplateExerciseInput & { id: string } => ({
  id: row.id,
  exerciseId: row.exerciseId,
  targetSets: row.targetSets,
  targetRepsMin: row.targetRepsMin,
  targetRepsMax: row.targetRepsMax,
  restSeconds: row.restSeconds,
  targetDistanceM: row.targetDistanceM,
  targetDurationS: row.targetDurationS,
  targetCalories: row.targetCalories,
  targetWeightKg: row.targetWeightKg,
});

/**
 * Blocs d'une séance type, dans l'ordre, avec leurs exercices. Un exercice sans bloc (ajouté par
 * une ancienne version, pas encore repris) va dans le premier bloc Musculation.
 */
export function listTemplateBlocks(db: AppDatabase, templateId: string): LoadedBlock[] {
  const blocks: LoadedBlock[] = db
    .select()
    .from(templateBlocks)
    .where(and(eq(templateBlocks.templateId, templateId), isNull(templateBlocks.deletedAt)))
    .orderBy(asc(templateBlocks.position))
    .all()
    .map((block) => ({
      id: block.id,
      type: block.type,
      name: block.name,
      config: block.config,
      items: [],
    }));
  const byId = new Map(blocks.flatMap((b) => (b.id ? [[b.id, b]] : [])));
  const orphans: LoadedBlock['items'] = [];
  for (const row of activeItems(db, templateId)) {
    const block = row.blockId ? byId.get(row.blockId) : undefined;
    if (block) block.items.push(toInput(row));
    else orphans.push(toInput(row));
  }
  if (orphans.length > 0) {
    const strength = blocks.find((b) => b.type === 'strength');
    if (strength) strength.items.push(...orphans);
    else blocks.push({ type: 'strength', name: null, config: {}, items: orphans });
  }
  return blocks;
}

/**
 * Ajoute un bloc à la fin d'une séance type (récap Hyrox : bloc dédié au point faible,
 * SPEC_V2 §5.4). Retourne l'id du bloc.
 */
export function appendTemplateBlock(
  db: AppDatabase,
  userId: string,
  templateId: string,
  block: { type: BlockType; name: string | null; config: JsonObject },
): string {
  const id = newId();
  const now = nowIso();
  db.transaction((tx) => {
    const position = tx
      .select({ id: templateBlocks.id })
      .from(templateBlocks)
      .where(and(eq(templateBlocks.templateId, templateId), isNull(templateBlocks.deletedAt)))
      .all().length;
    tx.insert(templateBlocks)
      .values({
        ...block,
        id,
        userId,
        templateId,
        position,
        createdAt: now,
        updatedAt: now,
        dirty: true,
      })
      .run();
    enqueue(tx, 'template_blocks', id, 'upsert');
    tx.update(workoutTemplates)
      .set({ updatedAt: now, dirty: true })
      .where(eq(workoutTemplates.id, templateId))
      .run();
    enqueue(tx, 'workout_templates', templateId, 'upsert');
  });
  return id;
}

export function getTemplate(db: AppDatabase, id: string): WorkoutTemplate | undefined {
  return db.select().from(workoutTemplates).where(eq(workoutTemplates.id, id)).get();
}

export function templateWeekdays(db: AppDatabase, userId: string, id: string): number[] {
  return weekdaysForTemplate(db, userId, id);
}

/** Lignes d'une séance type avec leur exercice (éditeur, liste « Mes séances »). */
export const templateItemsQuery = (db: AppDatabase, userId: string) =>
  db
    .select({
      id: templateExercises.id,
      templateId: templateExercises.templateId,
      exerciseId: templateExercises.exerciseId,
      position: templateExercises.position,
      targetSets: templateExercises.targetSets,
      targetRepsMin: templateExercises.targetRepsMin,
      targetRepsMax: templateExercises.targetRepsMax,
      restSeconds: templateExercises.restSeconds,
      exerciseName: exercises.name,
      muscle: exercises.muscle,
      photoLocalUri: exercises.photoLocalUri,
      blockId: templateExercises.blockId,
      targetDistanceM: templateExercises.targetDistanceM,
      targetDurationS: templateExercises.targetDurationS,
      discipline: exercises.discipline,
    })
    .from(templateExercises)
    .innerJoin(exercises, eq(exercises.id, templateExercises.exerciseId))
    .where(and(eq(templateExercises.userId, userId), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.templateId), asc(templateExercises.position));

export type TemplateItemRow = ReturnType<ReturnType<typeof templateItemsQuery>['all']>[number];

/** Blocs actifs des séances types de l'utilisateur (durée estimée, résumés). */
export const templateBlocksQuery = (db: AppDatabase, userId: string) =>
  db
    .select({
      id: templateBlocks.id,
      templateId: templateBlocks.templateId,
      type: templateBlocks.type,
      config: templateBlocks.config,
    })
    .from(templateBlocks)
    .where(and(eq(templateBlocks.userId, userId), isNull(templateBlocks.deletedAt)))
    .orderBy(asc(templateBlocks.templateId), asc(templateBlocks.position));

export type TemplateBlockRow = ReturnType<ReturnType<typeof templateBlocksQuery>['all']>[number];

export const activeTemplatesQuery = (db: AppDatabase, userId: string) =>
  db
    .select()
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.userId, userId), isNull(workoutTemplates.deletedAt)))
    .orderBy(asc(workoutTemplates.position), asc(workoutTemplates.createdAt));

export const weeklyScheduleQuery = (db: AppDatabase, userId: string) =>
  db
    .select({ weekday: weeklySchedule.weekday, templateId: weeklySchedule.templateId })
    .from(weeklySchedule)
    .where(and(eq(weeklySchedule.userId, userId), isNull(weeklySchedule.deletedAt)));

function softDeleteItem(tx: Tx, id: string, now: string): void {
  tx.update(templateExercises)
    .set({ deletedAt: now, updatedAt: now, dirty: true })
    .where(eq(templateExercises.id, id))
    .run();
  enqueue(tx, 'template_exercises', id, 'delete');
}

/**
 * Remplace les blocs d'une séance type : met à jour ceux gardés (ordre = index), ajoute les
 * nouveaux, supprime (doucement) les blocs retirés et leurs exercices. Les positions des exercices
 * se suivent d'un bloc à l'autre : une ancienne version les affiche dans l'ordre de la séance.
 */
function replaceBlocks(
  tx: Tx,
  userId: string,
  templateId: string,
  blocks: readonly BlockInput[],
): void {
  const now = nowIso();
  const keptBlocks = new Set(blocks.flatMap((b) => (b.id ? [b.id] : [])));
  const keptItems = new Set(blocks.flatMap((b) => b.items.flatMap((i) => (i.id ? [i.id] : []))));

  for (const block of tx
    .select({ id: templateBlocks.id })
    .from(templateBlocks)
    .where(and(eq(templateBlocks.templateId, templateId), isNull(templateBlocks.deletedAt)))
    .all()) {
    if (keptBlocks.has(block.id)) continue;
    tx.update(templateBlocks)
      .set({ deletedAt: now, updatedAt: now, dirty: true })
      .where(eq(templateBlocks.id, block.id))
      .run();
    enqueue(tx, 'template_blocks', block.id, 'delete');
  }
  for (const row of activeItems(tx, templateId)) {
    if (!keptItems.has(row.id)) softDeleteItem(tx, row.id, now);
  }

  let position = 0;
  blocks.forEach((block, index) => {
    const values = {
      position: index,
      type: block.type,
      name: block.name?.trim() || null,
      config: block.config,
      deletedAt: null,
      updatedAt: now,
      dirty: true,
    };
    const blockId = block.id ?? newId();
    if (block.id) {
      tx.update(templateBlocks).set(values).where(eq(templateBlocks.id, blockId)).run();
    } else {
      tx.insert(templateBlocks)
        .values({ ...values, id: blockId, userId, templateId, createdAt: now })
        .run();
    }
    enqueue(tx, 'template_blocks', blockId, 'upsert');
    for (const item of block.items) {
      writeItem(tx, userId, templateId, blockId, item, position++, now);
    }
  });

  // Les segments Hyrox s'appuient sur les exercices du catalogue Hyrox.
  if (blocks.some((b) => b.type === 'hyrox')) ensureCatalogExercises(tx, userId, ['hyrox']);
}

function writeItem(
  tx: Tx,
  userId: string,
  templateId: string,
  blockId: string,
  item: TemplateExerciseInput,
  position: number,
  now: string,
): void {
  const values = {
    exerciseId: item.exerciseId,
    blockId,
    position,
    targetSets: item.targetSets,
    targetRepsMin: item.targetRepsMin,
    targetRepsMax: item.targetRepsMax,
    restSeconds: item.restSeconds,
    targetDistanceM: item.targetDistanceM ?? null,
    targetDurationS: item.targetDurationS ?? null,
    targetCalories: item.targetCalories ?? null,
    targetWeightKg: item.targetWeightKg ?? null,
    deletedAt: null,
    updatedAt: now,
    dirty: true,
  };
  const id = item.id ?? newId();
  if (item.id) {
    tx.update(templateExercises).set(values).where(eq(templateExercises.id, id)).run();
  } else {
    tx.insert(templateExercises)
      .values({ ...values, id, userId, templateId, createdAt: now })
      .run();
  }
  enqueue(tx, 'template_exercises', id, 'upsert');
}

function replaceItems(
  tx: Tx,
  userId: string,
  templateId: string,
  items: readonly TemplateExerciseInput[],
): void {
  const kept = new Set(items.flatMap((item) => (item.id ? [item.id] : [])));
  const now = nowIso();
  for (const row of activeItems(tx, templateId)) {
    if (kept.has(row.id)) continue;
    tx.update(templateExercises)
      .set({ deletedAt: now, updatedAt: now, dirty: true })
      .where(eq(templateExercises.id, row.id))
      .run();
    enqueue(tx, 'template_exercises', row.id, 'delete');
  }
  writeItems(tx, userId, templateId, items);
}
