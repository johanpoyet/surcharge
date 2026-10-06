// Durée estimée d'une séance type en blocs (SPEC_V2 §4.6, remplace SPEC §9.4) et kilomètres de
// course. Fonctions pures.

import type { BlockType, JsonObject } from '@/db/schema';
import { hyroxRunDistanceM } from '@/features/hyrox/segments';
import { parseBlockConfig } from './blockConfig';
import { SECONDS_PER_SET } from './format';

export type EstimateItem = {
  targetSets: number;
  restSeconds: number;
  targetDistanceM?: number | null;
  targetDurationS?: number | null;
  /** Exercice de course (compté dans « X km de course »). */
  running?: boolean;
};

export type EstimateBlock = { type: BlockType; config: JsonObject; items: readonly EstimateItem[] };

const MIN = 60;
// Course sans durée cible : allure supposée de 6:00 /km.
const SECONDS_PER_M = 0.36;
const HYROX_SECONDS = { full: 90 * MIN, half: 45 * MIN, station: 10 * MIN } as const;

/** Durée d'un bloc en secondes. */
export function blockSeconds(block: EstimateBlock): number {
  switch (block.type) {
    case 'strength':
      return block.items.reduce(
        (sum, i) => sum + i.targetSets * (SECONDS_PER_SET + i.restSeconds),
        0,
      );
    case 'warmup':
      return (parseBlockConfig('warmup', block.config).durationMin ?? 10) * MIN;
    case 'hyrox':
      return HYROX_SECONDS[parseBlockConfig('hyrox', block.config).format];
    case 'circuit': {
      const config = parseBlockConfig('circuit', block.config);
      switch (config.format) {
        case 'amrap':
          return config.durationS;
        case 'emom':
          return config.intervalS * config.rounds;
        case 'tabata':
          return (config.workS + config.restS) * config.rounds;
        case 'for_time':
          return config.timeCapS ?? 15 * MIN;
      }
      break;
    }
    case 'cardio': {
      if (block.items.length === 0) return 30 * MIN;
      return block.items.reduce((sum, i) => {
        const effort =
          i.targetDurationS ?? (i.targetDistanceM ? i.targetDistanceM * SECONDS_PER_M : 0);
        return sum + i.targetSets * (effort + i.restSeconds);
      }, 0);
    }
  }
  return 0;
}

/** Somme des blocs, arrondie à 5 min. */
export function estimateTemplateMinutes(blocks: readonly EstimateBlock[]): number {
  const seconds = blocks.reduce((sum, block) => sum + blockSeconds(block), 0);
  return Math.round(seconds / MIN / 5) * 5;
}

/** Kilomètres de course : courses Hyrox et exercices de course des blocs cardio. */
export function runningKm(blocks: readonly EstimateBlock[]): number {
  const meters = blocks.reduce((sum, block) => {
    if (block.type === 'hyrox')
      return sum + hyroxRunDistanceM(parseBlockConfig('hyrox', block.config));
    if (block.type !== 'cardio') return sum;
    return (
      sum +
      block.items.reduce((s, i) => s + (i.running ? (i.targetDistanceM ?? 0) * i.targetSets : 0), 0)
    );
  }, 0);
  return Math.round(meters / 100) / 10;
}

type BlockRow = { id: string; type: BlockType; config: JsonObject };
type ItemRow = {
  blockId: string | null;
  targetSets: number;
  restSeconds: number;
  targetDistanceM: number | null;
  targetDurationS: number | null;
  discipline: string;
};

/**
 * Durée et kilomètres d'une séance type à partir de ses lignes en base. Sans bloc (séance V1 pas
 * encore reprise) ou exercice sans bloc : bloc Musculation, comme en V1.
 */
export function estimateTemplate(
  blocks: readonly BlockRow[],
  items: readonly ItemRow[],
): { minutes: number; km: number } {
  const toItem = (i: ItemRow): EstimateItem => ({
    targetSets: i.targetSets,
    restSeconds: i.restSeconds,
    targetDistanceM: i.targetDistanceM,
    targetDurationS: i.targetDurationS,
    running: i.discipline === 'running',
  });
  const known = new Set(blocks.map((b) => b.id));
  const orphans = items.filter((i) => !i.blockId || !known.has(i.blockId)).map(toItem);
  const estimateBlocks: EstimateBlock[] = blocks.map((block) => ({
    type: block.type,
    config: block.config,
    items: items.filter((i) => i.blockId === block.id).map(toItem),
  }));
  if (orphans.length > 0) estimateBlocks.push({ type: 'strength', config: {}, items: orphans });
  return { minutes: estimateTemplateMinutes(estimateBlocks), km: runningKm(estimateBlocks) };
}
