// Plan d'une séance à partir des blocs de la séance type (SPEC_V2 §5.3). Fonction pure.

import { hyroxSegments } from '@/features/hyrox/segments';
import { parseBlockConfig } from '@/features/templates/blockConfig';
import type { LoadedBlock } from '@/features/templates/repository';
import type { PlannedBlock, WorkoutPlanItem } from '../state';

export type BuiltPlan = { plan: WorkoutPlanItem[]; blocks: Omit<PlannedBlock, 'id'>[] };

/**
 * Lignes du plan dans l'ordre de la séance : exercices des blocs Musculation, Course / cardio et
 * Circuit, et un segment par ligne pour un bloc Hyrox (exercice du catalogue de même clé).
 * L'ordre des lignes est l'`exercise_order` des séries : unique dans la séance.
 */
export function buildPlan(
  blocks: readonly LoadedBlock[],
  exerciseIdForKey: (catalogKey: string) => string,
): BuiltPlan {
  const plan: WorkoutPlanItem[] = [];
  blocks.forEach((block, blockIndex) => {
    if (block.type === 'hyrox') {
      for (const segment of hyroxSegments(parseBlockConfig('hyrox', block.config))) {
        plan.push({
          exerciseId: exerciseIdForKey(segment.exercise.catalogKey),
          targetSets: 1,
          repsMin: null,
          repsMax: segment.reps ?? null,
          restSeconds: 0,
          blockIndex,
          targetDistanceM: segment.distanceM ?? null,
          targetWeightKg: segment.weightKg ?? null,
          segment: {
            kind: segment.kind,
            round: segment.round,
            reps: segment.reps,
            weightKg: segment.weightKg,
            weightCount: segment.weightCount,
          },
        });
      }
      return;
    }
    for (const item of block.items) {
      plan.push({
        exerciseId: item.exerciseId,
        targetSets: item.targetSets,
        repsMin: item.targetRepsMin,
        repsMax: item.targetRepsMax,
        restSeconds: item.restSeconds,
        blockIndex,
        targetDistanceM: item.targetDistanceM ?? null,
        targetDurationS: item.targetDurationS ?? null,
        targetCalories: item.targetCalories ?? null,
        targetWeightKg: item.targetWeightKg ?? null,
      });
    }
  });
  return {
    plan,
    blocks: blocks.map((block) => ({
      templateBlockId: block.id ?? null,
      type: block.type,
      name: block.name,
      config: block.config,
    })),
  };
}
