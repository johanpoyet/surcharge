import { and, desc, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { bodyWeights, profiles, type BodyWeight, type Profile } from '@/db/schema';
import { nowIso } from '@/db/time';
import type { Discipline, Goal, ProfileRow, WeightUnit } from '@/lib/database.types';
import { newId } from '@/lib/id';
import { enqueue } from '@/sync/outbox';

export function getProfile(db: AppDatabase, id: string): Profile | undefined {
  return db.select().from(profiles).where(eq(profiles.id, id)).get();
}

/**
 * Copie locale d'un profil lu dans Supabase (déjà synchronisé : ni `dirty`, ni outbox).
 * Une modification locale non envoyée n'est pas écrasée (SPEC 7, pull).
 */
export function saveRemoteProfile(db: AppDatabase, row: ProfileRow): void {
  const local = getProfile(db, row.id);
  if (local?.dirty) return;
  const values = {
    id: row.id,
    firstName: row.first_name,
    goal: row.goal,
    sessionsPerWeek: row.sessions_per_week,
    weightUnit: row.weight_unit,
    defaultRestSeconds: row.default_rest_seconds,
    remindersEnabled: row.reminders_enabled,
    ...(row.disciplines ? { disciplines: row.disciplines } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dirty: false,
  };
  db.insert(profiles).values(values).onConflictDoUpdate({ target: profiles.id, set: values }).run();
}

export type ProfilePatch = Partial<{
  firstName: string;
  goal: Goal | null;
  sessionsPerWeek: number | null;
  weightUnit: WeightUnit;
  defaultRestSeconds: number;
  remindersEnabled: boolean;
  disciplines: Discipline[];
}>;

export function updateProfile(db: AppDatabase, id: string, patch: ProfilePatch): void {
  db.transaction((tx) => {
    tx.update(profiles)
      .set({ ...patch, updatedAt: nowIso(), dirty: true })
      .where(eq(profiles.id, id))
      .run();
    enqueue(tx, 'profiles', id, 'upsert');
  });
}

type BodyWeightOptions = {
  /** Déjà enregistrée dans Supabase (onboarding en ligne) : pas d'outbox. */
  synced?: boolean;
  id?: string;
};

/** Une pesée par jour : une nouvelle pesée le même jour remplace la précédente. */
export function saveBodyWeight(
  db: AppDatabase,
  userId: string,
  measuredOn: string,
  weightKg: number,
  { synced = false, id }: BodyWeightOptions = {},
): string {
  const now = nowIso();
  return db.transaction((tx) => {
    const existing = tx
      .select({ id: bodyWeights.id })
      .from(bodyWeights)
      .where(
        and(
          eq(bodyWeights.userId, userId),
          eq(bodyWeights.measuredOn, measuredOn),
          isNull(bodyWeights.deletedAt),
        ),
      )
      .get();

    const rowId = existing?.id ?? id ?? newId();
    if (existing) {
      tx.update(bodyWeights)
        .set({ weightKg, updatedAt: now, dirty: !synced })
        .where(eq(bodyWeights.id, rowId))
        .run();
    } else {
      tx.insert(bodyWeights)
        .values({
          id: rowId,
          userId,
          measuredOn,
          weightKg,
          createdAt: now,
          updatedAt: now,
          dirty: !synced,
        })
        .run();
    }
    if (!synced) enqueue(tx, 'body_weights', rowId, 'upsert');
    return rowId;
  });
}

export function listBodyWeights(db: AppDatabase, userId: string): BodyWeight[] {
  return db
    .select()
    .from(bodyWeights)
    .where(and(eq(bodyWeights.userId, userId), isNull(bodyWeights.deletedAt)))
    .orderBy(desc(bodyWeights.measuredOn))
    .all();
}
