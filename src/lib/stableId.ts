// UUID déterministe (logique pure) : même entrée → même identifiant, sur tous les appareils.
// Sert aux lignes que plusieurs appareils peuvent créer chacun de leur côté hors ligne (exercices
// du catalogue) : elles retombent sur la même ligne à la synchro au lieu de se dupliquer.

/** FNV-1a 32 bits avec une base de départ donnée. */
function fnv1a(input: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const SEEDS = [0x811c9dc5, 0x050c5d1f, 0x2b7e1516, 0x9e3779b9];

/** UUID (format standard, version 8 « personnalisée ») dérivé des parties données. */
export function stableId(...parts: readonly string[]): string {
  const input = parts.join('\u0000');
  const hex = SEEDS.map((seed) => fnv1a(input, seed).toString(16).padStart(8, '0')).join('');
  // Version 8 (4 bits) et variante RFC 4122 (2 bits) : un uuid valide pour Postgres.
  const variant = ((parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `8${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
