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

/** Variante d'un exercice du catalogue avec un autre type de suivi ou une autre discipline. */
const exercise = (
  catalogKey: string,
  name: string,
  muscle: MuscleGroup,
  equipment: Equipment,
  trackingType: TrackingType,
  discipline: Discipline = 'strength',
): SeedExercise => ({ catalogKey, name, muscle, equipment, discipline, trackingType });

/**
 * Catalogue de musculation complet (retours des testeurs : « pas assez d'exercices »). Ajouté à la
 * bibliothèque de chacun avec les exercices par défaut ; noms tels qu'on les dit en salle.
 */
export const MORE_STRENGTH_EXERCISES: readonly SeedExercise[] = [
  // Pecs
  strength('incline_bench_press', 'Développé incliné barre', 'chest', 'barbell'),
  strength('decline_bench_press', 'Développé décliné barre', 'chest', 'barbell'),
  strength('decline_dumbbell_press', 'Développé décliné haltères', 'chest', 'dumbbell'),
  strength('dumbbell_fly', 'Écarté haltères', 'chest', 'dumbbell'),
  strength('incline_dumbbell_fly', 'Écarté incliné haltères', 'chest', 'dumbbell'),
  strength('machine_chest_press', 'Développé couché à la machine', 'chest', 'machine'),
  strength('incline_machine_press', 'Développé incliné à la machine', 'chest', 'machine'),
  strength('smith_bench_press', 'Développé couché à la Smith machine', 'chest', 'machine'),
  strength('low_cable_fly', 'Écarté poulie basse', 'chest', 'cable'),
  strength('high_cable_fly', 'Écarté poulie haute', 'chest', 'cable'),
  strength('dumbbell_pullover', 'Pull-over haltère', 'chest', 'dumbbell'),
  strength('decline_push_up', 'Pompes déclinées', 'chest', 'bodyweight'),
  // Dos
  strength('chin_up', 'Tractions supination', 'back', 'bodyweight'),
  strength('assisted_pull_up', 'Tractions assistées', 'back', 'machine'),
  strength('machine_lat_pulldown', 'Tirage vertical à la machine', 'back', 'machine'),
  strength('close_grip_lat_pulldown', 'Tirage vertical prise serrée', 'back', 'cable'),
  strength('straight_arm_pulldown', 'Tirage bras tendus', 'back', 'cable'),
  strength('t_bar_row', 'Rowing T-bar', 'back', 'barbell'),
  strength('pendlay_row', 'Rowing Pendlay', 'back', 'barbell'),
  strength('seated_machine_row', 'Rowing assis à la machine', 'back', 'machine'),
  strength('chest_supported_row', 'Rowing buste appuyé', 'back', 'dumbbell'),
  strength('single_arm_cable_row', 'Rowing unilatéral poulie', 'back', 'cable'),
  strength('inverted_row', 'Rowing inversé', 'back', 'bodyweight'),
  strength('rack_pull', 'Rack pull', 'back', 'barbell'),
  strength('back_extension', 'Extensions lombaires', 'back', 'bodyweight'),
  strength('barbell_shrug', 'Shrugs barre', 'back', 'barbell'),
  strength('dumbbell_shrug', 'Shrugs haltères', 'back', 'dumbbell'),
  // Épaules
  strength('arnold_press', 'Développé Arnold', 'shoulders', 'dumbbell'),
  strength('standing_dumbbell_press', 'Développé haltères debout', 'shoulders', 'dumbbell'),
  strength('machine_shoulder_press', 'Développé épaules à la machine', 'shoulders', 'machine'),
  strength('push_press', 'Push press', 'shoulders', 'barbell'),
  strength('landmine_press', 'Développé landmine', 'shoulders', 'barbell'),
  strength('cable_lateral_raise', 'Élévations latérales poulie', 'shoulders', 'cable'),
  strength('machine_lateral_raise', 'Élévations latérales à la machine', 'shoulders', 'machine'),
  strength('front_raise', 'Élévations frontales', 'shoulders', 'dumbbell'),
  strength('reverse_pec_deck', 'Oiseau à la machine', 'shoulders', 'machine'),
  strength('cable_rear_delt_fly', 'Oiseau à la poulie', 'shoulders', 'cable'),
  strength('upright_row', 'Rowing menton', 'shoulders', 'barbell'),
  // Jambes
  strength('front_squat', 'Squat avant', 'legs', 'barbell'),
  strength('goblet_squat', 'Goblet squat', 'legs', 'dumbbell'),
  strength('hack_squat', 'Hack squat', 'legs', 'machine'),
  strength('smith_squat', 'Squat à la Smith machine', 'legs', 'machine'),
  strength('pendulum_squat', 'Pendulum squat', 'legs', 'machine'),
  strength('sumo_squat', 'Squat sumo haltère', 'legs', 'dumbbell'),
  strength('bulgarian_split_squat', 'Squat bulgare', 'legs', 'dumbbell'),
  strength('pistol_squat', 'Pistol squat', 'legs', 'bodyweight'),
  strength('walking_lunge', 'Fentes marchées', 'legs', 'dumbbell'),
  strength('reverse_lunge', 'Fentes arrière', 'legs', 'dumbbell'),
  strength('barbell_lunge', 'Fentes barre', 'legs', 'barbell'),
  strength('step_up', 'Montées sur banc', 'legs', 'dumbbell'),
  strength('sumo_deadlift', 'Soulevé de terre sumo', 'legs', 'barbell'),
  strength('trap_bar_deadlift', 'Soulevé de terre trap bar', 'legs', 'other'),
  strength('dumbbell_rdl', 'Soulevé de terre roumain haltères', 'legs', 'dumbbell'),
  strength('single_leg_rdl', 'Soulevé de terre roumain unilatéral', 'legs', 'dumbbell'),
  strength('good_morning', 'Good morning', 'legs', 'barbell'),
  strength('seated_leg_curl', 'Leg curl assis', 'legs', 'machine'),
  strength('nordic_curl', 'Nordic curl', 'legs', 'bodyweight'),
  strength('glute_bridge', 'Pont fessier', 'legs', 'bodyweight'),
  strength('machine_hip_thrust', 'Hip thrust à la machine', 'legs', 'machine'),
  strength('cable_kickback', 'Kickback fessier poulie', 'legs', 'cable'),
  strength('hip_abduction', 'Abducteurs à la machine', 'legs', 'machine'),
  strength('hip_adduction', 'Adducteurs à la machine', 'legs', 'machine'),
  strength('seated_calf_raise', 'Mollets assis', 'legs', 'machine'),
  strength('leg_press_calf_raise', 'Mollets à la presse', 'legs', 'machine'),
  exercise('wall_sit', 'Chaise', 'legs', 'bodyweight', 'time'),
  // Bras
  strength('ez_bar_curl', 'Curl barre EZ', 'arms', 'barbell'),
  strength('incline_dumbbell_curl', 'Curl incliné haltères', 'arms', 'dumbbell'),
  strength('preacher_curl', 'Curl pupitre', 'arms', 'barbell'),
  strength('concentration_curl', 'Curl concentré', 'arms', 'dumbbell'),
  strength('cable_curl', 'Curl poulie', 'arms', 'cable'),
  strength('cable_hammer_curl', 'Curl marteau à la corde', 'arms', 'cable'),
  strength('machine_curl', 'Curl à la machine', 'arms', 'machine'),
  strength('reverse_curl', 'Curl inversé', 'arms', 'barbell'),
  strength('wrist_curl', 'Curl poignets', 'arms', 'barbell'),
  strength('close_grip_bench_press', 'Développé couché prise serrée', 'arms', 'barbell'),
  strength('overhead_triceps_extension', 'Extension triceps nuque haltère', 'arms', 'dumbbell'),
  strength(
    'cable_overhead_extension',
    'Extension triceps poulie au-dessus de la tête',
    'arms',
    'cable',
  ),
  strength('rope_pushdown', 'Extension triceps à la corde', 'arms', 'cable'),
  strength('triceps_kickback', 'Kickback triceps', 'arms', 'dumbbell'),
  strength('machine_triceps_extension', 'Extension triceps à la machine', 'arms', 'machine'),
  strength('bench_dips', 'Dips sur banc', 'arms', 'bodyweight'),
  strength('diamond_push_up', 'Pompes diamant', 'arms', 'bodyweight'),
  // Abdos
  exercise('side_plank', 'Gainage latéral', 'abs', 'bodyweight', 'time'),
  exercise('hollow_hold', 'Hollow hold', 'abs', 'bodyweight', 'time'),
  strength('hanging_leg_raise', 'Relevé de jambes suspendu', 'abs', 'bodyweight'),
  strength('ab_wheel', 'Roue abdominale', 'abs', 'other'),
  strength('russian_twist', 'Russian twist', 'abs', 'bodyweight'),
  strength('bicycle_crunch', 'Crunch bicyclette', 'abs', 'bodyweight'),
  strength('decline_crunch', 'Crunch décliné', 'abs', 'bodyweight'),
  strength('machine_crunch', 'Crunch à la machine', 'abs', 'machine'),
  strength('cable_woodchop', 'Woodchop poulie', 'abs', 'cable'),
  strength('pallof_press', 'Pallof press', 'abs', 'cable'),
  strength('dead_bug', 'Dead bug', 'abs', 'bodyweight'),
  exercise('mountain_climber', 'Mountain climbers', 'abs', 'bodyweight', 'reps'),
];

