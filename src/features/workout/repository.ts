import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, ne } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import {
  sessionBlocks,
  sessions,
  sessionSets,
  workoutState,
  type JsonObject,
  type Session,
  type SessionBlock,
  type SessionSet,
} from '@/db/schema';
import { nowIso } from '@/db/time';
import { newId } from '@/lib/id';
import { enqueue } from '@/sync/outbox';
import type { Difficulty } from './difficulty';
import type { PreviousSet } from './logic';
import {
  initialState,
  type PlannedBlock,
  type WorkoutPlanItem,
  type WorkoutUiState,
} from './state';

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
  /** V2 : bloc de la séance et mesures des types de suivi sans charge (weight_kg = 0). */
  blockId?: string | null;
  distanceM?: number | null;
  durationS?: number | null;
  calories?: number | null;
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

/**
 * Démarre une séance : ligne `sessions` (nom copié), lignes `session_blocks` (config copiée) et
 * état de l'écran avec le plan figé.
 */
export function startWorkout(
  db: AppDatabase,
  userId: string,
  {
    templateId,
    name,
    plan,
    blocks,
  }: {
    templateId: string | null;
    name: string;
    plan: WorkoutPlanItem[];
    /** V2 : blocs de la séance type, dans l'ordre (sans : séance V1). */
    blocks?: Omit<PlannedBlock, 'id'>[];
  },
): string {
  const id = newId();
  const now = nowIso();
  const planned = blocks?.map((block) => ({ ...block, id: newId() }));
  db.transaction((tx) => {
    tx.insert(sessions)
      .values({
        id,
        userId,
        templateId,
        name,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
        dirty: true,
      })
      .run();
    enqueue(tx, 'sessions', id, 'upsert');
    planned?.forEach((block, position) => {
      tx.insert(sessionBlocks)
        .values({
          id: block.id,
          userId,
          sessionId: id,
          templateBlockId: block.templateBlockId,
          position,
          type: block.type,
          name: block.name,
          config: block.config,
          createdAt: now,
          updatedAt: now,
          dirty: true,
        })
        .run();
      enqueue(tx, 'session_blocks', block.id, 'upsert');
    });
    tx.insert(workoutState)
      .values({ sessionId: id, state: JSON.stringify(initialState(plan, planned)), updatedAt: now })
      .run();
  });
  return id;
}

/** Début, fin et résultat d'un bloc de la séance (SPEC_V2 §4.4). */
export function updateSessionBlock(
  db: AppDatabase,
  id: string,
  patch: { startedAt?: string | null; endedAt?: string | null; result?: JsonObject },
): void {
  if (!id) return;
  db.transaction((tx) => {
    tx.update(sessionBlocks)
      .set({ ...patch, updatedAt: nowIso(), dirty: true })
      .where(eq(sessionBlocks.id, id))
      .run();
    enqueue(tx, 'session_blocks', id, 'upsert');
  });
}

export function getSessionBlock(db: AppDatabase, id: string): SessionBlock | undefined {
  return id ? db.select().from(sessionBlocks).where(eq(sessionBlocks.id, id)).get() : undefined;
}

export function listSessionBlocks(db: AppDatabase, sessionId: string): SessionBlock[] {
  return db
    .select()
    .from(sessionBlocks)
    .where(and(eq(sessionBlocks.sessionId, sessionId), isNull(sessionBlocks.deletedAt)))
    .orderBy(asc(sessionBlocks.position))
    .all();
}

export type LastBlock = { block: SessionBlock; sets: SessionSet[] };

/**
 * Dernière fois qu'un bloc a été fait (SPEC_V2 §4.5) : dernier bloc terminé du même bloc de séance
 * type, à défaut du même type et de la même config. Ses séries dans l'ordre de la séance.
 */
