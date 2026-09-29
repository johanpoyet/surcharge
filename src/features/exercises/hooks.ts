import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { liveDb } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';

/** Exercices actifs de l'utilisateur, mis à jour en direct. */
export function useExercises(): Exercise[] {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { data } = useLiveQuery(
    liveDb
      .select()
      .from(exercises)
      .where(and(eq(exercises.userId, userId), isNull(exercises.deletedAt)))
      .orderBy(asc(exercises.name)),
    [userId],
  );
  return data;
}
