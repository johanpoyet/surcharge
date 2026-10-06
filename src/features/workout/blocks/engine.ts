// Moteur des blocs de séance (SPEC_V2 §5.3). Fonctions pures, testées unitairement.
// Règle : on stocke des horodatages (début, pauses), jamais un compteur : le chrono est juste
// après une fermeture forcée de l'app ou un passage en arrière-plan.

import type { CircuitConfig } from '@/features/templates/blockConfig';

/** Repère dans un bloc Hyrox : segment courant et phase (transition avant une station). */
export type HyroxCursor = {
  segment: number;
  segmentStartedAt: number;
  /** Total des pauses du bloc au début du segment (pour ne pas les compter dans le segment). */
  segmentPausedMs: number;
  phase: 'work' | 'transition';
  /** Transitions mesurées (s), dans l'ordre des stations. */
  transitions: number[];
};

/** État d'un bloc pendant la séance (persisté avec l'écran de séance). */
export type BlockRun = {
  startedAt: number | null;
  endedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  /** Hyrox. */
  hyrox?: HyroxCursor;
  /** Dernier tap Hyrox : annulable pendant 5 s (SPEC_V2 §5.3). */
  lastTap?: { at: number; setId: string | null; prev: HyroxCursor; endedAt: number | null };
  /** Circuit AMRAP : tours terminés. */
  rounds?: number;
  /** Notifications programmées (intervalles EMOM / Tabata, fin d'AMRAP…). */
  notificationIds?: string[];
};

export const UNDO_WINDOW_MS = 5000;

export const newRun = (): BlockRun => ({
  startedAt: null,
  endedAt: null,
  pausedAt: null,
  pausedMs: 0,
});

/** Temps actif du bloc (ms) : depuis le début, sans les pauses. */
export function activeMs(run: BlockRun, now: number): number {
  if (run.startedAt === null) return 0;
  const end = run.endedAt ?? run.pausedAt ?? now;
  return Math.max(0, end - run.startedAt - run.pausedMs);
}

export const activeSeconds = (run: BlockRun, now: number) => Math.floor(activeMs(run, now) / 1000);

export function pauseRun(run: BlockRun, now: number): BlockRun {
  return run.pausedAt !== null || run.startedAt === null || run.endedAt !== null
    ? run
    : { ...run, pausedAt: now };
}

export function resumeRun(run: BlockRun, now: number): BlockRun {
  return run.pausedAt === null
    ? run
    : { ...run, pausedAt: null, pausedMs: run.pausedMs + (now - run.pausedAt) };
}

// —— Hyrox ——

export type HyroxSegmentLike = { kind: 'run' | 'station' };

export function startHyrox(
  now: number,
  segments: readonly HyroxSegmentLike[],
  timeTransitions: boolean,
): BlockRun {
  return {
    ...newRun(),
    startedAt: now,
    hyrox: {
      segment: 0,
      segmentStartedAt: now,
      segmentPausedMs: 0,
      phase: timeTransitions && segments[0]?.kind === 'station' ? 'transition' : 'work',
      transitions: [],
    },
  };
}

/** Temps du segment (ou de la transition) en cours, en ms. */
export function segmentMs(run: BlockRun, now: number): number {
  const cursor = run.hyrox;
  if (!cursor) return 0;
  const end = run.endedAt ?? run.pausedAt ?? now;
  return Math.max(0, end - cursor.segmentStartedAt - (run.pausedMs - cursor.segmentPausedMs));
}

export type HyroxTap = {
  run: BlockRun;
  /** Segment terminé à enregistrer (null : fin d'une transition). */
  finished: { segment: number; durationS: number } | null;
  done: boolean;
};

/**
 * Un tap : « Run fini » / « Station finie » termine le segment ; avec les transitions
 * chronométrées, « J'arrive à la station » termine la transition. Sans elles, la transition est
 * comptée dans le segment suivant (SPEC_V2 §4.4).
 */
export function hyroxTap(
  run: BlockRun,
  segments: readonly HyroxSegmentLike[],
  timeTransitions: boolean,
  now: number,
): HyroxTap {
  const cursor = run.hyrox;
  if (!cursor || run.endedAt !== null) return { run, finished: null, done: run.endedAt !== null };
  const elapsedS = Math.round(segmentMs(run, now) / 1000);
  const lastTap = { at: now, setId: null, prev: cursor, endedAt: run.endedAt };

  if (cursor.phase === 'transition') {
    return {
      run: {
        ...run,
        lastTap,
        hyrox: {
          ...cursor,
          phase: 'work',
          segmentStartedAt: now,
          segmentPausedMs: run.pausedMs,
          transitions: [...cursor.transitions, elapsedS],
        },
      },
      finished: null,
      done: false,
    };
  }

  const next = cursor.segment + 1;
  const done = next >= segments.length;
  return {
    run: {
      ...run,
      lastTap,
      endedAt: done ? now : null,
      hyrox: {
        ...cursor,
        segment: next,
        segmentStartedAt: now,
        segmentPausedMs: run.pausedMs,
        phase: timeTransitions && segments[next]?.kind === 'station' ? 'transition' : 'work',
      },
    },
    finished: { segment: cursor.segment, durationS: elapsedS },
    done,
  };
}

