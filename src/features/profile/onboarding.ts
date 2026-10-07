import { db } from '@/db/client';
import { ensureCatalogExercises } from '@/features/exercises/catalog';
import { seedDefaultExercises } from '@/features/exercises/repository';
import { fetchProfile, saveOnboarding, type OnboardingValues } from './api';
import { markDisciplinesAsked } from './disciplines';
import { saveBodyWeight, saveRemoteProfile } from './repository';

/** Fin de l'onboarding : Supabase, copie locale, puis bibliothèque d'exercices par défaut. */
export async function completeOnboarding(userId: string, values: OnboardingValues): Promise<void> {
  const { profile, bodyWeight } = await saveOnboarding(userId, values);
  saveRemoteProfile(db, profile);
  saveBodyWeight(db, userId, bodyWeight.measuredOn, bodyWeight.weightKg, {
    synced: true,
    id: bodyWeight.id,
  });
  seedDefaultExercises(db, userId);
  // Catalogue des autres disciplines choisies (course, cross-training, Hyrox).
  ensureCatalogExercises(db, userId, values.disciplines);
  await markDisciplinesAsked(userId);
}

/** « Passer cette étape » : profil local si le réseau répond, bibliothèque dans tous les cas. */
export async function skipOnboarding(userId: string): Promise<void> {
  seedDefaultExercises(db, userId);
  try {
    const profile = await fetchProfile(userId);
    if (profile) saveRemoteProfile(db, profile);
  } catch {
    // Hors ligne : le profil sera récupéré plus tard (useProfile).
  }
}
