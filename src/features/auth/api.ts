import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';
import type { LoginValues, SignupValues } from './schemas';

// Les erreurs Supabase sont relancées : les écrans les traduisent avec `authErrorMessage`.

export async function signIn({ email, password }: LoginValues): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Le prénom part dans les métadonnées : le trigger `on_auth_user_created` crée le profil. */
export async function signUp({ firstName, email, password }: SignupValues): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName } },
  });
  if (error) throw error;
  // Sans session, Supabase exige la confirmation de l'e-mail (réglage « Confirm email »).
  if (!data.session) throw new EmailConfirmationRequiredError();
}

export class EmailConfirmationRequiredError extends Error {
  constructor() {
    super('Confirmation de l’e-mail requise');
    this.name = 'EmailConfirmationRequiredError';
  }
}

/** Envoie le lien de réinitialisation ; il rouvre l'app sur `/reset-password?code=…`. */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL('/reset-password'),
  });
  if (error) throw error;
}

export async function exchangeResetCode(code: string): Promise<void> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