export function lastBlock(
  db: AppDatabase,
  userId: string,
  block: PlannedBlock,
  excludeSessionId: string,
): LastBlock | null {
  const candidates = db
    .select({ block: sessionBlocks })
    .from(sessionBlocks)
    .innerJoin(sessions, eq(sessions.id, sessionBlocks.sessionId))
    .where(
      and(
        eq(sessionBlocks.userId, userId),
        eq(sessionBlocks.type, block.type),
        ne(sessionBlocks.sessionId, excludeSessionId),
        isNotNull(sessionBlocks.endedAt),
        isNull(sessionBlocks.deletedAt),
        isNull(sessions.deletedAt),
      ),
    )
    .orderBy(desc(sessionBlocks.endedAt))
    .all()
    .map((row) => row.block);
  const config = JSON.stringify(block.config);
  const found =
    (block.templateBlockId
      ? candidates.find((c) => c.templateBlockId === block.templateBlockId)
      : undefined) ?? candidates.find((c) => JSON.stringify(c.config) === config);
  if (!found) return null;
  const sets = db
    .select()
    .from(sessionSets)
    .where(and(eq(sessionSets.blockId, found.id), isNull(sessionSets.deletedAt)))
    .orderBy(asc(sessionSets.exerciseOrder), asc(sessionSets.setNumber))
    .all();
  return { block: found, sets };
}

export function getWorkoutState(db: AppDatabase, sessionId: string): WorkoutUiState | undefined {
  const row = db.select().from(workoutState).where(eq(workoutState.sessionId, sessionId)).get();
  if (!row) return undefined;
  try {
    return JSON.parse(row.state) as WorkoutUiState;
  } catch {
    return undefined;
  }
}

export function saveWorkoutState(db: AppDatabase, sessionId: string, state: WorkoutUiState): void {
  const values = { sessionId, state: JSON.stringify(state), updatedAt: nowIso() };
  db.insert(workoutState)
    .values(values)
    .onConflictDoUpdate({ target: workoutState.sessionId, set: values })
    .run();
}

/**
 * Termine la séance ; sans aucune série ni bloc terminé (un circuit n'a pas de séries), elle est
 * supprimée plutôt qu'enregistrée vide.
 */
export function endWorkout(db: AppDatabase, sessionId: string): 'finished' | 'discarded' {
  const hasSets =
    listSessionSets(db, sessionId).length > 0 ||
    listSessionBlocks(db, sessionId).some((block) => block.endedAt !== null);
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(sessions)
      .set(
        hasSets
          ? { endedAt: now, updatedAt: now, dirty: true }
          : { deletedAt: now, updatedAt: now, dirty: true },
      )
      .where(eq(sessions.id, sessionId))
      .run();
    enqueue(tx, 'sessions', sessionId, hasSets ? 'upsert' : 'delete');
    tx.delete(workoutState).where(eq(workoutState.sessionId, sessionId)).run();
  });
  return hasSets ? 'finished' : 'discarded';
}

/** Supprime une série et renumérote les suivantes du même exercice. */
export function deleteSetAndRenumber(db: AppDatabase, id: string): void {
  const now = nowIso();
  db.transaction((tx) => {
    const deleted = tx.select().from(sessionSets).where(eq(sessionSets.id, id)).get();
    if (!deleted) return;
    tx.update(sessionSets)
      .set({ deletedAt: now, updatedAt: now, dirty: true })
      .where(eq(sessionSets.id, id))
      .run();
    enqueue(tx, 'session_sets', id, 'delete');
    const following = tx
      .select({ id: sessionSets.id, setNumber: sessionSets.setNumber })
      .from(sessionSets)
      .where(
        and(
          eq(sessionSets.sessionId, deleted.sessionId),
          eq(sessionSets.exerciseOrder, deleted.exerciseOrder),
          gt(sessionSets.setNumber, deleted.setNumber),
          isNull(sessionSets.deletedAt),
        ),
      )
      .all();
    for (const row of following) {
      tx.update(sessionSets)
        .set({ setNumber: row.setNumber - 1, updatedAt: now, dirty: true })
        .where(eq(sessionSets.id, row.id))
        .run();
      enqueue(tx, 'session_sets', row.id, 'upsert');
    }
  });
}

