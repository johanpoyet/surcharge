import type { AppDatabase } from '@/db/client';
import { getTemplate, listTemplateExercises } from '@/features/templates/repository';
import {
  getSession,
  getActiveSession,
  listSessionSets,
  saveWorkoutState,
  startWorkout,
} from './repository';
import { initialState, type WorkoutPlanItem, type WorkoutUiState } from './state';

/** Repos par défaut d'un exercice reconstruit sans séance type (SPEC : 2 min). */
const DEFAULT_REST_SECONDS = 120;

function templatePlan(db: AppDatabase, templateId: string): WorkoutPlanItem[] {
  return listTemplateExercises(db, templateId).map((item) => ({
    exerciseId: item.exerciseId,
    targetSets: item.targetSets,
    repsMin: item.targetRepsMin,
    repsMax: item.targetRepsMax,
    restSeconds: item.restSeconds,
  }));
}

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
  const plan = templatePlan(db, templateId);
  const sessionId = startWorkout(db, userId, {
    templateId,
    name: template?.name ?? '',
    plan,
  });
  return { sessionId, resumed: false };
}

/**
 * Séance en cours démarrée sur un autre appareil : l'état de l'écran (plan, brouillons) est local
 * et n'est pas synchronisé. On le reconstruit à partir de la séance type, ou, si elle a changé ou
 * disparu, des exercices déjà faits (dans leur ordre de séance).
 */
export function restoreWorkoutState(
  db: AppDatabase,
  sessionId: string,
): WorkoutUiState | undefined {
  const session = getSession(db, sessionId);
  if (!session || session.endedAt || session.deletedAt) return undefined;
  const done = listSessionSets(db, sessionId);

  const fromTemplate = session.templateId ? templatePlan(db, session.templateId) : [];
  const matchesTemplate = done.every(
    (set) => fromTemplate[set.exerciseOrder]?.exerciseId === set.exerciseId,
  );
  let plan = fromTemplate;
  if (!matchesTemplate || plan.length === 0) {
    const byOrder = new Map<number, WorkoutPlanItem>();
    for (const set of done) {
      const item = byOrder.get(set.exerciseOrder);
      byOrder.set(set.exerciseOrder, {
        exerciseId: set.exerciseId,
        targetSets: Math.max(item?.targetSets ?? 0, set.setNumber),
        repsMin: null,
        repsMax: null,
        restSeconds: DEFAULT_REST_SECONDS,
      });
    }
    const maxOrder = Math.max(-1, ...byOrder.keys());
    plan = Array.from({ length: maxOrder + 1 }, (_, order) => byOrder.get(order)).filter(
      (item): item is WorkoutPlanItem => item !== undefined,
    );
  }

  const state = initialState(plan);
  saveWorkoutState(db, sessionId, state);
  return state;
}
