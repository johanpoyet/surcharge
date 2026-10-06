import { and, eq } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import { exercises } from '@/db/schema';
import { catalogExerciseId, ensureCatalogExercises } from '@/features/exercises/catalog';
import { parseBlockConfig } from '@/features/templates/blockConfig';
import { getTemplate, listTemplateBlocks } from '@/features/templates/repository';
import { newRun, type BlockRun } from './blocks/engine';
import { buildPlan, type BuiltPlan } from './blocks/plan';
import {
  getSession,
  getActiveSession,
  listSessionBlocks,
  listSessionSets,
  saveWorkoutState,
  startWorkout,
} from './repository';
import {
  initialState,
  type PlannedBlock,
  type WorkoutPlanItem,
  type WorkoutUiState,
} from './state';

/** Repos par défaut d'un exercice reconstruit sans séance type (SPEC : 2 min). */
const DEFAULT_REST_SECONDS = 120;

/**
 * Plan d'une séance type. Un bloc Hyrox s'appuie sur les exercices Hyrox du catalogue (ajoutés à
 * la bibliothèque s'il le faut ; un exercice supprimé par l'utilisateur garde son id).
 */
function templatePlan(db: AppDatabase, userId: string, templateId: string): BuiltPlan {
  const blocks = listTemplateBlocks(db, templateId);
  if (blocks.some((b) => b.type === 'hyrox')) ensureCatalogExercises(db, userId, ['hyrox']);
  const idForKey = (catalogKey: string) =>
    db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.userId, userId), eq(exercises.catalogKey, catalogKey)))
      .orderBy(exercises.deletedAt)
      .get()?.id ?? catalogExerciseId(userId, catalogKey);
  return buildPlan(blocks, idForKey);
}

export type StartResult = { sessionId: string; resumed: boolean };

/**
 * Démarre la séance type (plan et blocs figés). Si une séance est déjà en cours, on la reprend
 * plutôt que d'en ouvrir une deuxième.
 */
export function startFromTemplate(
  db: AppDatabase,
  userId: string,
  templateId: string,
): StartResult {
  const active = getActiveSession(db, userId);
  if (active) return { sessionId: active.id, resumed: true };
  const template = getTemplate(db, templateId);
  const { plan, blocks } = templatePlan(db, userId, templateId);
  const sessionId = startWorkout(db, userId, {
    templateId,
    name: template?.name ?? '',
    plan,
    blocks,
  });
  return { sessionId, resumed: false };
}

/**
 * Séance en cours démarrée sur un autre appareil : l'état de l'écran (plan, chronos) est local
 * et n'est pas synchronisé. On le reconstruit à partir de la séance type et des blocs de la
 * séance, ou, si la séance type a changé ou disparu, des exercices déjà faits.
 */
export function restoreWorkoutState(
  db: AppDatabase,
  sessionId: string,
): WorkoutUiState | undefined {
  const session = getSession(db, sessionId);
  if (!session || session.endedAt || session.deletedAt) return undefined;
  const done = listSessionSets(db, sessionId);
  const sessionBlocks = listSessionBlocks(db, sessionId);

  const built = session.templateId
    ? templatePlan(db, session.userId, session.templateId)
    : { plan: [], blocks: [] };
  const matchesTemplate =
    done.every((set) => built.plan[set.exerciseOrder]?.exerciseId === set.exerciseId) &&
    (sessionBlocks.length === 0 || sessionBlocks.length === built.blocks.length);

  if (matchesTemplate && built.plan.length + built.blocks.length > 0) {
    const blocks: PlannedBlock[] | undefined =
      sessionBlocks.length > 0
        ? sessionBlocks.map((row) => ({
            id: row.id,
            templateBlockId: row.templateBlockId,
            type: row.type,
            name: row.name,
            config: row.config,
          }))
        : undefined;
    const state = initialState(built.plan, blocks);
    if (blocks) {
      const runs: Record<number, BlockRun> = {};
      sessionBlocks.forEach((row, index) => {
        if (!row.startedAt) return;
        const startedAt = new Date(row.startedAt).getTime();
        const run: BlockRun = {
          ...newRun(),
          startedAt,
          endedAt: row.endedAt ? new Date(row.endedAt).getTime() : null,
        };
        if (row.type === 'hyrox') {
          // Reprise au segment suivant le dernier temps enregistré.
          const blockSets = done.filter((s) => s.blockId === row.id);
          const last = blockSets[blockSets.length - 1];
          run.hyrox = {
            segment: blockSets.length,
            segmentStartedAt: last ? new Date(last.completedAt).getTime() : startedAt,
            segmentPausedMs: 0,
            phase: 'work',
            transitions: [],
          };
        }
        if (row.type === 'circuit' && parseBlockConfig('circuit', row.config).format === 'amrap') {
          run.rounds = Number(row.result.rounds ?? 0);
        }
        runs[index] = run;
      });
      state.runs = runs;
      const firstOpen = sessionBlocks.findIndex((row) => !row.endedAt);
      state.currentBlock = firstOpen === -1 ? sessionBlocks.length - 1 : firstOpen;
      state.current = Math.max(
        0,
        built.plan.findIndex((item) => (item.blockIndex ?? 0) === state.currentBlock),
      );
    }
    saveWorkoutState(db, sessionId, state);
    return state;
  }

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
  const plan = Array.from({ length: maxOrder + 1 }, (_, order) => byOrder.get(order)).filter(
    (item): item is WorkoutPlanItem => item !== undefined,
  );
  const state = initialState(plan);
  saveWorkoutState(db, sessionId, state);
  return state;
}
