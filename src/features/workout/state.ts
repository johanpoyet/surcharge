import type { SetDraft } from './logic';

/** Exercice prévu, figé au démarrage (modifier la séance type ne change pas la séance en cours). */
export type WorkoutPlanItem = {
  exerciseId: string;
  targetSets: number;
  repsMin: number | null;
  repsMax: number | null;
  restSeconds: number;
};

export type RestState = {
  /** Fin du repos (ms depuis epoch). */
  endsAt: number;
  durationSeconds: number;
  /** Exercice et série qui suivent (libellé « ensuite », notification). */
  nextOrder: number;
  nextSetNumber: number;
  notificationId: string | null;
};

/** État de l'écran de séance, persisté dans `workout_state`. */
export type WorkoutUiState = {
  plan: WorkoutPlanItem[];
  /** Index de l'exercice affiché. */
  current: number;
  /** Séries ajoutées (« + Ajouter une série ») par ordre d'exercice. */
  extraSets: Record<number, number>;
  /** Valeurs saisies pour les séries pas encore validées, clé `ordre:série`. */
  drafts: Record<string, SetDraft>;
  rest: RestState | null;
};

export const draftKey = (order: number, setNumber: number) => `${order}:${setNumber}`;

export function initialState(plan: WorkoutPlanItem[]): WorkoutUiState {
  return { plan, current: 0, extraSets: {}, drafts: {}, rest: null };
}
