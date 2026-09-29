import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { fr } from '@/i18n/fr';
import { authErrorMessage } from '../errors';
import { passwordStrength } from '../passwordStrength';
import { loginSchema, signupSchema } from '../schemas';

describe('passwordStrength', () => {
  it('évalue la solidité', () => {
    expect(passwordStrength('')).toBe('empty');
    expect(passwordStrength('abc')).toBe('tooShort');
    expect(passwordStrength('motdepasse')).toBe('correct');
    expect(passwordStrength('Motdepasse123')).toBe('strong');
    expect(passwordStrength('motdepassemotdepasse')).toBe('correct');
  });
});

describe('schémas', () => {
  it("nettoie l'e-mail et refuse un e-mail invalide", () => {
    expect(loginSchema.parse({ email: ' johan@exemple.fr ', password: 'x' }).email).toBe(
      'johan@exemple.fr',
    );
    const result = loginSchema.safeParse({ email: 'johan', password: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(fr.auth.validation.email);
  });

  it('exige 8 caractères et les CGU à l’inscription', () => {
    const base = { firstName: 'Johan', email: 'johan@exemple.fr', password: 'motdepasse' };
    expect(signupSchema.safeParse({ ...base, acceptTerms: true }).success).toBe(true);
    const noTerms = signupSchema.safeParse({ ...base, acceptTerms: false });
    expect(noTerms.error?.issues[0]?.message).toBe(fr.auth.validation.terms);
    const short = signupSchema.safeParse({ ...base, password: 'court', acceptTerms: true });
    expect(short.error?.issues[0]?.message).toBe(fr.auth.validation.passwordLength);
  });
});

describe('authErrorMessage', () => {
  it('traduit les erreurs Supabase', () => {
    expect(authErrorMessage(new AuthApiError('x', 400, 'invalid_credentials'))).toBe(
      fr.auth.errors.invalidCredentials,
    );
    expect(authErrorMessage(new AuthApiError('x', 422, 'user_already_exists'))).toBe(
      fr.auth.errors.emailTaken,
    );
    expect(authErrorMessage(new AuthApiError('x', 400, 'email_provider_disabled'))).toBe(
      fr.auth.errors.signupDisabled,
    );
    expect(authErrorMessage(new AuthRetryableFetchError('x', 0))).toBe(fr.auth.errors.network);
    expect(authErrorMessage(new Error('???'))).toBe(fr.auth.errors.generic);
  });
});
