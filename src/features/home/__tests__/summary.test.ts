import { bodyWeightSummary, hyroxHistory, kmInMonth, monthCounts, progressionOf } from '../summary';

const set = (
  sessionId: string,
  exerciseId: string,
  weightKg: number,
  completedAt: string,
  reps = 8,
) => ({
  id: `${sessionId}-${exerciseId}-${weightKg}`,
  sessionId,
  exerciseId,
  weightKg,
  reps,
  difficulty: null,
  completedAt,
});

describe('progression', () => {
  it('exercice le plus pratiqué, charges max chronologiques, gain et semaines', () => {
    const p = progressionOf([
      set('s1', 'dc', 75, '2026-08-03T10:00:00Z'),
      set('s2', 'dc', 77.5, '2026-08-17T10:00:00Z'),
      set('s3', 'dc', 82.5, '2026-09-28T10:00:00Z'),
      set('s3', 'dc', 80, '2026-09-28T10:05:00Z'),
      set('s3', 'squat', 110, '2026-09-28T10:30:00Z'),
    ]);
    expect(p).toEqual({ exerciseId: 'dc', maxes: [75, 77.5, 82.5], deltaKg: 7.5, weeks: 8 });
  });

  it('garde les 8 dernières séances ; rien sans série', () => {
    const sets = Array.from({ length: 10 }, (_, i) =>
      set(`s${i}`, 'dc', 60 + i, `2026-09-${String(i + 1).padStart(2, '0')}T10:00:00Z`),
    );
    expect(progressionOf(sets)?.maxes).toEqual([62, 63, 64, 65, 66, 67, 68, 69]);
    expect(progressionOf([])).toBeNull();
  });
});

it('poids corporel : dernière valeur et variation sur 30 jours', () => {
  expect(
    bodyWeightSummary([
      { measuredOn: '2026-07-01', weightKg: 80.2 },
      { measuredOn: '2026-09-01', weightKg: 79 },
      { measuredOn: '2026-09-28', weightKg: 78.4 },
    ]),
  ).toEqual({ latestKg: 78.4, deltaKg: -0.6, pointsKg: [79, 78.4] });
  expect(bodyWeightSummary([{ measuredOn: '2026-09-28', weightKg: 78.4 }])?.deltaKg).toBeNull();
  expect(bodyWeightSummary([])).toBeNull();
});

it('séances et records du mois', () => {
  const today = new Date(2026, 8, 28);
  expect(
    monthCounts(
      ['2026-08-30T10:00:00Z', '2026-09-02T10:00:00Z', '2026-09-28T10:00:00Z'],
      [set('a', 'dc', 80, '2026-08-30T10:00:00Z'), set('b', 'dc', 82.5, '2026-09-02T10:00:00Z')],
      today,
    ),
  ).toEqual({ sessions: 2, records: 1 });
});

describe('cartes multi-sport de l’accueil', () => {
  const today = new Date(2026, 9, 20);
  it('km courus ce mois : course et courses Hyrox, pas le rameur', () => {
    expect(
      kmInMonth(
        [
          { completedAt: '2026-10-02T10:00:00Z', distanceM: 5000, discipline: 'running' },
          {
            completedAt: '2026-10-03T10:00:00Z',
            distanceM: 1000,
            catalogKey: 'hyrox_run',
            discipline: 'hyrox',
          },
          {
            completedAt: '2026-10-03T10:05:00Z',
            distanceM: 1000,
            catalogKey: 'hyrox_rowing',
            discipline: 'hyrox',
          },
          { completedAt: '2026-09-28T10:00:00Z', distanceM: 8000, discipline: 'running' },
        ],
        today,
      ),
    ).toBe(6);
  });

  it('simus Hyrox complètes seulement, dans l’ordre', () => {
    expect(
      hyroxHistory([
        { endedAt: '2026-10-10T10:00:00Z', config: { format: 'full' }, result: { totalS: 4800 } },
        { endedAt: '2026-10-01T10:00:00Z', config: { format: 'full' }, result: { totalS: 5000 } },
        { endedAt: '2026-10-05T10:00:00Z', config: { format: 'station' }, result: { totalS: 300 } },
      ]).map((r) => r.totalS),
    ).toEqual([5000, 4800]);
  });
});
