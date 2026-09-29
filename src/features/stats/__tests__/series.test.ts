import {
  difficultyAt,
  exerciseSeries,
  globalStats,
  personalRecords,
  weightsInPeriod,
} from '../series';

const set = (
  id: string,
  weightKg: number,
  reps: number,
  completedAt: string,
  difficulty: 'easy' | 'medium' | 'hard' | 'fail' | null = null,
) => ({
  id,
  exerciseId: 'dc',
  weightKg,
  reps,
  difficulty,
  completedAt,
});

it('série par séance : charge max, volume, reps, séance record', () => {
  const series = exerciseSeries([
    {
      sessionId: 's2',
      startedAt: '2026-09-28T10:00:00Z',
      sets: [
        set('c', 82.5, 6, '2026-09-28T10:00:00Z'),
        set('d', 85, 0, '2026-09-28T10:05:00Z', 'fail'),
      ],
    },
    {
      sessionId: 's1',
      startedAt: '2026-09-21T10:00:00Z',
      sets: [set('a', 80, 8, '2026-09-21T10:00:00Z'), set('b', 80, 7, '2026-09-21T10:05:00Z')],
    },
  ]);
  expect(series).toEqual([
    {
      sessionId: 's1',
      startedAt: '2026-09-21T10:00:00Z',
      weight: 80,
      volume: 1200,
      reps: 15,
      record: false,
    },
    {
      sessionId: 's2',
      startedAt: '2026-09-28T10:00:00Z',
      weight: 82.5,
      volume: 495,
      reps: 6,
      record: true,
    },
  ]);
});

it('stats globales', () => {
  expect(
    globalStats(
      [
        { startedAt: '2026-09-28T10:00:00Z', endedAt: '2026-09-28T11:30:00Z' },
        { startedAt: '2026-09-28T18:00:00Z', endedAt: '2026-09-28T19:00:00Z' },
        { startedAt: '2026-09-30T18:00:00Z', endedAt: null },
      ],
      [set('a', 100, 5, ''), set('b', 1000, 1, '')],
    ),
  ).toEqual({ sessions: 3, hours: 3, tonnes: 2, gymDays: 2 });
});

it('ressentis à une charge', () => {
  expect(
    difficultyAt(
      [
        set('a', 82.5, 8, '', 'easy'),
        set('b', 82.5, 6, '', 'hard'),
        set('c', 82.5, 6, ''),
        set('d', 80, 8, '', 'easy'),
      ],
      82.5,
    ),
  ).toEqual({ counts: { easy: 1, medium: 0, hard: 1, fail: 0 }, rated: 2, total: 3 });
});

it('pesées par période', () => {
  const today = new Date(2026, 8, 28);
  const weights = [
    { measuredOn: '2026-06-01', weightKg: 81 },
    { measuredOn: '2026-07-10', weightKg: 80.2 },
    { measuredOn: '2026-09-28', weightKg: 78.4 },
  ];
  expect(weightsInPeriod(weights, '3M', today).deltaKg).toBe(-1.8);
  expect(weightsInPeriod(weights, '1M', today)).toEqual({ points: [weights[2]], deltaKg: null });
  expect(weightsInPeriod(weights, '1A', today).points).toHaveLength(3);
});

it('records personnels, le plus récent d’abord', () => {
  const records = personalRecords([
    { ...set('a', 100, 5, '2026-09-10T10:00:00Z'), exerciseId: 'squat' },
    set('b', 82.5, 6, '2026-09-28T10:00:00Z'),
    set('c', 80, 8, '2026-09-21T10:00:00Z'),
  ]);
  expect(records.map((r) => r.id)).toEqual(['b', 'a']);
});
