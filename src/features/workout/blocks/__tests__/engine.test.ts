import { formatClock } from '../../logic';
import {
  activeSeconds,
  canUndo,
  circuitDurationS,
  formatDelta,
  hyroxResult,
  hyroxTap,
  intervalStatus,
  pauseRun,
  projectedRounds,
  resumeRun,
  segmentMs,
  signalTimes,
  startHyrox,
  undoHyroxTap,
} from '../engine';

const S = 1000;
const segments = [
  { kind: 'run' as const },
  { kind: 'station' as const },
  { kind: 'run' as const },
  { kind: 'station' as const },
];

describe('chronos fondés sur des horodatages', () => {
  it('le temps actif ne compte pas les pauses, même après une relance de l’app', () => {
    let run = startHyrox(0, segments, false);
    run = pauseRun(run, 60 * S);
    // App tuée pendant la pause puis rouverte 5 min plus tard : toujours 1:00.
    expect(activeSeconds(run, 360 * S)).toBe(60);
    run = resumeRun(run, 360 * S);
    expect(activeSeconds(run, 400 * S)).toBe(100);
    expect(segmentMs(run, 400 * S)).toBe(100 * S);
  });
});

describe('Hyrox', () => {
  it('un tap par segment, temps de chaque segment, fin au dernier', () => {
    let run = startHyrox(0, segments, false);
    const taps = [270, 520, 800, 1000].map((t) => {
      const tap = hyroxTap(run, segments, false, t * S);
      run = tap.run;
      return tap;
    });
    expect(taps.map((t) => t.finished?.durationS)).toEqual([270, 250, 280, 200]);
    expect(taps.map((t) => t.done)).toEqual([false, false, false, true]);
    expect(run.endedAt).toBe(1000 * S);
  });

  it('transitions chronométrées : un tap de plus avant chaque station', () => {
    let run = startHyrox(0, segments, true);
    run = hyroxTap(run, segments, true, 270 * S).run; // Run fini
    expect(run.hyrox?.phase).toBe('transition');
    const arrived = hyroxTap(run, segments, true, 290 * S); // J'arrive à la station
    expect(arrived.finished).toBeNull();
    run = arrived.run;
    const station = hyroxTap(run, segments, true, 540 * S);
    expect(station.finished).toEqual({ segment: 1, durationS: 250 });
    expect(station.run.hyrox?.transitions).toEqual([20]);
  });

  it('annuler le dernier tap pendant 5 s : retour au segment, chrono compris', () => {
    let run = startHyrox(0, segments, false);
    run = hyroxTap(run, segments, false, 270 * S).run;
    expect(canUndo(run, 274 * S)).toBe(true);
    expect(canUndo(run, 276 * S)).toBe(false);
    run = undoHyroxTap(run);
    expect(run.hyrox?.segment).toBe(0);
    expect(segmentMs(run, 300 * S)).toBe(300 * S);
  });

  it('résultat : total, course, stations, transitions si mesurées', () => {
    expect(hyroxResult(segments, [270, 250, 280, 200], null)).toEqual({
      totalS: 1000,
      runS: 550,
      stationsS: 450,
    });
    expect(hyroxResult(segments, [270, 250, 280, 200], [20, 15])).toMatchObject({
      totalS: 1035,
      transitionsS: 35,
    });
  });
});

describe('circuits', () => {
  it('EMOM : tour et temps restant dans la minute, bips à chaque minute', () => {
    const emom = { format: 'emom' as const, intervalS: 60, rounds: 10 };
    expect(intervalStatus(emom, 125)).toMatchObject({ round: 3, remainingS: 55, done: false });
    expect(intervalStatus(emom, 600)?.done).toBe(true);
    expect(signalTimes(emom)).toHaveLength(10);
  });

  it('Tabata : effort puis repos, pas de repos après le dernier effort', () => {
    const tabata = { format: 'tabata' as const, workS: 20, restS: 10, rounds: 8 };
    expect(circuitDurationS(tabata)).toBe(230);
    expect(intervalStatus(tabata, 25)).toMatchObject({ round: 1, phase: 'rest', remainingS: 5 });
    expect(intervalStatus(tabata, 31)).toMatchObject({ round: 2, phase: 'work', remainingS: 19 });
    expect(signalTimes(tabata)).toHaveLength(15);
  });

  it('AMRAP de 12 min : sonne à la fin ; projection du nombre de tours', () => {
    const amrap = { format: 'amrap' as const, durationS: 720 };
    expect(signalTimes(amrap)).toEqual([720]);
    expect(projectedRounds(3, 300, 720)).toBe(7);
    expect(projectedRounds(0, 300, 720)).toBeNull();
  });

  it('For Time : durée = temps limite, sinon libre', () => {
    expect(circuitDurationS({ format: 'for_time', rounds: 3, timeCapS: 900 })).toBe(900);
    expect(circuitDurationS({ format: 'for_time', rounds: 3 })).toBeNull();
  });
});

it('écart avec la dernière fois : signe, jamais la couleur seule', () => {
  expect(formatDelta(-24, formatClock)).toBe('−0:24');
  expect(formatDelta(6, formatClock)).toBe('+0:06');
  expect(formatDelta(0, formatClock)).toBe('=');
});
