import {
  progressPct3m,
  publicSnapshot,
  weekStart,
  type StatsInput,
  type StatsSet,
} from '../publicStats';

const USER = 'u1';
// Jeudi 22 octobre 2026, 18 h.
const today = new Date(2026, 9, 22, 18);
const daysAgo = (n: number, hour = 10) => new Date(2026, 9, 22 - n, hour).toISOString();

let n = 0;
const lift = (exerciseId: string, weightKg: number, reps: number, at: string): StatsSet => ({
  id: `s${++n}`,
  exerciseId,
  catalogKey: exerciseId === 'perso' ? null : exerciseId,
  trackingType: 'weight_reps',
  weightKg,
  reps,
  difficulty: null,
  completedAt: at,
});
const run = (distanceM: number, durationS: number, at: string): StatsSet => ({
  id: `s${++n}`,
  exerciseId: 'run_easy',
  catalogKey: 'run_easy',
  trackingType: 'distance_time',
  weightKg: 0,
  reps: 0,
  difficulty: null,
  completedAt: at,
  distanceM,
  durationS,
});

const base = (patch: Partial<StatsInput> = {}): StatsInput => ({
  userId: USER,
  today,
  sessionsPerWeek: 2,
  share: { shareSessions: true, shareRecords: true, shareExactWeights: false },
  sessionStarts: [],
  sets: [],
  hyroxBlocks: [],
  exerciseNames: new Map([
    ['squat', 'Squat'],
    ['run_easy', 'Footing'],
  ]),
  ...patch,
});

it('lundi de la semaine', () => {
  expect(weekStart(today)).toEqual(new Date(2026, 9, 19));
  expect(weekStart(new Date(2026, 9, 25))).toEqual(new Date(2026, 9, 19));
});

it('séances de la semaine et du mois, objectif, série de semaines', () => {
  const { stats } = publicSnapshot(
    base({
      // Cette semaine : 2 (objectif atteint) ; semaine d'avant : 2 ; octobre : 5.
      sessionStarts: [daysAgo(0), daysAgo(2), daysAgo(7), daysAgo(8), daysAgo(15)],
    }),
  );
  expect(stats).toMatchObject({
    user_id: USER,
    week_start: '2026-10-19',
    sessions_this_week: 2,
    weekly_goal: 2,
    streak_weeks: 2,
    sessions_this_month: 5,
  });
});

it('records : comptés, et activités récentes sans charge exacte par défaut', () => {
  const sets = [lift('squat', 100, 5, daysAgo(20)), lift('squat', 105, 5, daysAgo(1))];
  const hidden = publicSnapshot(base({ sets }));
  expect(hidden.stats.records_this_week).toBe(1);
  expect(hidden.events).toEqual([
    expect.objectContaining({
      type: 'record',
      key: `record:${sets[1]!.id}`,
      payload: { exerciseName: 'Squat', value: null },
    }),
  ]);
  const exact = publicSnapshot(
    base({ sets, share: { shareSessions: true, shareRecords: true, shareExactWeights: true } }),
  );
  expect(exact.events[0]?.payload.value).toBe('105 kg × 5');
  expect(exact.exercises[0]).toMatchObject({ catalog_key: 'squat', best_weight_kg: 105 });
  expect(hidden.exercises[0]).toMatchObject({ catalog_key: 'squat', best_weight_kg: null });
});

it('records non partagés : aucune activité ; vieux records : pas dans le fil', () => {
  const sets = [lift('squat', 100, 5, daysAgo(40)), lift('squat', 110, 5, daysAgo(30))];
  expect(publicSnapshot(base({ sets })).events).toEqual([]);
  const recent = [lift('squat', 100, 5, daysAgo(20)), lift('squat', 110, 5, daysAgo(1))];
  const off = publicSnapshot(
    base({
      sets: recent,
      share: { shareSessions: true, shareRecords: false, shareExactWeights: false },
    }),
  );
  expect(off.events).toEqual([]);
});

it('exercice perso (sans clé du catalogue) : jamais dans les stats par exercice', () => {
  const { exercises } = publicSnapshot(base({ sets: [lift('perso', 50, 10, daysAgo(1))] }));
  expect(exercises).toEqual([]);
});

it('progression sur 3 mois : charge en hausse, allure en baisse = progrès', () => {
  expect(
    progressPct3m([lift('squat', 100, 5, daysAgo(95)), lift('squat', 110, 5, daysAgo(3))], today),
  ).toBe(10);
  // 5:00 /km il y a 3 mois, 4:30 /km maintenant : +10 %.
  expect(progressPct3m([run(5000, 1500, daysAgo(92)), run(5000, 1350, daysAgo(2))], today)).toBe(
    10,
  );
  // Pas de séance il y a 3 mois : pas de pourcentage.
  expect(progressPct3m([lift('squat', 110, 5, daysAgo(3))], today)).toBeNull();
});

it('série de semaines paire et simu Hyrox : activités si les séances sont partagées', () => {
  const input = base({
    sessionStarts: [daysAgo(0), daysAgo(2), daysAgo(7), daysAgo(8)],
    hyroxBlocks: [
      { id: 'h1', endedAt: daysAgo(2), format: 'full', totalS: 5400 },
      { id: 'h0', endedAt: daysAgo(30), format: 'full', totalS: 5600 },
    ],
  });
  expect(publicSnapshot(input).events.map((e) => e.key)).toEqual([
    'streak:2026-10-19:2',
    'hyrox:h1',
  ]);
  const off = publicSnapshot({
    ...input,
    share: { shareSessions: false, shareRecords: true, shareExactWeights: false },
  });
  expect(off.events).toEqual([]);
});
