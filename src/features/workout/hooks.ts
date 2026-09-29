import { and, desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { parseISO } from 'date-fns';
import { useMemo } from 'react';

import { liveDb } from '@/db/client';
import { sessions as sessionsTable, type Session } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { toLocalDateString } from '@/lib/format';
import { allSetsQuery, completedSessionsQuery } from './repository';

const useUserId = () => useAuth().session?.user.id ?? '';

/** Séances terminées, de la plus récente à la plus ancienne. */
export function useCompletedSessions() {
  const userId = useUserId();
  const { data } = useLiveQuery(completedSessionsQuery(liveDb, userId), [userId]);
  return data;
}

/** Jours (AAAA-MM-JJ, heure locale) où une séance a été faite. */
export function useDoneDates(): Set<string> {
  const sessions = useCompletedSessions();
  return useMemo(
    () => new Set(sessions.map((s) => toLocalDateString(parseISO(s.startedAt)))),
    [sessions],
  );
}

export function useAllSets() {
  const userId = useUserId();
  const { data } = useLiveQuery(allSetsQuery(liveDb, userId), [userId]);
  return data;
}

/** Séance commencée et pas terminée, en direct. */
export function useActiveSession(): Session | undefined {
  const userId = useUserId();
  const { data } = useLiveQuery(
    liveDb
      .select()
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.userId, userId),
          isNull(sessionsTable.endedAt),
          isNull(sessionsTable.deletedAt),
        ),
      )
      .orderBy(desc(sessionsTable.startedAt))
      .limit(1),
    [userId],
  );
  return data[0];
}
