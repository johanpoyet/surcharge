import { eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { syncState, type SyncedTableName } from '@/db/schema';
import { columnOf, fromRemote, SYNC_ORDER, TABLES } from './mapping';
import type { RemoteApi } from './remote';

const PAGE = 500;
// Recouvrement : une transaction validée un peu après son horodatage n'est pas manquée.
const OVERLAP_MS = 60_000;

const stateKey = (userId: string, table: SyncedTableName) => `${userId}/${table}`;

type Local = Record<string, unknown> & { id: string; dirty?: boolean; photoPath?: string | null };

/**
 * Récupère les lignes modifiées côté Supabase depuis le dernier pull (SPEC 7) et les recopie en
 * local, sauf les lignes locales pas encore envoyées (`dirty`). Retourne le nombre de lignes reçues.
 */
export async function pullAll(db: AppDatabase, remote: RemoteApi, userId: string): Promise<number> {
  let received = 0;
  for (const tableName of SYNC_ORDER) {
    const key = stateKey(userId, tableName);
    const last =
      db.select().from(syncState).where(eq(syncState.tableName, key)).get()?.lastPulledAt ?? null;
    const since = last ? new Date(new Date(last).getTime() - OVERLAP_MS).toISOString() : null;
    let maxUpdated = last;

    for (let offset = 0; ; offset += PAGE) {
      const page = await remote.changedSince(tableName, since, offset, PAGE);
      for (const remoteRow of page) {
        applyRemote(db, tableName, remoteRow);
        const updated = new Date(String(remoteRow.updated_at)).toISOString();
        if (!maxUpdated || updated > maxUpdated) maxUpdated = updated;
      }
      received += page.length;
      if (page.length < PAGE) break;
    }

    if (maxUpdated && maxUpdated !== last) {
      db.insert(syncState)
        .values({ tableName: key, lastPulledAt: maxUpdated })
        .onConflictDoUpdate({ target: syncState.tableName, set: { lastPulledAt: maxUpdated } })
        .run();
    }
  }
  return received;
}

function applyRemote(
  db: AppDatabase,
  tableName: SyncedTableName,
  remoteRow: Record<string, unknown>,
): void {
  const id = columnOf(tableName, 'id');
  const values = fromRemote(tableName, remoteRow) as Local;
  const local = db.select().from(TABLES[tableName]).where(eq(id, values.id)).get() as
    Local | undefined;
  // Dernière écriture gagne : une modification locale pas encore envoyée n'est pas écrasée.
  if (local?.dirty) return;
  if (tableName === 'exercises' && local && local.photoPath !== values.photoPath) {
    // Photo changée sur un autre appareil : la copie locale sera retéléchargée.
    values.photoLocalUri = null;
  }
  db.insert(TABLES[tableName])
    .values(values as never)
    .onConflictDoUpdate({ target: id, set: values as never })
    .run();
}
