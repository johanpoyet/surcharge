import { randomUUID } from 'expo-crypto';

import type { Goal, ProfileRow, WeightUnit } from '@/lib/database.types';
import { toLocalDateString } from '@/lib/format';
import { supabase } from '@/lib/supabase';

// Phase 2 : écriture directe dans Supabase (l'onboarding se fait juste après l'inscription,
// donc en ligne). La Phase 3 passera par SQLite + outbox.

export type OnboardingValues = {
  weightKg: number;
  weightUnit: WeightUnit;
  goal: Goal;
  sessionsPerWeek: number;
};

export async function saveOnboarding(userId: string, values: OnboardingValues): Promise<void> {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      goal: values.goal,
      sessions_per_week: values.sessionsPerWeek,
      weight_unit: values.weightUnit,
    })
    .eq('id', userId);
  if (profileError) throw profileError;

  const { error: weightError } = await supabase.from('body_weights').insert({
    id: randomUUID(),
    user_id: userId,
    measured_on: toLocalDateString(new Date()),
    weight_kg: Math.round(values.weightKg * 100) / 100,
  });
  if (weightError) throw weightError;
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