/** Machines de cardio de la salle : pour tout le monde, quelles que soient les disciplines. */
export const CARDIO_EXERCISES: readonly SeedExercise[] = [
  exercise('treadmill_walk', 'Marche inclinée sur tapis', 'legs', 'machine', 'time', 'other'),
  exercise('bike_erg', 'Vélo d’appartement', 'legs', 'machine', 'time', 'other'),
  exercise('elliptical', 'Vélo elliptique', 'legs', 'machine', 'time', 'other'),
  exercise('stair_climber', 'Escalier (stepper)', 'legs', 'machine', 'time', 'other'),
  exercise('row_erg_distance', 'Rameur (distance)', 'back', 'machine', 'distance_time', 'other'),
  exercise('jump_rope', 'Corde à sauter', 'other', 'other', 'time', 'other'),
  exercise('swimming', 'Natation', 'other', 'other', 'distance_time', 'other'),
  exercise('cycling', 'Vélo (extérieur)', 'legs', 'other', 'distance_time', 'other'),
];

/** Exercices courants de course (saisie manuelle : distance + temps). */
export const RUNNING_EXERCISES: readonly SeedExercise[] = [
  exercise(
    'run_recovery',
    'Footing de récupération',
    'legs',
    'bodyweight',
    'distance_time',
    'running',
  ),
  exercise(
    'run_progressive',
    'Sortie progressive',
    'legs',
    'bodyweight',
    'distance_time',
    'running',
  ),
  exercise('run_fartlek', 'Fartlek', 'legs', 'bodyweight', 'distance_time', 'running'),
  exercise('run_hills', 'Côtes', 'legs', 'bodyweight', 'distance_time', 'running'),
  exercise('run_5k', '5 km', 'legs', 'bodyweight', 'distance_time', 'running'),
  exercise('run_10k', '10 km', 'legs', 'bodyweight', 'distance_time', 'running'),
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
  exercise(
    'power_clean',
    'Épaulé (power clean)',
    'legs',
    'barbell',
    'weight_reps',
    'cross_training',
  ),
  exercise('clean_and_jerk', 'Épaulé-jeté', 'legs', 'barbell', 'weight_reps', 'cross_training'),
  exercise('snatch', 'Arraché', 'legs', 'barbell', 'weight_reps', 'cross_training'),
  exercise('push_jerk', 'Push jerk', 'shoulders', 'barbell', 'weight_reps', 'cross_training'),
  exercise(
    'overhead_squat',
    'Squat bras tendus',
    'legs',
    'barbell',
    'weight_reps',
    'cross_training',
  ),
  exercise(
    'dumbbell_snatch',
    'Arraché haltère',
    'shoulders',
    'dumbbell',
    'weight_reps',
    'cross_training',
  ),
  exercise('devil_press', 'Devil press', 'other', 'dumbbell', 'weight_reps', 'cross_training'),
  exercise('air_squat', 'Air squats', 'legs', 'bodyweight', 'reps', 'cross_training'),
  exercise('sit_up', 'Sit-ups', 'abs', 'bodyweight', 'reps', 'cross_training'),
  exercise('muscle_up', 'Muscle-up', 'back', 'bodyweight', 'reps', 'cross_training'),
  exercise(
    'handstand_push_up',
    'Pompes en équilibre',
    'shoulders',
    'bodyweight',
    'reps',
    'cross_training',
  ),
  exercise('rope_climb', 'Montée de corde', 'back', 'other', 'reps', 'cross_training'),
  exercise('burpee_box_jump', 'Burpees box jump over', 'other', 'other', 'reps', 'cross_training'),
  exercise(
    'row_erg_calories',
    'Rameur (calories)',
    'back',
    'machine',
    'calories',
    'cross_training',
  ),
  exercise(
    'sled_push',
    'Poussée de traîneau',
    'legs',
    'other',
    'weight_distance',
    'cross_training',
  ),
  exercise('farmers_walk', 'Farmer walk', 'other', 'dumbbell', 'weight_distance', 'cross_training'),
  exercise(
    'sandbag_carry',
    'Port de sac de sable',
    'other',
    'other',
    'weight_distance',
    'cross_training',
  ),
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

/** Tout ce qui va dans la bibliothèque d'un compte, quelles que soient ses disciplines. */
export const BASE_EXERCISES: readonly SeedExercise[] = [
  ...DEFAULT_EXERCISES,
  ...MORE_STRENGTH_EXERCISES,
  ...CARDIO_EXERCISES,
];

/** Pas des boutons + / − par défaut : 5 kg sur machine, 2,5 kg sinon (SPEC section 8). */
export const defaultWeightStep = (equipment: Equipment): number =>
  equipment === 'machine' ? 5 : 2.5;
