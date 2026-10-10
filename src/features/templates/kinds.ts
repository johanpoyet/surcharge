// Pictogrammes des séances (retours des testeurs : « voir en un coup d'œil ce que j'ai à faire »).
// Une seule couleur d'accent : le type de séance se lit par une icône, pas par une couleur.

import type { BlockType } from '@/db/schema';

/** Ce qu'une séance fait travailler, déduit de ses blocs. */
export type SessionKind = 'strength' | 'running' | 'cross_training' | 'hyrox';

const KIND_OF: Record<BlockType, SessionKind | null> = {
  warmup: null,
  strength: 'strength',
  cardio: 'running',
  circuit: 'cross_training',
  hyrox: 'hyrox',
};

/** Au plus deux icônes par séance (cases du calendrier). */
export const MAX_KINDS = 2;

/**
 * Types d'une séance d'après ses blocs, dans l'ordre et sans doublon. Sans bloc (séance V1) ou avec
 * un échauffement seul : musculation.
 */
export function sessionKinds(blockTypes: readonly BlockType[]): SessionKind[] {
  const kinds: SessionKind[] = [];
  for (const type of blockTypes) {
    const kind = KIND_OF[type];
    if (kind && !kinds.includes(kind)) kinds.push(kind);
  }
  return kinds.length > 0 ? kinds.slice(0, MAX_KINDS) : ['strength'];
}

/** Réunit les types de plusieurs séances d'un même jour. */
export function mergeKinds(a: readonly SessionKind[], b: readonly SessionKind[]): SessionKind[] {
  return [...new Set([...a, ...b])].slice(0, MAX_KINDS);
}
