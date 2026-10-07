// Résumés affichés sur les cartes de bloc (maquette seance-multi-blocs). Fonctions pures.

import type { BlockType, JsonObject, TrackingType } from '@/db/schema';
import { hyroxStations } from '@/features/hyrox/segments';
import { formatDistance } from '@/features/exercises/tracking';
import { formatClock } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { formatNumber, formatWeight } from '@/lib/format';
import { parseBlockConfig, type CircuitConfig } from './blockConfig';
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

type SummaryBlock = { id: string; type: BlockType; config: JsonObject };
type SummaryItem = {
  blockId: string | null;
  targetSets: number;
  targetDistanceM: number | null;
  discipline: string;
};

/**
 * Résumé des blocs d'une séance type pour la carte « Séance du jour » (SPEC_V2 §5.5) :
 * « Hyrox complet · 8 km + 8 stations · 2 exercices ». Null pour une séance de musculation seule
 * (la carte garde son affichage V1).
 */
export function templateSummary(
  blocks: readonly SummaryBlock[],
  items: readonly SummaryItem[],
): string | null {
  if (blocks.every((b) => b.type === 'strength')) return null;
  const d = fr.home.day;
  const parts = blocks.flatMap((block): string[] => {
    const own = items.filter((i) => i.blockId === block.id);
    switch (block.type) {
      case 'hyrox': {
        const config = parseBlockConfig('hyrox', block.config);
        if (config.format === 'full') return [d.hyroxFull];
        if (config.format === 'half') return [d.hyroxHalf];
        return [hyroxStations(config)[0]?.exercise.name ?? t.tags.hyrox];
      }
      case 'circuit':
        return [circuitTitle(parseBlockConfig('circuit', block.config))];
      case 'cardio': {
        const meters = own.reduce(
          (sum, i) =>
            sum + (i.discipline === 'running' ? (i.targetDistanceM ?? 0) * i.targetSets : 0),
          0,
        );
        return [meters > 0 ? d.runKm(formatNumber(meters / 1000, 1)) : d.cardio];
      }
      case 'strength':
        return own.length > 0 ? [d.exercisesCount(own.length)] : [];
      case 'warmup':
        return [];
    }
  });
  return parts.join(' · ');
}
