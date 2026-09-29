/**
 * @jest-environment node
 */
import {
  createExercise,
  exerciseHistoryQuery,
  exerciseSessionStatsQuery,
  groupHistory,
} from '../repository';
import { addSet, startSession } from '@/features/workout/repository';
import { createTestDb } from '@/test/testDb';

const USER = '11111111-1111-1111-1111-111111111111';

it('charge max réussie par séance (échecs exclus) et historique groupé par séance', async () => {
  const db = await createTestDb();
  const exerciseId = createExercise(db, USER, {
    name: 'DC',
    muscle: 'chest',
    equipment: 'barbell',
  });
  const s1 = startSession(db, USER, {
    templateId: null,
    name: 'Push A',
    startedAt: '2026-09-21T10:00:00Z',
  });
  const s2 = startSession(db, USER, {
    templateId: null,
    name: 'Push A',
    startedAt: '2026-09-28T10:00:00Z',
  });
  const base = { exerciseId, exerciseOrder: 0 };
  addSet(db, USER, {
    ...base,
    sessionId: s1,
    setNumber: 1,
    weightKg: 80,
    reps: 8,
    difficulty: 'easy',
  });
  addSet(db, USER, {
    ...base,
    sessionId: s2,
    setNumber: 1,
    weightKg: 82.5,
    reps: 6,
    difficulty: 'hard',
  });
  addSet(db, USER, {
    ...base,
    sessionId: s2,
    setNumber: 2,
    weightKg: 85,
    reps: 0,
    difficulty: 'fail',
  });

  const stats = exerciseSessionStatsQuery(db, USER).all();
  const bySession = Object.fromEntries(stats.map((s) => [s.sessionId, s.maxKg]));
  expect(bySession).toEqual({ [s1]: 80, [s2]: 82.5 });

  const history = groupHistory(exerciseHistoryQuery(db, exerciseId).all());
  expect(history.map((h) => [h.sessionId, h.sets.map((s) => s.setNumber)])).toEqual([
    [s2, [1, 2]],
    [s1, [1]],
  ]);
});
