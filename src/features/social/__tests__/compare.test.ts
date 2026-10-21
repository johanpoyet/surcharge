import { commonExercises, periodStats } from '../compare';
import { HYROX_FULL_KEY } from '../publicStats';

const today = new Date(2026, 9, 22, 18); // jeudi, semaine du 19, 4e semaine d'octobre
const stats = {
  week_start: '2026-10-19',
  sessions_this_week: 3,
  weekly_goal: 4,
  sessions_this_month: 12,
  records_this_week: 1,
  records_this_month: 5,
};

it('semaine et mois : séances, objectif atteint en %, records', () => {
  expect(periodStats(stats, 'week', today)).toEqual({ sessions: 3, goalPct: 75, records: 1 });
  // 12 séances pour un objectif de 4 × 4 semaines = 75 %.
  expect(periodStats(stats, 'month', today)).toEqual({ sessions: 12, goalPct: 75, records: 5 });
  expect(periodStats({ ...stats, week_start: '2026-10-12' }, 'week', today).sessions).toBe(0);
  expect(
    periodStats({ ...stats, updated_at: '2026-09-30T10:00:00Z' }, 'month', today).sessions,
  ).toBe(0);
  expect(periodStats(null, 'month', today)).toEqual({ sessions: 0, goalPct: 0, records: 0 });
});

it('exercices en commun, Simu Hyrox à part', () => {
  const row = (catalog_key: string, user_id = 'b') => ({
    user_id,
    catalog_key,
    progress_pct_3m: 6,
    best_weight_kg: null,
    best_time_s: null,
  });
  const result = commonExercises(
    [row('bench_press', 'a'), row('squat', 'a'), row(HYROX_FULL_KEY, 'a')],
    [row('bench_press'), row('deadlift'), row(HYROX_FULL_KEY)],
  );
  expect(result.exercises.map((e) => e.key)).toEqual(['bench_press']);
  expect(result.hyrox?.key).toBe(HYROX_FULL_KEY);
});
