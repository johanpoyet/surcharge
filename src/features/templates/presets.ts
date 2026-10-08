// Séances toutes prêtes (retours des testeurs) : un catalogue de séances types qu'on copie dans
// ses séances, puis qu'on modifie librement. Les exercices sont désignés par leur clé du catalogue.

import type { BlockType, JsonObject } from '@/db/schema';

export type PresetCategory = 'strength' | 'hyrox' | 'running' | 'cross_training';
export type PresetLevel = 'beginner' | 'intermediate';

export type PresetItem = {
  key: string;
  sets: number;
  /** Reps cibles (min–max) ; une seule valeur pour un circuit. */
  reps?: [number, number];
  restS?: number;
  distanceM?: number;
  durationS?: number;
  calories?: number;
};

export type PresetBlock = {
  type: BlockType;
  name?: string;
  config?: JsonObject;
  items?: PresetItem[];
};

export type Preset = {
  key: string;
  category: PresetCategory;
  level: PresetLevel;
  name: string;
  blocks: PresetBlock[];
};

const lift = (key: string, sets: number, min: number, max: number, restS = 90): PresetItem => ({
  key,
  sets,
  reps: [min, max],
  restS,
});
const muscu = (...items: PresetItem[]): PresetBlock => ({ type: 'strength', items });
const reps = (key: string, n: number): PresetItem => ({ key, sets: 1, reps: [n, n], restS: 0 });