export const canUndo = (run: BlockRun, now: number): boolean =>
  !!run.lastTap && now - run.lastTap.at <= UNDO_WINDOW_MS;

/** Annule le dernier tap : on revient au segment (ou à la transition) précédent, chrono compris. */
export function undoHyroxTap(run: BlockRun): BlockRun {
  if (!run.lastTap) return run;
  return { ...run, hyrox: run.lastTap.prev, endedAt: run.lastTap.endedAt, lastTap: undefined };
}

export type HyroxResult = {
  totalS: number;
  runS: number;
  stationsS: number;
  transitionsS?: number;
};

/** Résultat du bloc Hyrox (SPEC_V2 §4.4) à partir des temps des segments. */
export function hyroxResult(
  segments: readonly HyroxSegmentLike[],
  durations: readonly (number | null)[],
  transitions: readonly number[] | null,
): HyroxResult {
  let runS = 0;
  let stationsS = 0;
  segments.forEach((segment, index) => {
    const duration = durations[index] ?? 0;
    if (segment.kind === 'run') runS += duration;
    else stationsS += duration;
  });
  const transitionsS = transitions ? transitions.reduce((sum, t) => sum + t, 0) : undefined;
  return {
    totalS: runS + stationsS + (transitionsS ?? 0),
    runS,
    stationsS,
    ...(transitionsS !== undefined ? { transitionsS } : {}),
  };
}

// —— Circuits ——

/** Durée totale d'un circuit à durée fixe (s), null pour un For Time sans limite. */
export function circuitDurationS(config: CircuitConfig): number | null {
  switch (config.format) {
    case 'amrap':
      return config.durationS;
    case 'emom':
      return config.intervalS * config.rounds;
    case 'tabata':
      // Pas de repos après le dernier effort.
      return config.rounds * config.workS + (config.rounds - 1) * config.restS;
    case 'for_time':
      return config.timeCapS ?? null;
  }
}

export type IntervalStatus = {
  /** Tour en cours (à partir de 1). */
  round: number;
  phase: 'work' | 'rest';
  /** Temps restant dans l'intervalle (s). */
  remainingS: number;
  done: boolean;
};

/** EMOM et Tabata : intervalle en cours d'après le temps écoulé. */
export function intervalStatus(config: CircuitConfig, elapsedS: number): IntervalStatus | null {
  const total = circuitDurationS(config);
  const done = total !== null && elapsedS >= total;
  if (config.format === 'emom') {
    const index = Math.min(Math.floor(elapsedS / config.intervalS), config.rounds - 1);
    return {
      round: index + 1,
      phase: 'work',
      remainingS: done ? 0 : config.intervalS - (elapsedS % config.intervalS),
      done,
    };
  }
  if (config.format === 'tabata') {
    const cycle = config.workS + config.restS;
    const index = Math.min(Math.floor(elapsedS / cycle), config.rounds - 1);
    const within = elapsedS - index * cycle;
    const working = within < config.workS;
    return {
      round: index + 1,
      phase: working ? 'work' : 'rest',
      remainingS: done ? 0 : working ? config.workS - within : cycle - within,
      done,
    };
  }
  return null;
}

/** Instants (s depuis le début) où un signal sonne : chaque changement d'intervalle et la fin. */
export function signalTimes(config: CircuitConfig): number[] {
  switch (config.format) {
    case 'emom':
      return Array.from({ length: config.rounds }, (_, i) => (i + 1) * config.intervalS);
    case 'tabata': {
      const times: number[] = [];
      for (let i = 0; i < config.rounds; i++) {
        const start = i * (config.workS + config.restS);
        times.push(start + config.workS);
        if (i < config.rounds - 1) times.push(start + config.workS + config.restS);
      }
      return times;
    }
    case 'amrap':
      return [config.durationS];
    case 'for_time':
      return config.timeCapS ? [config.timeCapS] : [];
  }
}

/** AMRAP : tours projetés à la fin au rythme actuel. */
export function projectedRounds(
  rounds: number,
  elapsedS: number,
  durationS: number,
): number | null {
  if (elapsedS < 30 || rounds === 0) return null;
  return Math.floor((rounds / elapsedS) * durationS);
}

/** Écart en secondes : « −0:24 » (en avance), « +0:06 » (en retard), « = ». */
export function formatDelta(deltaS: number, clock: (s: number) => string): string {
  if (deltaS === 0) return '=';
  return `${deltaS < 0 ? '−' : '+'}${clock(Math.abs(deltaS))}`;
}
