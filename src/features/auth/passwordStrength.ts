export const PASSWORD_MIN_LENGTH = 8;

export type PasswordStrength = 'empty' | 'tooShort' | 'correct' | 'strong';

/** Jauge en 3 segments : trop court (1), correct (2), solide (3). */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 'empty';
  if (password.length < PASSWORD_MIN_LENGTH) return 'tooShort';
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  return password.length >= 12 && variety >= 3 ? 'strong' : 'correct';
}

export const strengthSegments: Record<PasswordStrength, number> = {
  empty: 0,
  tooShort: 1,
  correct: 2,
  strong: 3,
};
