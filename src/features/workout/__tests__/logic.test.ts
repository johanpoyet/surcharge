import {
  formatClock,
  lastTimeSummary,
  loadAdvice,
  plannedSets,
  prefillSet,
  recordsBeaten,
  type PreviousSet,
} from '../logic';

const set = (
  setNumber: number,
  weightKg: number,
  reps: number,
  difficulty: PreviousSet['difficulty'] = null,
): PreviousSet => ({ setNumber, weightKg, reps, difficulty });

const target = { repsMin: 8, repsMax: 10 };

describe('pré-remplissage (SPEC 8.2)', () => {
  const previous = [set(1, 80, 8), set(2, 80, 7), set(3, 82.5, 6)];

  it('reprend la même série à la dernière séance', () => {
    expect(prefillSet(2, previous, target, 'barbell')).toEqual({ weightKg: 80, reps: 7 });
  });

  it('série en plus : reprend la dernière série', () => {
    expect(prefillSet(4, previous, target, 'barbell')).toEqual({ weightKg: 82.5, reps: 6 });
  });

  it('première fois : la cible (barre vide pour une barre, 0 sinon)', () => {
    expect(prefillSet(1, [], target, 'barbell')).toEqual({ weightKg: 20, reps: 10 });
    expect(prefillSet(1, [], { repsMin: null, repsMax: null }, 'machine')).toEqual({
      weightKg: 0,
      reps: 10,
    });
  });
});

it('« Dernière fois : 4 × 8 à 80 kg »', () => {
  expect(lastTimeSummary([set(1, 80, 8), set(2, 80, 8), set(3, 80, 7), set(4, 80, 6)])).toEqual({
    sets: 4,
    reps: 8,
    weightKg: 80,
  });
  expect(lastTimeSummary([])).toBeNull();
});

describe('conseil de charge (SPEC 9.3)', () => {
  it('tout facile et cible atteinte → + pas', () => {
    expect(loadAdvice([set(1, 80, 10, 'easy'), set(2, 80, 10, 'easy')], 10, 2.5)).toEqual({
      kind: 'increase',
      weightKg: 82.5,
    });
  });

  it('tout facile mais cible pas atteinte → garder', () => {
    expect(loadAdvice([set(1, 80, 10, 'easy'), set(2, 80, 8, 'easy')], 10, 2.5)).toEqual({
      kind: 'keep',
      weightKg: 80,
    });
  });

  it('tout facile sans cible → + pas', () => {
    expect(loadAdvice([set(1, 80, 6, 'easy'), set(2, 80, 6, 'easy')], null, 5)?.kind).toBe(
      'increase',
    );
  });

  it('au moins la moitié en échec → − pas', () => {
    expect(
      loadAdvice([set(1, 80, 8, 'medium'), set(2, 80, 0, 'fail'), set(3, 80, 3, 'fail')], 10, 2.5),
    ).toEqual({ kind: 'decrease', weightKg: 77.5 });
  });

  it('séries sans ressenti ignorées ; moins de 2 avec ressenti → rien', () => {
    expect(loadAdvice([set(1, 80, 10, 'easy'), set(2, 80, 10)], 10, 2.5)).toBeNull();
    expect(
      loadAdvice([set(1, 80, 10, 'easy'), set(2, 80, 10), set(3, 80, 10, 'easy')], 10, 2.5)?.kind,
    ).toBe('increase');
  });
});

describe('records battus', () => {
  it('meilleure série qui bat le record d’avant la séance', () => {
    const session = new Map([
      ['dc', [set(1, 82.5, 6), set(2, 82.5, 7)]],
      ['squat', [set(1, 100, 5)]],
      ['nouveau', [set(1, 40, 10)]],
    ]);
    const before = new Map([
      ['dc', [set(1, 82.5, 6)]],
      ['squat', [set(1, 110, 5)]],
    ]);
    expect(recordsBeaten(session, before)).toEqual([{ exerciseId: 'dc', set: set(2, 82.5, 7) }]);
  });
});

it('chrono', () => {
  expect(formatClock(1934)).toBe('32:14');
  expect(formatClock(3909)).toBe('1:05:09');
  expect(formatClock(-3)).toBe('0:00');
});

it('séries prévues', () => {
  expect(plannedSets(3, 1, 2)).toBe(4);
  expect(plannedSets(3, 0, 5)).toBe(5);
});
