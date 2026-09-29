import { count } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { liveDb } from '@/db/client';
import { outbox } from '@/db/schema';

/** Nombre de modifications locales pas encore envoyées à Supabase. */
export function usePendingChanges(): number {
  const { data } = useLiveQuery(liveDb.select({ value: count() }).from(outbox));
  return data[0]?.value ?? 0;
}