export const PRESETS: readonly Preset[] = [
  // —— Musculation ——
  {
    key: 'full_body_beginner',
    category: 'strength',
    level: 'beginner',
    name: 'Full body débutant',
    blocks: [
      muscu(
        lift('goblet_squat', 3, 10, 12),
        lift('dumbbell_bench_press', 3, 10, 12),
        lift('lat_pulldown', 3, 10, 12),
        lift('dumbbell_rdl', 3, 10, 12),
        lift('seated_dumbbell_press', 3, 10, 12),
        lift('crunch', 3, 15, 15, 60),
      ),
    ],
  },
  {
    key: 'full_body_intermediate',
    category: 'strength',
    level: 'intermediate',
    name: 'Full body intermédiaire',
    blocks: [
      muscu(
        lift('squat', 4, 6, 8, 150),
        lift('bench_press', 4, 6, 8, 150),
        lift('barbell_row', 4, 8, 10, 120),
        lift('hip_thrust', 3, 8, 10, 120),
        lift('overhead_press', 3, 8, 10, 120),
        lift('hanging_leg_raise', 3, 10, 12, 60),
      ),
    ],
  },
  {
    key: 'push',
    category: 'strength',
    level: 'intermediate',
    name: 'Push',
    blocks: [
      muscu(
        lift('bench_press', 4, 6, 8, 150),
        lift('incline_dumbbell_press', 3, 8, 10, 120),
        lift('overhead_press', 3, 8, 10, 120),
        lift('lateral_raise', 3, 12, 15, 60),
        lift('rope_pushdown', 3, 10, 12, 60),
      ),
    ],
  },
  {
    key: 'pull',
    category: 'strength',
    level: 'intermediate',
    name: 'Pull',
    blocks: [
      muscu(
        lift('pull_up', 4, 6, 10, 150),
        lift('barbell_row', 4, 8, 10, 120),
        lift('seated_cable_row', 3, 10, 12, 90),
        lift('face_pull', 3, 12, 15, 60),
        lift('ez_bar_curl', 3, 10, 12, 60),
        lift('hammer_curl', 3, 10, 12, 60),
      ),
    ],
  },
  {
    key: 'legs',
    category: 'strength',
    level: 'intermediate',
    name: 'Legs',
    blocks: [
      muscu(
        lift('squat', 4, 6, 8, 180),
        lift('leg_press', 3, 10, 12, 120),
        lift('romanian_deadlift', 3, 8, 10, 120),
        lift('seated_leg_curl', 3, 10, 12, 90),
        lift('leg_extension', 3, 12, 15, 60),
        lift('standing_calf_raise', 4, 12, 15, 60),
      ),
    ],
  },
  {
    key: 'upper',
    category: 'strength',
    level: 'intermediate',
    name: 'Haut du corps',
    blocks: [
      muscu(
        lift('bench_press', 4, 6, 8, 150),
        lift('barbell_row', 4, 6, 8, 150),
        lift('seated_dumbbell_press', 3, 8, 10, 120),
        lift('lat_pulldown', 3, 10, 12, 90),
        lift('dumbbell_curl', 3, 10, 12, 60),
        lift('rope_pushdown', 3, 10, 12, 60),
      ),
    ],
  },
  {
    key: 'lower',
    category: 'strength',
    level: 'intermediate',
    name: 'Bas du corps',
    blocks: [
      muscu(
        lift('squat', 4, 6, 8, 180),
        lift('romanian_deadlift', 3, 8, 10, 120),
        lift('bulgarian_split_squat', 3, 8, 10, 90),
        lift('leg_curl', 3, 10, 12, 90),
        lift('standing_calf_raise', 4, 12, 15, 60),
        lift('ab_wheel', 3, 10, 12, 60),
      ),
    ],
  },
  // —— Hyrox ——
  {
    key: 'hyrox_full',
    category: 'hyrox',
    level: 'intermediate',
    name: 'Simu Hyrox complète',
    blocks: [
      { type: 'warmup', config: { durationMin: 10, note: 'Footing léger + mobilité' } },
      { type: 'hyrox', config: { format: 'full', division: 'open_men' } },
    ],
  },
  {
    key: 'hyrox_half',
    category: 'hyrox',
    level: 'beginner',
    name: 'Demi Hyrox',
    blocks: [
      { type: 'warmup', config: { durationMin: 10, note: 'Footing léger + mobilité' } },
      { type: 'hyrox', config: { format: 'half', division: 'open_men' } },
    ],
  },
  {
    key: 'hyrox_stations',
    category: 'hyrox',
    level: 'intermediate',
    name: 'Travail des stations',
    blocks: [
      { type: 'warmup', config: { durationMin: 10 } },
      {
        type: 'circuit',
        config: { format: 'for_time', rounds: 3, timeCapS: 25 * 60 },
        items: [
          { key: 'row_erg_calories', sets: 1, calories: 20, restS: 0 },
          reps('wall_ball', 20),
          reps('walking_lunge', 20),
          reps('burpee', 10),
        ],
      },
    ],
  },
  // —— Course ——
  {
    key: 'run_easy_5k',
    category: 'running',
    level: 'beginner',
    name: 'Footing 5 km',
    blocks: [{ type: 'cardio', items: [{ key: 'run_easy', sets: 1, distanceM: 5000, restS: 0 }] }],
  },
  {
    key: 'run_intervals_400',
    category: 'running',
    level: 'intermediate',
    name: 'Fractionné 10 × 400 m',
    blocks: [
      { type: 'warmup', config: { durationMin: 15, note: 'Footing tranquille' } },
      {
        type: 'cardio',
        items: [{ key: 'run_intervals', sets: 10, distanceM: 400, restS: 90 }],
      },
    ],
  },
  {
    key: 'run_threshold',
    category: 'running',
    level: 'intermediate',
    name: 'Seuil 3 × 2 km',
    blocks: [
      { type: 'warmup', config: { durationMin: 15, note: 'Footing tranquille' } },
      { type: 'cardio', items: [{ key: 'run_tempo', sets: 3, distanceM: 2000, restS: 120 }] },
    ],
  },
  {
    key: 'run_long',
    category: 'running',
    level: 'intermediate',
    name: 'Sortie longue 12 km',
    blocks: [{ type: 'cardio', items: [{ key: 'run_long', sets: 1, distanceM: 12000, restS: 0 }] }],
  },
  // —— Cross-training ——
  {
    key: 'amrap_12',
    category: 'cross_training',
    level: 'beginner',
    name: 'AMRAP 12 min',
    blocks: [
      {
        type: 'circuit',
        config: { format: 'amrap', durationS: 12 * 60 },
        items: [reps('burpee', 10), reps('air_squat', 15), reps('sit_up', 20)],
      },
    ],
  },
  {
    key: 'emom_10',
    category: 'cross_training',
    level: 'intermediate',
    name: 'EMOM 10 min',
    blocks: [
      {
        type: 'circuit',
        config: { format: 'emom', intervalS: 60, rounds: 10 },
        items: [reps('kettlebell_swing', 15), reps('burpee', 5)],
      },
    ],
  },
  {
    key: 'tabata_burpees',
    category: 'cross_training',
    level: 'beginner',
    name: 'Tabata burpees',
    blocks: [
      {
        type: 'circuit',
        config: { format: 'tabata', workS: 20, restS: 10, rounds: 8 },
        items: [reps('burpee', 1)],
      },
    ],
  },
  {
    key: 'for_time_5',
    category: 'cross_training',
    level: 'intermediate',
    name: 'For Time 5 tours',
    blocks: [
      {
        type: 'circuit',
        config: { format: 'for_time', rounds: 5, timeCapS: 20 * 60 },
        items: [reps('pull_up', 10), reps('push_up', 15), reps('air_squat', 20)],
      },
    ],
  },
];

export const PRESET_CATEGORIES: readonly PresetCategory[] = [
  'strength',
  'hyrox',
  'running',
  'cross_training',
];
