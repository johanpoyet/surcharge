// Configuration des blocs (`config` jsonb, SPEC_V2 §4.2), validée avec zod à la lecture : une
// valeur inattendue (autre appareil, ancienne version) retombe sur la configuration par défaut.

import { z } from 'zod';

import type { BlockType, JsonObject } from '@/db/schema';

const HYROX_STATIONS = [
  'skierg',
  'sled_push',
  'sled_pull',
  'burpee_broad_jumps',
  'rowing',
  'farmers_carry',
  'sandbag_lunges',
  'wall_balls',
] as const;

export const warmupConfigSchema = z.object({
  durationMin: z.number().int().min(1).max(120).optional(),
  note: z.string().max(120).optional(),
});

/** Musculation et course / cardio : tout est dans les exercices du bloc (`template_exercises`). */
export const emptyConfigSchema = z.object({});

export const circuitConfigSchema = z.discriminatedUnion('format', [
  z.object({ format: z.literal('amrap'), durationS: z.number().int().min(60).max(3600) }),
  z.object({
    format: z.literal('emom'),
    intervalS: z.number().int().min(15).max(600),
    rounds: z.number().int().min(1).max(100),
  }),
  z.object({
    format: z.literal('for_time'),
    rounds: z.number().int().min(1).max(100),
    timeCapS: z.number().int().min(60).max(7200).optional(),
  }),
  z.object({
    format: z.literal('tabata'),
    workS: z.number().int().min(5).max(300),
    restS: z.number().int().min(0).max(300),
    rounds: z.number().int().min(1).max(50),
  }),
]);

export const hyroxConfigSchema = z.object({
  /** half = 4 courses + 4 stations ; station = une seule station. */
  format: z.enum(['full', 'half', 'station']),
  division: z.enum(['open_men', 'open_women', 'pro_men', 'pro_women', 'doubles', 'custom']),
  stations: z.array(z.enum(HYROX_STATIONS)).optional(),
  timeTransitions: z.boolean().optional(),
});

export type WarmupConfig = z.infer<typeof warmupConfigSchema>;
export type CircuitConfig = z.infer<typeof circuitConfigSchema>;
export type CircuitFormat = CircuitConfig['format'];
export type HyroxConfig = z.infer<typeof hyroxConfigSchema>;

export type BlockConfigs = {
  warmup: WarmupConfig;
  strength: Record<string, never>;
  cardio: Record<string, never>;
  circuit: CircuitConfig;
  hyrox: HyroxConfig;
};

const SCHEMAS: { [T in BlockType]: z.ZodType<BlockConfigs[T]> } = {
  warmup: warmupConfigSchema,
  strength: emptyConfigSchema as unknown as z.ZodType<Record<string, never>>,
  cardio: emptyConfigSchema as unknown as z.ZodType<Record<string, never>>,
  circuit: circuitConfigSchema,
  hyrox: hyroxConfigSchema,
};

/** Configuration d'un bloc neuf. */
export const DEFAULT_CONFIGS: BlockConfigs = {
  warmup: { durationMin: 10 },
  strength: {},
  cardio: {},
  circuit: { format: 'amrap', durationS: 12 * 60 },
  hyrox: { format: 'full', division: 'open_men' },
};

/** Paramètres par défaut quand on change le format d'un circuit. */
export const DEFAULT_CIRCUITS: { [F in CircuitFormat]: Extract<CircuitConfig, { format: F }> } = {
  amrap: { format: 'amrap', durationS: 12 * 60 },
  emom: { format: 'emom', intervalS: 60, rounds: 10 },
  for_time: { format: 'for_time', rounds: 3, timeCapS: 15 * 60 },
  tabata: { format: 'tabata', workS: 20, restS: 10, rounds: 8 },
};

/** Lit la configuration d'un bloc ; invalide ou absente → configuration par défaut. */
export function parseBlockConfig<T extends BlockType>(type: T, raw: unknown): BlockConfigs[T] {
  const result = SCHEMAS[type].safeParse(raw);
  return result.success ? result.data : DEFAULT_CONFIGS[type];
}

export const toJson = (config: BlockConfigs[BlockType]): JsonObject => ({ ...config });
