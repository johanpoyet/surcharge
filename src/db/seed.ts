import type { Discipline, Equipment, MuscleGroup, TrackingType } from './schema';

export type SeedExercise = {
  /** Identifiant canonique (`exercises.catalog_key`), stable entre comptes et appareils. */
  catalogKey: string;
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  discipline: Discipline;
  trackingType: TrackingType;
};

const strength = (
  catalogKey: string,
  name: string,
  muscle: MuscleGroup,
  equipment: Equipment,
): SeedExercise => ({
  catalogKey,
  name,
  muscle,
  equipment,
  discipline: 'strength',
  trackingType: 'weight_reps',
});

/**
 * Bibliothèque par défaut ajoutée à la fin de l'onboarding (sans photo). Ce sont des données :
 * l'utilisateur peut les renommer ou les supprimer.
 */
export const DEFAULT_EXERCISES: readonly SeedExercise[] = [
  // Pecs
  strength('bench_press', 'Développé couché', 'chest', 'barbell'),
  strength('incline_dumbbell_press', 'Développé incliné haltères', 'chest', 'dumbbell'),
  strength('dumbbell_bench_press', 'Développé couché haltères', 'chest', 'dumbbell'),
  strength('cable_fly', 'Écarté à la poulie', 'chest', 'cable'),
  strength('pec_deck', 'Pec deck', 'chest', 'machine'),
  strength('push_up', 'Pompes', 'chest', 'bodyweight'),
  strength('dips', 'Dips', 'chest', 'bodyweight'),
  // Dos
  strength('pull_up', 'Tractions', 'back', 'bodyweight'),
  strength('lat_pulldown', 'Tirage vertical', 'back', 'cable'),
  strength('seated_cable_row', 'Tirage horizontal', 'back', 'cable'),
  strength('barbell_row', 'Rowing barre', 'back', 'barbell'),
  strength('dumbbell_row', 'Rowing haltère', 'back', 'dumbbell'),
  strength('deadlift', 'Soulevé de terre', 'back', 'barbell'),
  // Épaules
  strength('overhead_press', 'Développé militaire', 'shoulders', 'barbell'),
  strength('seated_dumbbell_press', 'Développé haltères assis', 'shoulders', 'dumbbell'),
  strength('lateral_raise', 'Élévations latérales', 'shoulders', 'dumbbell'),
  strength('rear_delt_fly', 'Oiseau', 'shoulders', 'dumbbell'),
  strength('face_pull', 'Face pull', 'shoulders', 'cable'),
  // Jambes
  strength('squat', 'Squat', 'legs', 'barbell'),
  strength('leg_press', 'Presse à cuisses', 'legs', 'machine'),
  strength('dumbbell_lunge', 'Fentes haltères', 'legs', 'dumbbell'),
  strength('romanian_deadlift', 'Soulevé de terre roumain', 'legs', 'barbell'),
  strength('leg_extension', 'Leg extension', 'legs', 'machine'),
  strength('leg_curl', 'Leg curl', 'legs', 'machine'),
  strength('hip_thrust', 'Hip thrust', 'legs', 'barbell'),
  strength('standing_calf_raise', 'Mollets debout', 'legs', 'machine'),
  // Bras
  strength('barbell_curl', 'Curl barre', 'arms', 'barbell'),
  strength('dumbbell_curl', 'Curl haltères', 'arms', 'dumbbell'),
  strength('hammer_curl', 'Curl marteau', 'arms', 'dumbbell'),
  strength('triceps_pushdown', 'Extension triceps poulie', 'arms', 'cable'),
  strength('skull_crusher', 'Barre au front', 'arms', 'barbell'),
  // Abdos
  strength('crunch', 'Crunch', 'abs', 'bodyweight'),
  strength('leg_raise', 'Relevé de jambes', 'abs', 'bodyweight'),
  strength('cable_crunch', 'Crunch à la poulie', 'abs', 'cable'),
];

/** Exercices courants de course (saisie manuelle : distance + temps). */
export const RUNNING_EXERCISES: readonly SeedExercise[] = [
  {
    catalogKey: 'run_easy',
    name: 'Footing',
    muscle: 'legs',
    equipment: 'bodyweight',
    discipline: 'running',
    trackingType: 'distance_time',
  },
  {
    catalogKey: 'run_intervals',
    name: 'Fractionné',
    muscle: 'legs',
    equipment: 'bodyweight',
    discipline: 'running',
    trackingType: 'distance_time',
  },
  {
    catalogKey: 'run_tempo',
    name: 'Allure tempo',
    muscle: 'legs',
    equipment: 'bodyweight',
    discipline: 'running',
    trackingType: 'distance_time',
  },
  {
    catalogKey: 'run_long',
    name: 'Sortie longue',
    muscle: 'legs',
    equipment: 'bodyweight',
    discipline: 'running',
    trackingType: 'distance_time',
  },
  {
    catalogKey: 'run_treadmill',
    name: 'Tapis de course',
    muscle: 'legs',
    equipment: 'machine',
    discipline: 'running',
    trackingType: 'distance_time',
  },
];

/** Mouvements courants de cross-training (WOD). */
export const CROSS_TRAINING_EXERCISES: readonly SeedExercise[] = [
  {
    catalogKey: 'burpee',
    name: 'Burpees',
    muscle: 'other',
    equipment: 'bodyweight',
    discipline: 'cross_training',
    trackingType: 'reps',
  },
  {
    catalogKey: 'box_jump',
    name: 'Box jumps',
    muscle: 'legs',
    equipment: 'other',
    discipline: 'cross_training',
    trackingType: 'reps',
  },
  {
    catalogKey: 'kettlebell_swing',
    name: 'Kettlebell swing',
    muscle: 'legs',
    equipment: 'other',
    discipline: 'cross_training',
    trackingType: 'weight_reps',
  },
  {
    catalogKey: 'thruster',
    name: 'Thrusters',
    muscle: 'legs',
    equipment: 'barbell',
    discipline: 'cross_training',
    trackingType: 'weight_reps',
  },
  {
    catalogKey: 'wall_ball',
    name: 'Wall balls',
    muscle: 'legs',
    equipment: 'other',
    discipline: 'cross_training',
    trackingType: 'reps',
  },
  {
    catalogKey: 'double_under',
    name: 'Double unders',
    muscle: 'other',
    equipment: 'other',
    discipline: 'cross_training',
    trackingType: 'reps',
  },
  {
    catalogKey: 'toes_to_bar',
    name: 'Toes to bar',
    muscle: 'abs',
    equipment: 'bodyweight',
    discipline: 'cross_training',
    trackingType: 'reps',
  },
  {
    catalogKey: 'assault_bike',
    name: 'Assault bike',
    muscle: 'other',
    equipment: 'machine',
    discipline: 'cross_training',
    trackingType: 'calories',
  },
  {
    catalogKey: 'row_erg',
    name: 'Rameur',
    muscle: 'back',
    equipment: 'machine',
    discipline: 'cross_training',
    trackingType: 'distance_time',
  },
  {
    catalogKey: 'plank',
    name: 'Gainage',
    muscle: 'abs',
    equipment: 'bodyweight',
    discipline: 'cross_training',
    trackingType: 'time',
  },
];

/** Pas des boutons + / − par défaut : 5 kg sur machine, 2,5 kg sinon (SPEC section 8). */
export const defaultWeightStep = (equipment: Equipment): number =>
  equipment === 'machine' ? 5 : 2.5;
