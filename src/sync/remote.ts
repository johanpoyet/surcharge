import type { SyncedTableName } from '@/db/schema';
import { supabase } from '@/lib/supabase';
import type { RemoteRow } from './mapping';

/** Accès à Supabase utilisé par la synchro (remplaçable dans les tests). */
export type RemoteApi = {
  upsert: (table: SyncedTableName, rows: RemoteRow[]) => Promise<void>;
  /** Lignes modifiées depuis `since` (inclus), triées par `updated_at`, page de `limit`. */
  changedSince: (
    table: SyncedTableName,
    since: string | null,
    offset: number,
    limit: number,
  ) => Promise<RemoteRow[]>;
};

// Les tables synchronisées ne sont pas toutes dans les types écrits à la main (database.types).
const from = (table: SyncedTableName) =>
  (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

export const supabaseRemote: RemoteApi = {
  async upsert(table, rows) {
    const { error } = await from(table).upsert(rows as never, { onConflict: 'id' });
    if (error) throw error;
  },
  async changedSince(table, since, offset, limit) {
    let query = from(table).select('*');
    if (since) query = query.gte('updated_at', since);
    const { data, error } = await query
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []) as RemoteRow[];
  },
};
