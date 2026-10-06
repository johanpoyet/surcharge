import type { Discipline, Equipment, MuscleGroup } from '@/db/schema';
import { fr } from '@/i18n/fr';

export const MUSCLES: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'arms',
  'abs',
  'other',
];

export const EQUIPMENTS: readonly Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'other',
];

export const muscleOptions = MUSCLES.map((value) => ({
  value,
  label: fr.exercises.muscles[value],
}));
export const equipmentOptions = EQUIPMENTS.map((value) => ({
  value,
  label: fr.exercises.equipment[value],
}));

/** Disciplines proposées pour un exercice (maquette exercice-type-suivi). */
export const DISCIPLINES: readonly Discipline[] = [
  'strength',
  'running',
  'cross_training',
  'hyrox',
];

export const disciplineOptions = DISCIPLINES.map((value) => ({
  value,
  label: fr.exercises.tracking.disciplines[value],
}));
