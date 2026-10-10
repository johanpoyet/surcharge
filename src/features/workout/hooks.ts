import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { parseISO } from 'date-fns';
import { useMemo } from 'react';

import { liveDb } from '@/db/client';
import { sessionBlocks, sessions as sessionsTable, type Session } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { mergeKinds, sessionKinds, type SessionKind } from '@/features/templates/kinds';
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

/** Nom de la séance terminée par jour (date locale), pour les jours faits hors planning. */
export function useDoneSessionsByDate(): Map<string, string> {
  const sessions = useCompletedSessions();
  return useMemo(() => {
    const byDate = new Map<string, string>();
    for (const s of sessions) {
      const key = toLocalDateString(parseISO(s.startedAt));
      if (!byDate.has(key)) byDate.set(key, s.name);
    }
    return byDate;
  }, [sessions]);
}

/** Types des séances terminées par jour (date locale) : pictogrammes du planning et du calendrier. */
export function useDoneKindsByDate(): Map<string, SessionKind[]> {
  const userId = useUserId();
  const sessions = useCompletedSessions();
  const { data: blocks } = useLiveQuery(
    liveDb
      .select({ sessionId: sessionBlocks.sessionId, type: sessionBlocks.type })
      .from(sessionBlocks)
      .where(and(eq(sessionBlocks.userId, userId), isNull(sessionBlocks.deletedAt)))
      .orderBy(asc(sessionBlocks.position)),
    [userId],
  );
  return useMemo(() => {
    const types = new Map<string, (typeof blocks)[number]['type'][]>();
    for (const block of blocks)
      types.set(block.sessionId, [...(types.get(block.sessionId) ?? []), block.type]);
    const byDate = new Map<string, SessionKind[]>();
    // Du plus ancien au plus récent : l'ordre des icônes suit celui des séances du jour.
    for (const s of [...sessions].reverse()) {
      const key = toLocalDateString(parseISO(s.startedAt));
      byDate.set(key, mergeKinds(byDate.get(key) ?? [], sessionKinds(types.get(s.id) ?? [])));
    }
    return byDate;
  }, [blocks, sessions]);
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
