// Pseudos interdits (exigence Apple : filtrer les contenus choquants). Même liste que la fonction
// SQL is_banned_username (supabase/migrations/0007_social.sql), qui fait foi côté serveur.

export const BANNED_WORDS: readonly string[] = [
  'admin',
  'moderateur',
  'moderator',
  'surcharge',
  'support',
  'staff',
  'pute',
  'putain',
  'salope',
  'connard',
  'connasse',
  'encule',
  'enculer',
  'batard',
  'nique',
  'niquer',
  'merde',
  'bite',
  'couille',
  'chatte',
  'pd',
  'pedale',
  'tapette',
  'negre',
  'bougnoul',
  'youpin',
  'nazi',
  'hitler',
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'dick',
  'nigger',
  'nigga',
  'fag',
  'faggot',
  'whore',
  'slut',
  'porn',
  'porno',
  'sex',
  'sexe',
  'viol',
  'rape',
];

export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

export type UsernameProblem = 'format' | 'banned';

/** Pseudo saisi → forme enregistrée (minuscules, sans espaces ni « @ »). */
export const normalizeUsername = (value: string): string =>
  value.trim().replace(/^@/, '').toLowerCase();

/** Vérification avant envoi ; le serveur refait le même contrôle (et l'unicité). */
export function usernameProblem(value: string): UsernameProblem | null {
  const name = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(name)) return 'format';
  const compact = name.replace(/[_.]/g, '');
  return BANNED_WORDS.some((word) => compact.includes(word)) ? 'banned' : null;
}
