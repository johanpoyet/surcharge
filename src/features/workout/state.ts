import type { BlockType, JsonObject } from '@/db/schema';
import type { BlockRun } from './blocks/engine';
import type { SetDraft } from './logic';

/** Segment Hyrox d'une ligne du plan (course ou station, charge de la division). */
export type PlanSegment = {
  kind: 'run' | 'station';
  round: number;
  reps?: number;
  weightKg?: number;
  weightCount?: number;
};

/** Exercice prévu, figé au démarrage (modifier la séance type ne change pas la séance en cours). */
export type WorkoutPlanItem = {
  exerciseId: string;
  targetSets: number;
  repsMin: number | null;
  repsMax: number | null;
  restSeconds: number;
  /** Bloc de la ligne (index dans `blocks`) ; absent dans un état V1 : bloc 0. */
  blockIndex?: number;
  targetDistanceM?: number | null;
  targetDurationS?: number | null;
  targetCalories?: number | null;
  targetWeightKg?: number | null;
  /** Ligne d'un bloc Hyrox. */
  segment?: PlanSegment;
};

/** Bloc de la séance, figé au démarrage (ligne `session_blocks`). */
export type PlannedBlock = {
  /** Id de la ligne `session_blocks`. */
  id: string;
  templateBlockId: string | null;
  type: BlockType;
  name: string | null;
  config: JsonObject;
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

/** Effort en cours d'une série chronométrée (bloc cardio : chrono qu'on démarre et arrête d'un tap). */
export type RunningEffort = { order: number; setNumber: number; startedAt: number };

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
  /** V2 : blocs de la séance (absent dans un état V1 : un seul bloc Musculation implicite). */
  blocks?: PlannedBlock[];
  currentBlock?: number;
  /** État de chaque bloc (chronos), par index de bloc. */
  runs?: Record<number, BlockRun>;
  effort?: RunningEffort | null;
};

export const draftKey = (order: number, setNumber: number) => `${order}:${setNumber}`;

export function initialState(plan: WorkoutPlanItem[], blocks?: PlannedBlock[]): WorkoutUiState {
  return {
    plan,
    current: 0,
    extraSets: {},
    drafts: {},
    rest: null,
    ...(blocks ? { blocks, currentBlock: 0, runs: {}, effort: null } : {}),
  };
}

/** Bloc d'une ligne du plan (0 dans un état V1). */
export const blockOf = (item: WorkoutPlanItem): number => item.blockIndex ?? 0;

/** Blocs de la séance ; un état V1 n'a qu'un bloc Musculation implicite. */
export function blocksOf(state: WorkoutUiState): PlannedBlock[] {
  return (
    state.blocks ?? [{ id: '', templateBlockId: null, type: 'strength', name: null, config: {} }]
  );
}