/** Séries de la dernière autre séance où chaque exercice a été fait (pré-remplissage, « Précédent »). */
export function lastSessionSets(
  db: AppDatabase,
  userId: string,
  exerciseIds: readonly string[],
  excludeSessionId: string,
): Map<string, PreviousSet[]> {
  const result = new Map<string, PreviousSet[]>();
  if (exerciseIds.length === 0) return result;
  const rows = db
    .select({
      exerciseId: sessionSets.exerciseId,
      sessionId: sessionSets.sessionId,
      setNumber: sessionSets.setNumber,
      weightKg: sessionSets.weightKg,
      reps: sessionSets.reps,
      difficulty: sessionSets.difficulty,
    })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessions.id, sessionSets.sessionId))
    .where(
      and(
        eq(sessionSets.userId, userId),
        inArray(sessionSets.exerciseId, [...exerciseIds]),
        ne(sessionSets.sessionId, excludeSessionId),
        isNull(sessionSets.deletedAt),
        isNull(sessions.deletedAt),
      ),
    )
    .orderBy(desc(sessions.startedAt), asc(sessionSets.setNumber))
    .all();
  const chosenSession = new Map<string, string>();
  for (const row of rows) {
    const sessionId = chosenSession.get(row.exerciseId) ?? row.sessionId;
    chosenSession.set(row.exerciseId, sessionId);
    if (row.sessionId !== sessionId) continue;
    const list = result.get(row.exerciseId) ?? [];
    list.push({
      setNumber: row.setNumber,
      weightKg: row.weightKg,
      reps: row.reps,
      difficulty: row.difficulty,
    });
    result.set(row.exerciseId, list);
  }
  return result;
}

/** Séries faites avant une date (record à battre pendant la séance). */
export function setsBefore(
  db: AppDatabase,
  userId: string,
  exerciseIds: readonly string[],
  beforeIso: string,
): Map<string, PreviousSet[]> {
  const result = new Map<string, PreviousSet[]>();
  if (exerciseIds.length === 0) return result;
  const rows = db
    .select()
    .from(sessionSets)
    .where(
      and(
        eq(sessionSets.userId, userId),
        inArray(sessionSets.exerciseId, [...exerciseIds]),
        lt(sessionSets.completedAt, beforeIso),
        isNull(sessionSets.deletedAt),
      ),
    )
    .all();
  for (const row of rows) {
    const list = result.get(row.exerciseId) ?? [];
    list.push(row);
    result.set(row.exerciseId, list);
  }
  return result;
}

export const sessionSetsQuery = (db: AppDatabase, sessionId: string) =>
  db
    .select()
    .from(sessionSets)
    .where(and(eq(sessionSets.sessionId, sessionId), isNull(sessionSets.deletedAt)))
    .orderBy(asc(sessionSets.exerciseOrder), asc(sessionSets.setNumber));

export function getSession(db: AppDatabase, id: string): Session | undefined {
  return db.select().from(sessions).where(eq(sessions.id, id)).get();
}

/** Séances terminées (accueil, régularité, stats). */
export const completedSessionsQuery = (db: AppDatabase, userId: string) =>
  db
    .select({
      id: sessions.id,
      name: sessions.name,
      templateId: sessions.templateId,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
    })
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), isNull(sessions.deletedAt), isNotNull(sessions.endedAt)),
    )
    .orderBy(desc(sessions.startedAt));

/** Toutes les séries (records, progression). */
export const allSetsQuery = (db: AppDatabase, userId: string) =>
  db
    .select({
      id: sessionSets.id,
      sessionId: sessionSets.sessionId,
      exerciseId: sessionSets.exerciseId,
      weightKg: sessionSets.weightKg,
      reps: sessionSets.reps,
      difficulty: sessionSets.difficulty,
      completedAt: sessionSets.completedAt,
    })
    .from(sessionSets)
    .where(and(eq(sessionSets.userId, userId), isNull(sessionSets.deletedAt)));
