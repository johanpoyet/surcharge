import {
  bestEstimated1RM,
  epley,
  recordSet,
  sessionMax,
  trend,
  volume,
  type SetLike,
} from '../calc';

const set = (
  weightKg: number,
  reps: number,
  difficulty: SetLike['difficulty'] = null,
): SetLike => ({
  weightKg,
  reps,
  difficulty,
});

describe('epley', () => {
  it('1 rep = la charge', () => {
    expect(epley(100, 1)).toBe(100);
  });

  it('w × (1 + reps / 30), arrondi à 0,5 kg', () => {
    expect(epley(82.5, 6)).toBe(99); // 99,0
    expect(epley(80, 8)).toBe(101.5); // 101,33
    expect(epley(60, 10)).toBe(80);
  });

  it('ignore les échecs à 0 rep', () => {
    expect(bestEstimated1RM([set(100, 0, 'fail'), set(80, 8)])).toBe(101.5);
    expect(bestEstimated1RM([set(100, 0, 'fail')])).toBeNull();
  });
});

describe('record', () => {
  it('plus grosse charge, à égalité le plus de reps, hors échec', () => {
    const sets = [set(80, 8), set(82.5, 6), set(82.5, 7), set(90, 3, 'fail')];
    expect(recordSet(sets)).toEqual(set(82.5, 7));
  });

  it('aucune série réussie : pas de record', () => {
    expect(recordSet([set(100, 0, 'fail')])).toBeNull();
  });
});

describe('séance', () => {
  it('charge max réussie', () => {
    expect(sessionMax([set(80, 8), set(85, 5, 'fail'), set(82.5, 6)])).toBe(82.5);
    expect(sessionMax([])).toBeNull();
  });

  it('volume = Σ charge × reps', () => {
    expect(volume([set(80, 8), set(82.5, 6)])).toBe(1135);
  });
});

describe('tendance', () => {
  it('record si la dernière séance dépasse toutes les précédentes', () => {
    expect(trend([82.5, 80, 77.5])).toEqual({ kind: 'record' });
  });

  it('hausse, stable ou baisse par rapport à la séance précédente', () => {
    expect(trend([82.5, 80, 85])).toEqual({ kind: 'up', deltaKg: 2.5 });
    expect(trend([72.5, 72.5])).toEqual({ kind: 'same' });
    expect(trend([14, 16])).toEqual({ kind: 'down', deltaKg: 2 });
  });

  it('pas de tendance avec moins de 2 séances', () => {
    expect(trend([80])).toBeNull();
    expect(trend([])).toBeNull();
  });
});
