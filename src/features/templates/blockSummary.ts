// Résumés affichés sur les cartes de bloc (maquette seance-multi-blocs). Fonctions pures.

import type { TrackingType } from '@/db/schema';
import { formatDistance } from '@/features/exercises/tracking';
import { formatClock } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { formatWeight } from '@/lib/format';
import type { CircuitConfig } from './blockConfig';
import type { DraftItem } from './draftStore';
import { parseRepsTarget, parseRest } from './format';

const t = fr.templates.blocks;

/** Cible d'un exercice de bloc cardio ou circuit selon son type de suivi : « 400 m », « 10 reps »… */
export function itemTarget(item: DraftItem, tracking: TrackingType, unit: WeightUnit): string {
  switch (tracking) {
    case 'distance_time':
      return item.targetDistanceM ? formatDistance(item.targetDistanceM) : '—';
    case 'time':
      return formatClock(item.targetDurationS ?? 0);
    case 'calories':
      return `${item.targetCalories ?? 0} ${fr.units.cal}`;
    case 'weight_distance': {
      const distance = formatDistance(item.targetDistanceM ?? 0);
      return item.targetWeightKg
        ? `${formatWeight(item.targetWeightKg, unit)} · ${distance}`
        : distance;
    }
    case 'reps':
    case 'weight_reps': {
      const reps = parseRepsTarget(item.repsText);
      return t.reps(reps?.max ?? reps?.min ?? 0);
    }
  }
}

/** Ligne d'un exercice de bloc cardio : « 6 × 400 m · récup 1:30 ». */
export function cardioLine(item: DraftItem, tracking: TrackingType, unit: WeightUnit): string {
  const target = t.itemSummary(item.targetSets, itemTarget(item, tracking, unit));
  const rest = parseRest(item.restText);
  return rest && item.targetSets > 1 ? `${target} · ${t.restSuffix(formatClock(rest))}` : target;
}

/** « AMRAP · 12 min », « EMOM · 10 × 1:00 »… */
export function circuitTitle(config: CircuitConfig): string {
  switch (config.format) {
    case 'amrap':
      return t.circuitSummary.amrap(t.minutes(Math.round(config.durationS / 60)));
    case 'emom':
      return t.circuitSummary.emom(config.rounds, formatClock(config.intervalS));
    case 'for_time':
      return t.circuitSummary.for_time(
        config.rounds,
        config.timeCapS ? t.minutes(Math.round(config.timeCapS / 60)) : null,
      );
    case 'tabata':
      return t.circuitSummary.tabata(config.rounds, config.workS, config.restS);
  }
}
