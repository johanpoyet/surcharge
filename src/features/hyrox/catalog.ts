// Catalogue Hyrox (SPEC_V2 §4.3) : ordre officiel 8 × (1 km de course + 1 station).
// Les charges par division sont ici, jamais en dur dans les écrans.
// TODO vérifier : toutes les charges ci-dessous sont à contrôler sur hyrox.com avant la mise en
// production (liste dans docs/DECISIONS.md).

import type { SeedExercise } from '@/db/seed';

export type HyroxDivision =
  'open_men' | 'open_women' | 'pro_men' | 'pro_women' | 'doubles' | 'custom';

export type HyroxStationKey =
  | 'skierg'
  | 'sled_push'
  | 'sled_pull'
  | 'burpee_broad_jumps'
  | 'rowing'
  | 'farmers_carry'
  | 'sandbag_lunges'
  | 'wall_balls';

/** Charge d'une station par division (kg). `custom` : pas de charge imposée. */
type DivisionWeights = Record<Exclude<HyroxDivision, 'custom'>, number>;

export type HyroxStation = {
  key: HyroxStationKey;
  exercise: SeedExercise;
  /** Distance de la station (m), ou nombre de répétitions pour les wall balls. */
  distanceM?: number;
  reps?: number;
  /** Charge par division ; pour les Farmers, charge de chaque kettlebell (2 × …). */
  weights?: DivisionWeights;
  /** Nombre de charges portées (2 kettlebells aux Farmers). */
  weightCount?: number;
};

const hyrox = (
  catalogKey: string,
  name: string,
  trackingType: SeedExercise['trackingType'],
  equipment: SeedExercise['equipment'],
  muscle: SeedExercise['muscle'] = 'other',
): SeedExercise => ({ catalogKey, name, muscle, equipment, discipline: 'hyrox', trackingType });

/** Course entre les stations : 1 km, 8 fois. */
export const HYROX_RUN = {
  exercise: hyrox('hyrox_run', 'Hyrox Run 1 km', 'distance_time', 'bodyweight', 'legs'),
  distanceM: 1000,
} as const;

export const HYROX_STATIONS: readonly HyroxStation[] = [
  {
    key: 'skierg',
    exercise: hyrox('hyrox_skierg', 'SkiErg', 'distance_time', 'machine'),
    distanceM: 1000,
  },
  {
    key: 'sled_push',
    exercise: hyrox('hyrox_sled_push', 'Sled Push', 'weight_distance', 'other', 'legs'),
    distanceM: 50,
    // TODO vérifier (charge traîneau compris)
    weights: { open_women: 102, open_men: 152, pro_women: 152, pro_men: 202, doubles: 152 },
  },
  {
    key: 'sled_pull',
    exercise: hyrox('hyrox_sled_pull', 'Sled Pull', 'weight_distance', 'other', 'back'),
    distanceM: 50,
    // TODO vérifier (charge traîneau compris)
    weights: { open_women: 78, open_men: 103, pro_women: 103, pro_men: 153, doubles: 103 },
  },
  {
    key: 'burpee_broad_jumps',
    exercise: hyrox(
      'hyrox_burpee_broad_jumps',
      'Burpee Broad Jumps',
      'distance_time',
      'bodyweight',
    ),
    distanceM: 80,
  },
  {
    key: 'rowing',
    exercise: hyrox('hyrox_rowing', 'Rowing', 'distance_time', 'machine', 'back'),
    distanceM: 1000,
  },
  {
    key: 'farmers_carry',
    exercise: hyrox('hyrox_farmers_carry', 'Farmers Carry', 'weight_distance', 'other'),
    distanceM: 200,
    weightCount: 2,
    // TODO vérifier (par kettlebell)
    weights: { open_women: 16, open_men: 24, pro_women: 24, pro_men: 32, doubles: 24 },
  },
  {
    key: 'sandbag_lunges',
    exercise: hyrox('hyrox_sandbag_lunges', 'Sandbag Lunges', 'weight_distance', 'other', 'legs'),
    distanceM: 100,
    // TODO vérifier
    weights: { open_women: 10, open_men: 20, pro_women: 20, pro_men: 30, doubles: 20 },
  },
  {
    key: 'wall_balls',
    exercise: hyrox('hyrox_wall_balls', 'Wall Balls', 'reps', 'other', 'legs'),
    reps: 100,
    // TODO vérifier (médecine-ball)
    weights: { open_women: 4, open_men: 6, pro_women: 6, pro_men: 9, doubles: 6 },
  },
];

/** Exercices à ajouter à la bibliothèque pour la discipline Hyrox (course + 8 stations). */
export const HYROX_EXERCISES: readonly SeedExercise[] = [
  HYROX_RUN.exercise,
  ...HYROX_STATIONS.map((station) => station.exercise),
];

/** Charge d'une station pour une division (undefined : pas de charge ou division libre). */
export function stationWeight(station: HyroxStation, division: HyroxDivision): number | undefined {
  return division === 'custom' ? undefined : station.weights?.[division];
}
