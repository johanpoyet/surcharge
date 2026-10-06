// Brouillon de l'éditeur ↔ blocs enregistrés. Fonctions pures.

import type { BlockType } from '@/db/schema';
import type { DraftBlock, DraftInit } from './draftStore';
import { formatRepsTarget, formatRest, parseRepsTarget, parseRest } from './format';
import type { BlockInput, LoadedBlock } from './repository';

/** Blocs relus en base → brouillon. */
export function draftFromBlocks(blocks: readonly LoadedBlock[]): DraftInit['blocks'] {
  return blocks.map((block) => ({
    id: block.id,
    type: block.type,
    name: block.name,
    config: block.config,
    items: block.items.map((item) => ({
      id: item.id,
      exerciseId: item.exerciseId,
      targetSets: item.targetSets,
      repsText: formatRepsTarget({ min: item.targetRepsMin, max: item.targetRepsMax }),
      restText: formatRest(item.restSeconds),
      targetDistanceM: item.targetDistanceM ?? null,
      targetDurationS: item.targetDurationS ?? null,
      targetCalories: item.targetCalories ?? null,
      targetWeightKg: item.targetWeightKg ?? null,
    })),
  }));
}

/** Blocs qui n'ont de sens qu'avec au moins un exercice. */
const NEEDS_EXERCISES: ReadonlySet<BlockType> = new Set(['strength', 'cardio', 'circuit']);

export type DraftError = 'noBlocks' | 'emptyBlock' | 'invalidItems';

/** Brouillon → blocs à enregistrer, ou l'erreur à afficher. */
export function blocksFromDraft(
  blocks: readonly DraftBlock[],
): { blocks: BlockInput[] } | { error: DraftError } {
  if (blocks.length === 0) return { error: 'noBlocks' };
  if (blocks.some((b) => NEEDS_EXERCISES.has(b.type) && b.items.length === 0)) {
    return { error: 'emptyBlock' };
  }
  const result: BlockInput[] = [];
  for (const block of blocks) {
    const items: BlockInput['items'][number][] = [];
    for (const item of block.items) {
      const reps = parseRepsTarget(item.repsText);
      const rest = parseRest(item.restText);
      if (reps === null || rest === null) return { error: 'invalidItems' };
      items.push({
        id: item.id,
        exerciseId: item.exerciseId,
        targetSets: item.targetSets,
        targetRepsMin: reps.min,
        targetRepsMax: reps.max,
        restSeconds: rest,
        targetDistanceM: item.targetDistanceM,
        targetDurationS: item.targetDurationS,
        targetCalories: item.targetCalories,
        targetWeightKg: item.targetWeightKg,
      });
    }
    result.push({ id: block.id, type: block.type, name: block.name, config: block.config, items });
  }
  return { blocks: result };
}
