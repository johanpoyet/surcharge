import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppDatabase } from '@/db/client';
import type { Discipline } from '@/db/schema';
import { ensureCatalogExercises } from '@/features/exercises/catalog';
import { updateProfile } from './repository';

/** Disciplines proposées (onboarding, feuille du premier lancement de la V2, profil). */
export const DISCIPLINE_CHOICES: readonly Discipline[] = [
  'strength',
  'running',
  'cross_training',
  'hyrox',
];

/**
 * Enregistre les disciplines du profil (SPEC_V2 §5.5) et ajoute à la bibliothèque le catalogue
 * des disciplines choisies (exercices de course, de cross-training, stations Hyrox).
 */
export function saveDisciplines(
  db: AppDatabase,
  userId: string,
  disciplines: readonly Discipline[],
) {
  const chosen = disciplines.length > 0 ? [...disciplines] : ['strength' as const];
  updateProfile(db, userId, { disciplines: chosen });
  ensureCatalogExercises(db, userId, chosen);
}

// Question posée une fois par compte et par appareil (comptes V1 : feuille au premier lancement).
const askedKey = (userId: string) => `surcharge.disciplinesAsked.${userId}`;

export async function disciplinesAsked(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(askedKey(userId))) === '1';
  } catch {
    return true;
  }
}

export async function markDisciplinesAsked(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(askedKey(userId), '1');
  } catch {
    // Au pire, la question sera reposée.
  }
}
