import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { sessions, sessionSets, type Session, type SessionSet } from '@/db/schema';
import { nowIso } from '@/db/time';
import { newId } from '@/lib/id';
import { enqueue } from '@/sync/outbox';
import type { Difficulty } from './difficulty';

export function startSession(
  db: AppDatabase,
  userId: string,
  {
    templateId,
    name,
    startedAt = nowIso(),
  }: { templateId: string | null; name: string; startedAt?: string },
): string {
  const id = newId();
  const now = nowIso();
  db.transaction((tx) => {
    tx.insert(sessions)
      .values({
        id,
        userId,
        templateId,
        name,
        startedAt,
        createdAt: now,
        updatedAt: now,
        dirty: true,
      })
      .run();
    enqueue(tx, 'sessions', id, 'upsert');
  });
  return id;
}

export function finishSession(db: AppDatabase, id: string, endedAt = nowIso()): void {
  db.transaction((tx) => {
    tx.update(sessions)
      .set({ endedAt, updatedAt: nowIso(), dirty: true })
      .where(eq(sessions.id, id))
      .run();
    enqueue(tx, 'sessions', id, 'upsert');
  });
}

/** Séance commencée et pas terminée (restauration après fermeture de l'app, SPEC 8.2). */
export function getActiveSession(db: AppDatabase, userId: string): Session | undefined {
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.endedAt), isNull(sessions.deletedAt)))
    .orderBy(desc(sessions.startedAt))
    .get();
}

export type SetInput = {
  sessionId: string;
  exerciseId: string;
  exerciseOrder: number;
  setNumber: number;
  weightKg: number;
  reps: number;
  difficulty: Difficulty | null;
};

export function addSet(db: AppDatabase, userId: string, input: SetInput): string {
  const id = newId();
  const now = nowIso();
  db.transaction((tx) => {
    tx.insert(sessionSets)
      .values({
        ...input,
        id,
        userId,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
        dirty: true,
      })
      .run();
    enqueue(tx, 'session_sets', id, 'upsert');
  });
  return id;
}

export function updateSet(
  db: AppDatabase,
  id: string,
  patch: Partial<Pick<SetInput, 'weightKg' | 'reps' | 'difficulty'>>,
): void {
  db.transaction((tx) => {
    tx.update(sessionSets)
      .set({ ...patch, updatedAt: nowIso(), dirty: true })
      .where(eq(sessionSets.id, id))
      .run();
    enqueue(tx, 'session_sets', id, 'upsert');
  });
}

export function deleteSet(db: AppDatabase, id: string): void {
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(sessionSets)
      .set({ deletedAt: now, updatedAt: now, dirty: true })
      .where(eq(sessionSets.id, id))
      .run();
    enqueue(tx, 'session_sets', id, 'delete');
  });
}

export function listSessionSets(db: AppDatabase, sessionId: string): SessionSet[] {
  return db
    .select()
    .from(sessionSets)
    .where(and(eq(sessionSets.sessionId, sessionId), isNull(sessionSets.deletedAt)))
    .orderBy(asc(sessionSets.exerciseOrder), asc(sessionSets.setNumber))
    .all();
}
