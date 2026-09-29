import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { liveDb } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  activeExercisesQuery,
  exerciseHistoryQuery,
  exerciseSessionStatsQuery,
  groupHistory,
  type HistorySession,
} from './repository';
import { summarizeExercises, type ExerciseSummary } from './summary';

const useUserId = () => useAuth().session?.user.id ?? '';

/** Exercices actifs de l'utilisateur, mis à jour en direct. */
export function useExercises(): Exercise[] {
  const userId = useUserId();
  const { data } = useLiveQuery(activeExercisesQuery(liveDb, userId), [userId]);
  return data;
}

/** Dernière utilisation, charge max et tendance par exercice. */
export function useExerciseSummaries(): Map<string, ExerciseSummary> {
  const userId = useUserId();
  const { data } = useLiveQuery(exerciseSessionStatsQuery(liveDb, userId), [userId]);
  return useMemo(() => summarizeExercises(data), [data]);
}

export function useExercise(id: string): Exercise | undefined {
  const { data } = useLiveQuery(liveDb.select().from(exercises).where(eq(exercises.id, id)), [id]);
  return data[0];
}

export function useExerciseHistory(id: string): HistorySession[] {
  const { data } = useLiveQuery(exerciseHistoryQuery(liveDb, id), [id]);
  return useMemo(() => groupHistory(data), [data]);
}
