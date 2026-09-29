import { and, asc, eq, inArray } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { outbox, type OutboxEntry, type SyncedTableName } from '@/db/schema';
import { columnOf, ownerColumn, SYNC_ORDER, TABLES, toRemote } from './mapping';
import type { RemoteApi } from './remote';

const BATCH = 100;

export type PushResult = { pushed: number; failed: number };

type Row = Record<string, unknown> & { id: string; updatedAt: string };

/**
 * Envoie l'outbox (SPEC 7) : par table dans l'ordre des dépendances, par lots de 100 (upsert).
 * Une ligne envoyée sort de l'outbox et n'est plus `dirty`, sauf si elle a été modifiée pendant
 * l'envoi (elle repartira au prochain push). En cas d'erreur : `attempts` + 1, on continue.
 */
export async function pushOutbox(
  db: AppDatabase,
  remote: RemoteApi,
  userId: string,
): Promise<PushResult> {
  // Ordre chronologique : une ligne supprimée part avant celle qui la remplace (index uniques
  // partiels côté Supabase : un modèle par jour, une pesée par jour…).
  const entries = db.select().from(outbox).orderBy(asc(outbox.id)).all();
  const result: PushResult = { pushed: 0, failed: 0 };

  for (const tableName of SYNC_ORDER) {
    const forTable = entries.filter((e) => e.tableName === tableName);
    for (let i = 0; i < forTable.length; i += BATCH) {
      const batch = forTable.slice(i, i + BATCH);
      const rows = loadRows(
        db,
        tableName,
        batch.map((e) => e.rowId),
        userId,
      );
      const byId = new Map(rows.map((row) => [row.id, row]));
      // Entrées dont la ligne a disparu : rien à envoyer.
      const orphans = batch.filter(
        (e) => !byId.has(e.rowId) && !belongsToOther(db, tableName, e.rowId),
      );
      for (const entry of orphans) db.delete(outbox).where(eq(outbox.id, entry.id)).run();
      const toSend = batch.filter((e) => byId.has(e.rowId));
      if (toSend.length === 0) continue;
      try {
        await remote.upsert(
          tableName,
          toSend.map((e) => toRemote(tableName, byId.get(e.rowId)!)),
        );
        markPushed(db, tableName, toSend, byId);
        result.pushed += toSend.length;
      } catch {
        for (const entry of toSend) {
          db.update(outbox)
            .set({ attempts: entry.attempts + 1 })
            .where(eq(outbox.id, entry.id))
            .run();
        }
        result.failed += toSend.length;
      }
    }
  }
  return result;
}

function loadRows(
  db: AppDatabase,
  tableName: SyncedTableName,
  ids: string[],
  userId: string,
): Row[] {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(TABLES[tableName])
    .where(
      and(
        inArray(columnOf(tableName, 'id'), ids),
        eq(columnOf(tableName, ownerColumn(tableName)), userId),
      ),
    )
    .all() as Row[];
}

/** Ligne d'un autre compte (déconnexion puis autre connexion) : on la garde pour plus tard. */
function belongsToOther(db: AppDatabase, tableName: SyncedTableName, id: string): boolean {
  return (
    db
      .select()
      .from(TABLES[tableName])
      .where(eq(columnOf(tableName, 'id'), id))
      .all().length > 0
  );
}

function markPushed(
  db: AppDatabase,
  tableName: SyncedTableName,
  entries: OutboxEntry[],
  rows: Map<string, Row>,
): void {
  db.transaction((tx) => {
    for (const entry of entries) {
      const sent = rows.get(entry.rowId)!;
      // Supprimée seulement si l'entrée n'a pas été renouvelée pendant l'envoi.
      tx.delete(outbox)
        .where(and(eq(outbox.id, entry.id), eq(outbox.createdAt, entry.createdAt)))
        .run();
      tx.update(TABLES[tableName])
        .set({ dirty: false } as never)
        .where(
          and(
            eq(columnOf(tableName, 'id'), entry.rowId),
            eq(columnOf(tableName, 'updatedAt'), sent.updatedAt),
          ),
        )
        .run();
    }
  });
}
