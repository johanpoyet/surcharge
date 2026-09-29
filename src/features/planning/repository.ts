import { and, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { scheduleOverrides, weeklySchedule } from '@/db/schema';
import { nowIso } from '@/db/time';
import { toLocalDateString } from '@/lib/format';
import { newId } from '@/lib/id';
import { enqueue } from '@/sync/outbox';
import { isoWeekday, resolveTemplateId } from './resolve';

/** Modèle de semaine : `templateId` null retire la séance de ce jour. */
export function setWeekdayTemplate(
  db: AppDatabase,
  userId: string,
  weekday: number,
  templateId: string | null,
): void {
  const now = nowIso();
  db.transaction((tx) => {
    const existing = tx
      .select({ id: weeklySchedule.id })
      .from(weeklySchedule)
      .where(
        and(
          eq(weeklySchedule.userId, userId),
          eq(weeklySchedule.weekday, weekday),
          isNull(weeklySchedule.deletedAt),
        ),
      )
      .get();

    if (templateId === null) {
      if (!existing) return;
      tx.update(weeklySchedule)
        .set({ deletedAt: now, updatedAt: now, dirty: true })
        .where(eq(weeklySchedule.id, existing.id))
        .run();
      enqueue(tx, 'weekly_schedule', existing.id, 'delete');
    } else if (existing) {
      tx.update(weeklySchedule)
        .set({ templateId, updatedAt: now, dirty: true })
        .where(eq(weeklySchedule.id, existing.id))
        .run();
      enqueue(tx, 'weekly_schedule', existing.id, 'upsert');
    } else {
      const id = newId();
      tx.insert(weeklySchedule)
        .values({ id, userId, weekday, templateId, createdAt: now, updatedAt: now, dirty: true })
        .run();
      enqueue(tx, 'weekly_schedule', id, 'upsert');
    }
  });
}

/** Exception à une date (`AAAA-MM-JJ`) ; `templateId` null = repos forcé. */
export function setOverride(
  db: AppDatabase,
  userId: string,
  date: string,
  templateId: string | null,
): void {
  const now = nowIso();
  db.transaction((tx) => {
    const existing = tx
      .select({ id: scheduleOverrides.id })
      .from(scheduleOverrides)
      .where(
        and(
          eq(scheduleOverrides.userId, userId),
          eq(scheduleOverrides.date, date),
          isNull(scheduleOverrides.deletedAt),
        ),
      )
      .get();
    const id = existing?.id ?? newId();
    if (existing) {
      tx.update(scheduleOverrides)
        .set({ templateId, updatedAt: now, dirty: true })
        .where(eq(scheduleOverrides.id, id))
        .run();
    } else {
      tx.insert(scheduleOverrides)
        .values({ id, userId, date, templateId, createdAt: now, updatedAt: now, dirty: true })
        .run();
    }
    enqueue(tx, 'schedule_overrides', id, 'upsert');
  });
}

/** Retire l'exception : le jour revient au modèle de semaine. */
export function clearOverride(db: AppDatabase, userId: string, date: string): void {
  const now = nowIso();
  db.transaction((tx) => {
    const existing = tx
      .select({ id: scheduleOverrides.id })
      .from(scheduleOverrides)
      .where(
        and(
          eq(scheduleOverrides.userId, userId),
          eq(scheduleOverrides.date, date),
          isNull(scheduleOverrides.deletedAt),
        ),
      )
      .get();
    if (!existing) return;
    tx.update(scheduleOverrides)
      .set({ deletedAt: now, updatedAt: now, dirty: true })
      .where(eq(scheduleOverrides.id, existing.id))
      .run();
    enqueue(tx, 'schedule_overrides', existing.id, 'delete');
  });
}

/** Séance type prévue à cette date (null = repos). */
export function templateIdForDate(db: AppDatabase, userId: string, date: Date): string | null {
  const override = db
    .select({ templateId: scheduleOverrides.templateId })
    .from(scheduleOverrides)
    .where(
      and(
        eq(scheduleOverrides.userId, userId),
        eq(scheduleOverrides.date, toLocalDateString(date)),
        isNull(scheduleOverrides.deletedAt),
      ),
    )
    .get();
  const weekly = db
    .select({ templateId: weeklySchedule.templateId })
    .from(weeklySchedule)
    .where(
      and(
        eq(weeklySchedule.userId, userId),
        eq(weeklySchedule.weekday, isoWeekday(date)),
        isNull(weeklySchedule.deletedAt),
      ),
    )
    .get();
  return resolveTemplateId(override, weekly);
}
