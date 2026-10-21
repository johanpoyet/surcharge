// Liens d'invitation (SPEC_V2 §7.2) : https://johanpoyet.fr/s/{code}, ou surcharge://add/{code}
// en secours. Fonctions pures.

export const INVITE_BASE = 'https://johanpoyet.fr/s/';

export const inviteUrl = (code: string) => `${INVITE_BASE}${encodeURIComponent(code)}`;

const CODE = /^[A-Z]{1,8}-[A-Z2-9]{3}$/;

/** Code ami lu dans un QR, un lien ou une saisie ; null si ce n'en est pas un. */
export function parseInviteCode(text: string): string | null {
  const value = text.trim();
  const fromLink = /(?:johanpoyet\.fr\/s\/|surcharge:\/\/+add\/)([^/?#\s]+)/i.exec(value)?.[1];
  const candidate = decodeURIComponent(fromLink ?? value).toUpperCase();
  return CODE.test(candidate) ? candidate : null;
}
