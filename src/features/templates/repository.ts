import { and, asc, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import {
  templateExercises,
  workoutTemplates,
  type TemplateExercise,
  type WorkoutTemplate,
} from '@/db/schema';
import { nowIso } from '@/db/time';
import { newId } from '@/lib/id';
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
  db.transaction((tx) => {
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
  });
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
