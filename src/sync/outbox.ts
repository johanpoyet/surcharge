import { eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { outbox, type OutboxOp, type SyncedTableName } from '@/db/schema';
import { nowIso } from '@/db/time';

/** Transaction ou base : les écritures et leur ajout à l'outbox partagent la même transaction. */
export type Tx = Parameters<Parameters<AppDatabase['transaction']>[0]>[0] | AppDatabase;

/**
 * Ajoute (ou remplace) l'entrée d'outbox d'un enregistrement : une seule entrée par ligne,
 * le push enverra son état le plus récent.
 */
export function enqueue(tx: Tx, tableName: SyncedTableName, rowId: string, op: OutboxOp): void {
  tx.insert(outbox)
    .values({ tableName, rowId, op, createdAt: nowIso(), attempts: 0 })
    .onConflictDoUpdate({
      target: [outbox.tableName, outbox.rowId],
      set: { op, createdAt: nowIso(), attempts: 0 },
    })
    .run();
}

export function pendingCount(db: AppDatabase): number {
  return db.select({ id: outbox.id }).from(outbox).all().length;
}

export function removeFromOutbox(db: AppDatabase, id: number): void {
  db.delete(outbox).where(eq(outbox.id, id)).run();
}
