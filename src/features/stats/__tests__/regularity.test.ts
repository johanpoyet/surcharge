import { recordSets, regularityWeeks } from '../regularity';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 18);

describe('semaines de régularité (SPEC 9.2)', () => {
  const today = d(2026, 9, 30); // mercredi
  const sessions = [
    d(2026, 9, 8),
    d(2026, 9, 10), // S37 : 2
    d(2026, 9, 15),
    d(2026, 9, 17), // S38 : 2
    d(2026, 9, 22),
    d(2026, 9, 25), // S39 : 2
    d(2026, 9, 28), // S40 (en cours) : 1
  ];

  it('remonte depuis la semaine précédente', () => {
    expect(regularityWeeks(sessions, 2, today)).toBe(3);
  });

  it('compte la semaine en cours si l’objectif est déjà atteint', () => {
    expect(regularityWeeks([...sessions, d(2026, 9, 29)], 2, today)).toBe(4);
  });

  it('objectif 1 par défaut ; une semaine manquée coupe la série', () => {
    expect(regularityWeeks([d(2026, 9, 1), d(2026, 9, 22)], null, today)).toBe(1);
    expect(regularityWeeks([], null, today)).toBe(0);
  });
});

it('records au moment où ils sont faits (la première série ne compte pas)', () => {
  const set = (
    id: string,
    exerciseId: string,
    weightKg: number,
    reps: number,
    completedAt: string,
  ) => ({
    id,
    exerciseId,
    weightKg,
    reps,
    difficulty: null,
    completedAt,
  });
  const records = recordSets([
    set('a', 'dc', 80, 8, '2026-09-01T10:00:00Z'),
    set('b', 'dc', 80, 9, '2026-09-08T10:00:00Z'),
    set('c', 'dc', 80, 8, '2026-09-15T10:00:00Z'),
    set('d', 'dc', 82.5, 6, '2026-09-22T10:00:00Z'),
    set('e', 'squat', 100, 5, '2026-09-22T10:10:00Z'),
  ]);
  expect(records.map((r) => r.id)).toEqual(['b', 'd']);
});
