import { randomUUID } from 'expo-crypto';

import type { Discipline, Goal, ProfileRow, WeightUnit } from '@/lib/database.types';
import { toLocalDateString } from '@/lib/format';
import { supabase } from '@/lib/supabase';

// L'onboarding suit l'inscription, donc se fait en ligne : écriture directe dans Supabase, puis
// copie locale déjà synchronisée (voir features/profile/onboarding.ts).

export type OnboardingValues = {
  weightKg: number;
  weightUnit: WeightUnit;
  goal: Goal;
  sessionsPerWeek: number;
  disciplines: Discipline[];
};

export type OnboardingResult = {
  profile: ProfileRow;
  bodyWeight: { id: string; measuredOn: string; weightKg: number };
};

/** Enregistre l'onboarding dans Supabase et renvoie ce qu'il faut recopier en local. */
export async function saveOnboarding(
  userId: string,
  values: OnboardingValues,
): Promise<OnboardingResult> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({
      goal: values.goal,
      sessions_per_week: values.sessionsPerWeek,
      weight_unit: values.weightUnit,
      disciplines: values.disciplines,
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (profileError) throw profileError;

  const bodyWeight = {
    id: randomUUID(),
    measuredOn: toLocalDateString(new Date()),
    weightKg: Math.round(values.weightKg * 100) / 100,
  };
  const { error: weightError } = await supabase.from('body_weights').insert({
    id: bodyWeight.id,
    user_id: userId,
    measured_on: bodyWeight.measuredOn,
    weight_kg: bodyWeight.weightKg,
  });
  if (weightError) throw weightError;

  return { profile, bodyWeight };
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
