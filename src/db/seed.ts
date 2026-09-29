import type { Equipment, MuscleGroup } from './schema';

export type SeedExercise = { name: string; muscle: MuscleGroup; equipment: Equipment };

/**
 * Bibliothèque par défaut ajoutée à la fin de l'onboarding (sans photo). Ce sont des données :
 * l'utilisateur peut les renommer ou les supprimer.
 */
export const DEFAULT_EXERCISES: readonly SeedExercise[] = [
  // Pecs
  { name: 'Développé couché', muscle: 'chest', equipment: 'barbell' },
  { name: 'Développé incliné haltères', muscle: 'chest', equipment: 'dumbbell' },
  { name: 'Développé couché haltères', muscle: 'chest', equipment: 'dumbbell' },
  { name: 'Écarté à la poulie', muscle: 'chest', equipment: 'cable' },
  { name: 'Pec deck', muscle: 'chest', equipment: 'machine' },
  { name: 'Pompes', muscle: 'chest', equipment: 'bodyweight' },
  { name: 'Dips', muscle: 'chest', equipment: 'bodyweight' },
  // Dos
  { name: 'Tractions', muscle: 'back', equipment: 'bodyweight' },
  { name: 'Tirage vertical', muscle: 'back', equipment: 'cable' },
  { name: 'Tirage horizontal', muscle: 'back', equipment: 'cable' },
  { name: 'Rowing barre', muscle: 'back', equipment: 'barbell' },
  { name: 'Rowing haltère', muscle: 'back', equipment: 'dumbbell' },
  { name: 'Soulevé de terre', muscle: 'back', equipment: 'barbell' },
  // Épaules
  { name: 'Développé militaire', muscle: 'shoulders', equipment: 'barbell' },
  { name: 'Développé haltères assis', muscle: 'shoulders', equipment: 'dumbbell' },
  { name: 'Élévations latérales', muscle: 'shoulders', equipment: 'dumbbell' },
  { name: 'Oiseau', muscle: 'shoulders', equipment: 'dumbbell' },
  { name: 'Face pull', muscle: 'shoulders', equipment: 'cable' },
  // Jambes
  { name: 'Squat', muscle: 'legs', equipment: 'barbell' },
  { name: 'Presse à cuisses', muscle: 'legs', equipment: 'machine' },
  { name: 'Fentes haltères', muscle: 'legs', equipment: 'dumbbell' },
  { name: 'Soulevé de terre roumain', muscle: 'legs', equipment: 'barbell' },
  { name: 'Leg extension', muscle: 'legs', equipment: 'machine' },
  { name: 'Leg curl', muscle: 'legs', equipment: 'machine' },
  { name: 'Hip thrust', muscle: 'legs', equipment: 'barbell' },
  { name: 'Mollets debout', muscle: 'legs', equipment: 'machine' },
  // Bras
  { name: 'Curl barre', muscle: 'arms', equipment: 'barbell' },
  { name: 'Curl haltères', muscle: 'arms', equipment: 'dumbbell' },
  { name: 'Curl marteau', muscle: 'arms', equipment: 'dumbbell' },
  { name: 'Extension triceps poulie', muscle: 'arms', equipment: 'cable' },
  { name: 'Barre au front', muscle: 'arms', equipment: 'barbell' },
  // Abdos
  { name: 'Crunch', muscle: 'abs', equipment: 'bodyweight' },
  { name: 'Relevé de jambes', muscle: 'abs', equipment: 'bodyweight' },
  { name: 'Crunch à la poulie', muscle: 'abs', equipment: 'cable' },
];

/** Pas des boutons + / − par défaut : 5 kg sur machine, 2,5 kg sinon (SPEC section 8). */
export const defaultWeightStep = (equipment: Equipment): number =>
  equipment === 'machine' ? 5 : 2.5;
