// Logique de la séance en cours (SPEC 8.2, 9.2, 9.3). Fonctions pures, testées unitairement.

import type { Equipment } from '@/db/schema';
import { beats, recordSet, type SetLike } from '@/features/stats/calc';
import type { Difficulty } from './difficulty';

export type PreviousSet = SetLike & { setNumber: number };

export type Target = { repsMin: number | null; repsMax: number | null };

/** Charge de départ la première fois : barre olympique vide, sinon 0. */
const firstTimeWeight = (equipment: Equipment) => (equipment === 'barbell' ? 20 : 0);
const DEFAULT_REPS = 10;

/**
 * Pré-remplissage de la série n : la même série à la dernière séance, sinon la dernière série
 * de cette séance, sinon la cible (première fois).
 */
export function prefillSet(
  setNumber: number,
  previous: readonly PreviousSet[],
  target: Target,
  equipment: Equipment,
): { weightKg: number; reps: number } {
  const same = previous.find((s) => s.setNumber === setNumber) ?? previous[previous.length - 1];
  if (same) return { weightKg: same.weightKg, reps: same.reps };
  return {
    weightKg: firstTimeWeight(equipment),
    reps: target.repsMax ?? target.repsMin ?? DEFAULT_REPS,
  };
}

/** « Dernière fois : 4 × 8 à 80 kg » : nombre de séries, reps de la meilleure série, charge max. */
export function lastTimeSummary(
  previous: readonly PreviousSet[],
): { sets: number; reps: number; weightKg: number } | null {
  if (previous.length === 0) return null;
  const best = recordSet(previous) ?? previous[0]!;
  return { sets: previous.length, reps: best.reps, weightKg: best.weightKg };
}

export type Advice =
  | { kind: 'increase'; weightKg: number }
  | { kind: 'decrease'; weightKg: number }
  | { kind: 'keep'; weightKg: number };

/**
 * Conseil de charge (SPEC 9.3), d'après les séries de la dernière séance :
 * - tout « facile » et reps ≥ cible max (ou tout facile sans cible) → charge + pas ;
 * - au moins la moitié en échec → charge − pas ;
 * - sinon garder la charge.
 * Séries sans ressenti ignorées ; moins de 2 séries avec ressenti → pas de conseil.
 */
export function loadAdvice(
  previous: readonly PreviousSet[],
  targetRepsMax: number | null,
  weightStep: number,
): Advice | null {
  const rated = previous.filter((s) => s.difficulty !== null);
  if (rated.length < 2) return null;
  const weightKg = Math.max(...previous.map((s) => s.weightKg));
  const allEasy = rated.every((s) => s.difficulty === 'easy');
  const repsOk = targetRepsMax === null || rated.every((s) => s.reps >= targetRepsMax);
  if (allEasy && repsOk) return { kind: 'increase', weightKg: round2(weightKg + weightStep) };
  const fails = rated.filter((s) => s.difficulty === 'fail').length;
  if (fails * 2 >= rated.length) {
    return { kind: 'decrease', weightKg: Math.max(0, round2(weightKg - weightStep)) };
  }
  return { kind: 'keep', weightKg };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export type SessionRecord<T extends SetLike> = { exerciseId: string; set: T };

/**
 * Records battus pendant la séance : meilleure série de chaque exercice qui bat le record
 * d'avant la séance. Un exercice fait pour la première fois n'a pas de record à battre.
 */
export function recordsBeaten<T extends SetLike>(
  sessionSets: ReadonlyMap<string, readonly T[]>,
  previousSets: ReadonlyMap<string, readonly SetLike[]>,
): SessionRecord<T>[] {
  const records: SessionRecord<T>[] = [];
  for (const [exerciseId, sets] of sessionSets) {
    const best = recordSet(sets);
    const before = recordSet(previousSets.get(exerciseId) ?? []);
    if (best && before && beats(best, before)) records.push({ exerciseId, set: best });
  }
  return records;
}

/** Chrono : « 32:14 » ou « 1:05:09 ». */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Séries prévues pour un exercice : cible + séries ajoutées, jamais moins que les séries faites. */
export function plannedSets(targetSets: number, extra: number, done: number): number {
  return Math.max(targetSets + extra, done);
}

export type SetDraft = { weightKg: number; reps: number; difficulty: Difficulty | null };
