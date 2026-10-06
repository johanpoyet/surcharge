import {
  bestPace,
  formatDistance,
  formatPace,
  formatSet,
  lowerIsBetter,
  metricsFor,
  paceSecondsPerKm,
  referenceDistance,
  sessionMetric,
  shortSetValue,
  trackingRecord,
  usesWeight,
  valueTrend,
  type TrackedSet,
} from '../tracking';

const set = (patch: Partial<TrackedSet> & { id?: string }): TrackedSet & { id: string } => ({
  id: patch.id ?? 'x',
  weightKg: 0,
  reps: 0,
  difficulty: null,
  distanceM: null,
  durationS: null,
  calories: null,
  ...patch,
});

describe('formats', () => {
  it('distances, allure et séries par type', () => {
    expect(formatDistance(400)).toBe('400 m');
    expect(formatDistance(1200)).toBe('1,2 km');
    expect(paceSecondsPerKm(400, 92)).toBe(230);
    expect(formatPace(230)).toBe('3:50 /km');
    expect(paceSecondsPerKm(0, 92)).toBeNull();
    expect(formatSet('distance_time', set({ distanceM: 400, durationS: 92 }), 'kg')).toBe(
      '400 m en 1:32',
    );
    expect(formatSet('time', set({ durationS: 90 }), 'kg')).toBe('1:30');
    expect(formatSet('reps', set({ reps: 12 }), 'kg')).toBe('× 12');
    expect(formatSet('calories', set({ calories: 20 }), 'kg')).toBe('20 cal');
    expect(formatSet('weight_distance', set({ weightKg: 24, distanceM: 200 }), 'kg')).toBe(
      '24 kg · 200 m',
    );
    expect(formatSet('weight_reps', set({ weightKg: 82.5, reps: 8 }), 'kg')).toBe('82,5 kg × 8');
  });

  it('pas de charge seulement pour les types avec charge', () => {
    expect(usesWeight('weight_reps')).toBe(true);
    expect(usesWeight('weight_distance')).toBe(true);
    expect(usesWeight('distance_time')).toBe(false);
  });
});

describe('records par type', () => {
  it('distance + temps : meilleur temps sur la distance la plus pratiquée', () => {
    const sets = [
      set({ id: 'a', distanceM: 400, durationS: 95 }),
      set({ id: 'b', distanceM: 400, durationS: 92 }),
      set({ id: 'c', distanceM: 1000, durationS: 200 }),
      set({ id: 'd', distanceM: 400, durationS: 88, difficulty: 'fail' }),
    ];
    expect(referenceDistance(sets)).toBe(400);
    expect(trackingRecord('distance_time', sets)?.id).toBe('b');
  });

  it('temps, reps, calories : le plus grand', () => {
    expect(
      trackingRecord('time', [set({ id: 'a', durationS: 60 }), set({ id: 'b', durationS: 90 })])
        ?.id,
    ).toBe('b');
    expect(
      trackingRecord('reps', [set({ id: 'a', reps: 15 }), set({ id: 'b', reps: 12 })])?.id,
    ).toBe('a');
    expect(
      trackingRecord('calories', [set({ id: 'a', calories: 18 }), set({ id: 'b', calories: 20 })])
        ?.id,
    ).toBe('b');
  });

  it('charge + distance : plus grosse charge, puis plus longue distance', () => {
    const sets = [
      set({ id: 'a', weightKg: 24, distanceM: 200 }),
      set({ id: 'b', weightKg: 24, distanceM: 250 }),
      set({ id: 'c', weightKg: 20, distanceM: 400 }),
    ];
    expect(trackingRecord('weight_distance', sets)?.id).toBe('b');
  });

  it('charge × reps : règle V1', () => {
    const sets = [
      set({ id: 'a', weightKg: 100, reps: 5 }),
      set({ id: 'b', weightKg: 100, reps: 6 }),
    ];
    expect(trackingRecord('weight_reps', sets)?.id).toBe('b');
  });

  it('aucune série exploitable : pas de record', () => {
    expect(trackingRecord('time', [set({ durationS: null })])).toBeNull();
  });
});

describe('courbes', () => {
  it('distance + temps : temps, allure et distance, sans charge', () => {
    expect(metricsFor('distance_time')).toEqual(['time', 'pace', 'distance']);
    expect(metricsFor('distance_time')).not.toContain('weight');
    const sets = [
      set({ distanceM: 400, durationS: 95 }),
      set({ distanceM: 400, durationS: 92 }),
      set({ distanceM: 1000, durationS: 210 }),
    ];
    expect(sessionMetric('distance_time', 'time', sets, 400)).toBe(92);
    expect(sessionMetric('distance_time', 'pace', sets, 400)).toBe(210);
    expect(sessionMetric('distance_time', 'distance', sets, 400)).toBe(1800);
    expect(lowerIsBetter('time')).toBe(true);
    expect(lowerIsBetter('distance')).toBe(false);
  });

  it('reps seules : le max d’une série (charge × reps : le total, comme en V1)', () => {
    const sets = [set({ reps: 10 }), set({ reps: 12 })];
    expect(sessionMetric('reps', 'reps', sets, null)).toBe(12);
    expect(sessionMetric('weight_reps', 'reps', sets, null)).toBe(22);
  });
});

describe('tendance', () => {
  it('dans le sens du progrès', () => {
    expect(valueTrend([90, 95, 100], true)).toEqual({ kind: 'record' });
    expect(valueTrend([96, 95, 90], true)).toEqual({ kind: 'worse', delta: 1 });
    expect(valueTrend([12, 10, 15], false)).toEqual({ kind: 'better', delta: 2 });
    expect(valueTrend([10, 10], false)).toEqual({ kind: 'same' });
    expect(valueTrend([10], false)).toBeNull();
  });
});

describe('tuiles du détail', () => {
  it('valeur courte et précision par type', () => {
    expect(shortSetValue('distance_time', set({ distanceM: 400, durationS: 92 }), 'kg')).toEqual({
      value: '1:32',
      detail: '400 m',
    });
    expect(shortSetValue('calories', set({ calories: 20 }), 'kg')).toEqual({
      value: '20',
      detail: 'cal',
    });
    expect(
      bestPace([set({ distanceM: 400, durationS: 92 }), set({ distanceM: 1000, durationS: 240 })]),
    ).toBe(230);
  });
});
