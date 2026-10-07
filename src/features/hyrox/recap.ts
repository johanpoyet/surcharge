// Récap d'une simu Hyrox (SPEC_V2 §5.4, maquette recap-hyrox). Fonctions pures.

import type { HyroxStationKey } from './catalog';

export type RecapSegment = {
  kind: 'run' | 'station';
  name: string;
  station?: HyroxStationKey;
  /** Temps du segment (s), null s'il n'a pas été fait. */
  durationS: number | null;
};

export type StationRow = {
  name: string;
  station?: HyroxStationKey;
  durationS: number;
  /** Écart avec la dernière simu (s, négatif = plus rapide), null sans comparaison. */
  deltaS: number | null;
  /** Longueur de la barre (1 = station la plus longue). */
  ratio: number;
  /** Station la plus lente par rapport à la dernière simu (mise en valeur en orange). */
  slowest: boolean;
};

export type HyroxRecap = {
  totalS: number;
  runS: number;
  stationsS: number;
  transitionsS: number | null;
  /** Allure moyenne de course (s/km). */
  paceSPerKm: number | null;
  stationCount: number;
  /** Écart avec le meilleur temps précédent quand il est battu (négatif), sinon null. */
  recordDeltaS: number | null;
  stations: StationRow[];
  /** Station avec le plus gros retard (> 10 s) : bloc dédié proposé. */
  weakPoint: { name: string; station?: HyroxStationKey; deltaS: number } | null;
};

/** Retard au-delà duquel une station devient le point faible (SPEC_V2 §5.4). */
export const WEAK_POINT_MIN_S = 10;
const RUN_KM = 1;

export function hyroxRecap(
  segments: readonly RecapSegment[],
  lastDurations: readonly (number | null)[] | null,
  transitionsS: number | null,
  bestPreviousTotalS: number | null,
): HyroxRecap {
  let runS = 0;
  let runs = 0;
  let stationsS = 0;
  const done: (RecapSegment & { index: number; durationS: number })[] = [];
  segments.forEach((segment, index) => {
    if (segment.durationS === null) return;
    if (segment.kind === 'run') {
      runS += segment.durationS;
      runs += 1;
    } else {
      stationsS += segment.durationS;
      done.push({ ...segment, index, durationS: segment.durationS });
    }
  });
  const totalS = runS + stationsS + (transitionsS ?? 0);

  const longest = Math.max(1, ...done.map((s) => s.durationS));
  const rows: StationRow[] = done.map((s) => {
    const last = lastDurations?.[s.index] ?? null;
    return {
      name: s.name,
      station: s.station,
      durationS: s.durationS,
      deltaS: last === null ? null : s.durationS - last,
      ratio: s.durationS / longest,
      slowest: false,
    };
  });
  let worst: StationRow | null = null;
  for (const row of rows) {
    if (row.deltaS !== null && row.deltaS > 0 && (!worst || row.deltaS > (worst.deltaS ?? 0))) {
      worst = row;
    }
  }
  if (worst) worst.slowest = true;

  return {
    totalS,
    runS,
    stationsS,
    transitionsS,
    paceSPerKm: runs > 0 ? runS / (runs * RUN_KM) : null,
    stationCount: done.length,
    recordDeltaS:
      bestPreviousTotalS !== null && totalS < bestPreviousTotalS
        ? totalS - bestPreviousTotalS
        : null,
    stations: rows,
    weakPoint:
      worst && (worst.deltaS ?? 0) > WEAK_POINT_MIN_S
        ? { name: worst.name, station: worst.station, deltaS: worst.deltaS ?? 0 }
        : null,
  };
}
