// Générateur des segments d'un bloc Hyrox (SPEC_V2 §4.3 et §5.1). Fonctions pures.

import type { SeedExercise } from '@/db/seed';
import type { HyroxConfig } from '@/features/templates/blockConfig';
import {
  HYROX_RUN,
  HYROX_STATIONS,
  stationWeight,
  type HyroxStation,
  type HyroxStationKey,
} from './catalog';

export type HyroxSegment = {
  kind: 'run' | 'station';
  /** Numéro de la paire course + station (1 à 8). */
  round: number;
  exercise: SeedExercise;
  distanceM?: number;
  reps?: number;
  /** Charge de la division (par charge portée) ; absente si libre ou sans charge. */
  weightKg?: number;
  weightCount?: number;
  station?: HyroxStationKey;
};

const byKey = new Map(HYROX_STATIONS.map((station) => [station.key, station]));

/**
 * Stations du bloc dans l'ordre officiel : les 8 (complet) ; 4 (demi : celles choisies, sinon les
 * 4 premières) ; une seule (station seule : celle choisie, sinon le SkiErg).
 */
export function hyroxStations(config: HyroxConfig): HyroxStation[] {
  const chosen = (config.stations ?? []).flatMap((key) => {
    const station = byKey.get(key);
    return station ? [station] : [];
  });
  switch (config.format) {
    case 'full':
      return [...HYROX_STATIONS];
    case 'half':
      return chosen.length === 4 ? chosen : HYROX_STATIONS.slice(0, 4);
    case 'station':
      return [chosen[0] ?? HYROX_STATIONS[0]!];
  }
}

/** Segments à enchaîner : 1 km de course puis la station, sauf « station seule » (sans course). */
export function hyroxSegments(config: HyroxConfig): HyroxSegment[] {
  const stations = hyroxStations(config);
  return stations.flatMap((station, index) => {
    const round = index + 1;
    const weightKg = stationWeight(station, config.division);
    const stationSegment: HyroxSegment = {
      kind: 'station',
      round,
      exercise: station.exercise,
      distanceM: station.distanceM,
      reps: station.reps,
      weightKg,
      weightCount: weightKg === undefined ? undefined : station.weightCount,
      station: station.key,
    };
    if (config.format === 'station') return [stationSegment];
    return [
      { kind: 'run', round, exercise: HYROX_RUN.exercise, distanceM: HYROX_RUN.distanceM },
      stationSegment,
    ];
  });
}

/** Distance de course du bloc (m). */
export const hyroxRunDistanceM = (config: HyroxConfig): number =>
  config.format === 'station' ? 0 : hyroxStations(config).length * HYROX_RUN.distanceM;
