// Envoi des stats publiques (SPEC_V2 §6.3) après chaque synchro réussie : on recalcule tout en
// local et on remplace ce que voient les amis. Hors ligne, rien ne part ; la synchro suivante
// rattrape. Les erreurs sont absorbées (jamais bloquant pour l'app).

import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { exercises, profiles, sessionBlocks, sessions } from '@/db/schema';
import { allSetsQuery, completedSessionsQuery } from '@/features/workout/repository';
import { stableId } from '@/lib/stableId';
import { supabase } from '@/lib/supabase';
import { EVENT_WINDOW_DAYS, publicSnapshot, type PublicSnapshot } from './publicStats';

type Table = 'public_stats' | 'public_exercise_stats' | 'activity_events';
// Tables sociales absentes des types écrits à la main (database.types).
const from = (table: Table) =>
  (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

/** Id serveur d'une activité : stable, pour remplacer plutôt que dupliquer. */
export const eventId = (userId: string, key: string) => stableId(userId, 'activity', key);

/** Instantané des stats publiques à partir de la base locale. */
export function buildSnapshot(
  db: AppDatabase,
  userId: string,
  today = new Date(),
): PublicSnapshot | null {
  const profile = db.select().from(profiles).where(eq(profiles.id, userId)).get();
  if (!profile) return null;
  const sets = allSetsQuery(db, userId).all();
  const names = new Map(
    db
      .select({ id: exercises.id, name: exercises.name })
      .from(exercises)
      .where(eq(exercises.userId, userId))
      .all()
      .map((e) => [e.id, e.name] as const),
  );
  const hyrox = db
    .select({
      id: sessionBlocks.id,
      endedAt: sessionBlocks.endedAt,
      config: sessionBlocks.config,
      result: sessionBlocks.result,
    })
    .from(sessionBlocks)
    .innerJoin(sessions, eq(sessions.id, sessionBlocks.sessionId))
    .where(
      and(
        eq(sessionBlocks.userId, userId),
        eq(sessionBlocks.type, 'hyrox'),
        isNotNull(sessionBlocks.endedAt),
        isNull(sessionBlocks.deletedAt),
        isNull(sessions.deletedAt),
      ),
    )
    .all();
  return publicSnapshot({
    userId,
    today,
    sessionsPerWeek: profile.sessionsPerWeek ?? null,
    share: {
      shareSessions: profile.shareSessions,
      shareRecords: profile.shareRecords,
      shareExactWeights: profile.shareExactWeights,
    },
    sessionStarts: completedSessionsQuery(db, userId)
      .all()
      .map((s) => s.startedAt),
    sets,
    hyroxBlocks: hyrox.map((b) => ({
      id: b.id,
      endedAt: b.endedAt ?? '',
      format: typeof b.config.format === 'string' ? b.config.format : 'full',
      totalS: typeof b.result.totalS === 'number' ? b.result.totalS : null,
    })),
    exerciseNames: names,
  });
}

let lastSent: string | null = null;

/** Remplace les stats publiques sur le serveur ; ne fait rien si rien n'a changé depuis le dernier envoi. */
export async function pushPublicStats(db: AppDatabase, userId: string): Promise<boolean> {
  const snapshot = buildSnapshot(db, userId);
  if (!snapshot) return false;
  const fingerprint = JSON.stringify(snapshot);
  if (fingerprint === lastSent) return true;

  const stats = await from('public_stats').upsert(snapshot.stats as never, {
    onConflict: 'user_id',
  });
  if (stats.error) return false;

  const keys = snapshot.exercises.map((e) => e.catalog_key);
  if (snapshot.exercises.length > 0) {
    const { error } = await from('public_exercise_stats').upsert(snapshot.exercises as never, {
      onConflict: 'user_id,catalog_key',
    });
    if (error) return false;
  }
  // Exercices disparus (séances supprimées) : on retire leurs stats.
  let stale = from('public_exercise_stats').delete().eq('user_id', userId);
  if (keys.length > 0)
    stale = stale.not('catalog_key', 'in', `(${keys.map((k) => `"${k}"`).join(',')})`);
  if ((await stale).error) return false;

  const events = snapshot.events.map((e) => ({
    id: eventId(userId, e.key),
    user_id: userId,
    type: e.type,
    payload: e.payload,
    created_at: e.created_at,
  }));
  if (events.length > 0) {
    const { error } = await from('activity_events').upsert(events as never, { onConflict: 'id' });
    if (error) return false;
  }
  // Activités récentes qui n'existent plus (séance supprimée, partage désactivé).
  const since = new Date(Date.now() - EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let gone = from('activity_events').delete().eq('user_id', userId).gte('created_at', since);
  if (events.length > 0) gone = gone.not('id', 'in', `(${events.map((e) => e.id).join(',')})`);
  if ((await gone).error) return false;

  // Partage désactivé : les anciennes activités de ce type disparaissent aussi du fil des amis.
  const hidden = [
    ...(snapshot.share.shareRecords ? [] : ['record']),
    ...(snapshot.share.shareSessions ? [] : ['streak', 'hyrox_done']),
  ];
  if (hidden.length > 0) {
    const { error } = await from('activity_events')
      .delete()
      .eq('user_id', userId)
      .in('type', hidden);
    if (error) return false;
  }

  lastSent = fingerprint;
  return true;
}

/** Après une déconnexion : le prochain compte repart d'un envoi complet. */
export const resetPublicStats = () => {
  lastSent = null;
};
