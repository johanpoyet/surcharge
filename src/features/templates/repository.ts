import { and, asc, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import {
  exercises,
  templateExercises,
  weeklySchedule,
  workoutTemplates,
  type TemplateExercise,
  type WorkoutTemplate,
} from '@/db/schema';
import { nowIso } from '@/db/time';
import { newId } from '@/lib/id';
import { assignWeekday, weekdaysForTemplate } from '@/features/planning/repository';
import { enqueue, type Tx } from '@/sync/outbox';

export type TemplateExerciseInput = {
  /** Présent pour une ligne existante (modification), absent pour un ajout. */
  id?: string;
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  restSeconds: number;
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
        .values({ ...values, id, userId, templateId, createdAt: now })
        .run();
    }
    enqueue(tx, 'template_exercises', id, 'upsert');
  });
}

export type TemplateDraft = {
  /** Absent pour une nouvelle séance type. */
  id?: string;
  name: string;
  items: readonly TemplateExerciseInput[];
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
      replaceItems(tx, userId, id, draft.items);
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
      writeItems(tx, userId, id, draft.items);
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

/** Copie une séance type (sans ses jours au planning). */
export function duplicateTemplate(
  db: AppDatabase,
  userId: string,
  id: string,
  name: string,
): string {
  const items = listTemplateExercises(db, id).map((item) => ({
    exerciseId: item.exerciseId,
    targetSets: item.targetSets,
    targetRepsMin: item.targetRepsMin,
    targetRepsMax: item.targetRepsMax,
    restSeconds: item.restSeconds,
  }));
  return saveTemplate(db, userId, { name, items, weekdays: [] });
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
    })
    .from(templateExercises)
    .innerJoin(exercises, eq(exercises.id, templateExercises.exerciseId))
    .where(and(eq(templateExercises.userId, userId), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.templateId), asc(templateExercises.position));

export type TemplateItemRow = ReturnType<ReturnType<typeof templateItemsQuery>['all']>[number];

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
