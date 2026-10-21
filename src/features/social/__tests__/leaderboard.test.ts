import { describeEvent, leaderboard, timeAgo, type LeaderboardPerson } from '../leaderboard';

// Jeudi 22 octobre 2026 : semaine du lundi 19.
const today = new Date(2026, 9, 22, 18);
const week = '2026-10-19';
const person = (
  name: string,
  sessions: number,
  goal: number,
  records = 0,
  progress: number | null = null,
  weekStart = week,
): LeaderboardPerson => ({
  userId: name,
  name,
  isMe: name === 'Toi',
  stats: {
    week_start: weekStart,
    sessions_this_week: sessions,
    weekly_goal: goal,
    records_this_week: records,
  },
  progress,
});

it('assiduité : ratio plafonné à 100 %, puis nombre de séances', () => {
  const rows = leaderboard(
    [person('Toi', 3, 3), person('Théo', 5, 4), person('Inès', 2, 3), person('Malik', 1, 4)],
    'regularity',
    today,
  );
  expect(rows.map((r) => [r.rank, r.person.name, r.value])).toEqual([
    [1, 'Théo', '5/4'],
    [2, 'Toi', '3/3'],
    [3, 'Inès', '2/3'],
    [4, 'Malik', '1/4'],
  ]);
  expect(rows[0]!.fill).toBe(1);
  expect(rows[3]!.fill).toBe(0.25);
});

it('remis à zéro chaque lundi : des stats de la semaine passée comptent pour 0', () => {
  const rows = leaderboard(
    [person('Théo', 5, 4, 2, null, '2026-10-12'), person('Toi', 1, 3)],
    'regularity',
    today,
  );
  expect(rows.map((r) => [r.person.name, r.value])).toEqual([
    ['Toi', '1/3'],
    ['Théo', '0/4'],
  ]);
});

it('progression et records ; ex æquo au même rang', () => {
  const people = [
    person('Toi', 0, 3, 2, 10),
    person('Théo', 0, 3, 2, 6),
    person('Inès', 0, 3, 0, null),
  ];
  expect(leaderboard(people, 'progress', today).map((r) => [r.person.name, r.value])).toEqual([
    ['Toi', '+10 %'],
    ['Théo', '+6 %'],
    ['Inès', '—'],
  ]);
  expect(leaderboard(people, 'records', today).map((r) => [r.rank, r.person.name])).toEqual([
    [1, 'Toi'],
    [1, 'Théo'],
    [3, 'Inès'],
  ]);
});

it('phrases du fil d’activité et dates relatives', () => {
  expect(
    describeEvent({
      id: 'e',
      userId: 'u',
      type: 'record',
      payload: { exerciseName: 'Squat', value: '100 kg × 3' },
      createdAt: '',
    }),
  ).toEqual({ text: ' a battu son record au ', strong: 'squat', value: '100 kg × 3' });
  expect(
    describeEvent({
      id: 'e',
      userId: 'u',
      type: 'hyrox_done',
      payload: { format: 'full', totalS: 5050 },
      createdAt: '',
    }).value,
  ).toBe('1:24:10');
  expect(timeAgo(new Date(2026, 9, 22, 16).toISOString(), today)).toBe('il y a 2 h');
  expect(timeAgo(new Date(2026, 9, 21, 9).toISOString(), today)).toBe('hier');
});
