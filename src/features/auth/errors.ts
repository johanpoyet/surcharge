import { isAuthError } from '@supabase/supabase-js';

import { fr } from '@/i18n/fr';

const e = fr.auth.errors;

/** Message français pour une erreur Supabase (auth ou base). */
export function authErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return e.invalidCredentials;
      case 'user_already_exists':
      case 'email_exists':
        return e.emailTaken;
      case 'weak_password':
        return e.weakPassword;
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return e.rateLimited;
      case 'email_not_confirmed':
        return e.emailNotConfirmed;
      case 'same_password':
        return e.samePassword;
      case 'email_provider_disabled':
      case 'signup_disabled':
        return e.signupDisabled;
    }
    if (error.name === 'AuthRetryableFetchError') return e.network;
  }
  if (error instanceof TypeError && /network/i.test(error.message)) return e.network;
  return e.generic;
}
