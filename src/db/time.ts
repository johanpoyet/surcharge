let last = 0;

/**
 * Horodatage ISO 8601 (UTC) des colonnes created_at / updated_at / deleted_at et de l'outbox.
 * Strictement croissant : deux écritures successives n'ont jamais le même horodatage, même dans
 * la même milliseconde (la synchro s'en sert pour savoir si une ligne a changé pendant l'envoi).
 */
export function nowIso(): string {
  const now = Math.max(Date.now(), last + 1);
  last = now;
  return new Date(now).toISOString();
}
