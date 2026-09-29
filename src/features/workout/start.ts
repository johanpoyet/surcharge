import type { AppDatabase } from '@/db/client';
import { getTemplate, listTemplateExercises } from '@/features/templates/repository';
import { getActiveSession, startWorkout } from './repository';

export type StartResult = { sessionId: string; resumed: boolean };

/**
 * Démarre la séance type (plan figé à partir de ses exercices). Si une séance est déjà en cours,
 * on la reprend plutôt que d'en ouvrir une deuxième.
 */
export function startFromTemplate(
  db: AppDatabase,
  userId: string,
  templateId: string,
): StartResult {
  const active = getActiveSession(db, userId);
  if (active) return { sessionId: active.id, resumed: true };
  const template = getTemplate(db, templateId);
  const plan = listTemplateExercises(db, templateId).map((item) => ({
    exerciseId: item.exerciseId,
    targetSets: item.targetSets,
    repsMin: item.targetRepsMin,
    repsMax: item.targetRepsMax,
    restSeconds: item.restSeconds,
  }));
  const sessionId = startWorkout(db, userId, {
    templateId,
    name: template?.name ?? '',
    plan,
  });
  return { sessionId, resumed: false };
}
