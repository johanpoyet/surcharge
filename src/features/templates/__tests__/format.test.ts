import {
  estimateMinutes,
  formatRepsTarget,
  formatRest,
  parseRepsTarget,
  parseRest,
} from '../format';

describe('reps cibles', () => {
  it('lit les formats courants', () => {
    expect(parseRepsTarget('8–10')).toEqual({ min: 8, max: 10 });
    expect(parseRepsTarget('8-10')).toEqual({ min: 8, max: 10 });
    expect(parseRepsTarget('8 à 10')).toEqual({ min: 8, max: 10 });
    expect(parseRepsTarget('12')).toEqual({ min: 12, max: 12 });
    expect(parseRepsTarget('12-8')).toEqual({ min: 8, max: 12 });
    expect(parseRepsTarget('')).toEqual({ min: null, max: null });
  });

  it('refuse les saisies invalides', () => {
    expect(parseRepsTarget('abc')).toBeNull();
    expect(parseRepsTarget('0')).toBeNull();
    expect(parseRepsTarget('5-500')).toBeNull();
  });

  it('affiche « 8–10 » ou « 12 »', () => {
    expect(formatRepsTarget({ min: 8, max: 10 })).toBe('8–10');
    expect(formatRepsTarget({ min: 12, max: 12 })).toBe('12');
    expect(formatRepsTarget({ min: null, max: null })).toBe('');
  });
});

describe('repos', () => {
  it('lit « 2:00 », « 90 », « 90s », « 2 min »', () => {
    expect(parseRest('2:00')).toBe(120);
    expect(parseRest('1:30')).toBe(90);
    expect(parseRest('90')).toBe(90);
    expect(parseRest('90s')).toBe(90);
    expect(parseRest('2 min')).toBe(120);
  });

  it('refuse les saisies invalides', () => {
    expect(parseRest('1:75')).toBeNull();
    expect(parseRest('abc')).toBeNull();
    expect(parseRest('30:00')).toBeNull();
  });

  it('affiche m:ss', () => {
    expect(formatRest(120)).toBe('2:00');
    expect(formatRest(75)).toBe('1:15');
  });
});

describe('durée estimée (SPEC 9.4)', () => {
  it('Σ séries × (45 s + repos), arrondie à 5 min', () => {
    // 4 × 165 + 3 × 135 + 3 × 105 + 3 × 135 = 1785 s ≈ 29,75 min → 30
    expect(
      estimateMinutes([
        { targetSets: 4, restSeconds: 120 },
        { targetSets: 3, restSeconds: 90 },
        { targetSets: 3, restSeconds: 60 },
        { targetSets: 3, restSeconds: 90 },
      ]),
    ).toBe(30);
    expect(estimateMinutes([])).toBe(0);
  });
});
