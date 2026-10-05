/**
 * @jest-environment node
 */
import type { AppDatabase } from '@/db/client';
import { createExercise } from '@/features/exercises/repository';
import { saveTemplate } from '@/features/templates/repository';
import { workoutState } from '@/db/schema';
import { createTestDb } from '@/test/testDb';
import {
  addSet,
  deleteSetAndRenumber,
  endWorkout,
  getActiveSession,
  getSession,
  getWorkoutState,
  lastSessionSets,
  listSessionSets,
  saveWorkoutState,
  setsBefore,
  startSession,
} from '../repository';
import { restoreWorkoutState, startFromTemplate } from '../start';

const USER = '11111111-1111-1111-1111-111111111111';
let db: AppDatabase;
let dc: string;
let squat: string;

beforeEach(async () => {
  db = await createTestDb();
  dc = createExercise(db, USER, {
    name: 'Développé couché',
    muscle: 'chest',
    equipment: 'barbell',
  });
  squat = createExercise(db, USER, { name: 'Squat', muscle: 'legs', equipment: 'barbell' });
});

const base = (sessionId: string, exerciseId: string, exerciseOrder = 0) => ({
  sessionId,
  exerciseId,
  exerciseOrder,
  difficulty: null,
});

it('démarre depuis une séance type avec un plan figé, et reprend une séance déjà en cours', () => {
  const templateId = saveTemplate(db, USER, {
    name: 'Push A',
    weekdays: [],
    items: [
      { exerciseId: dc, targetSets: 4, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 },
    ],
  });
  const first = startFromTemplate(db, USER, templateId);
  expect(first.resumed).toBe(false);
  expect(getSession(db, first.sessionId)?.name).toBe('Push A');
  expect(getWorkoutState(db, first.sessionId)?.plan).toEqual([
    { exerciseId: dc, targetSets: 4, repsMin: 8, repsMax: 10, restSeconds: 120 },
  ]);
  expect(startFromTemplate(db, USER, templateId)).toEqual({
    sessionId: first.sessionId,
    resumed: true,
  });
});

it('persiste l’état de l’écran (restauration après fermeture)', () => {
  const templateId = saveTemplate(db, USER, { name: 'Push A', weekdays: [], items: [] });
  const { sessionId } = startFromTemplate(db, USER, templateId);
  const state = getWorkoutState(db, sessionId)!;
  saveWorkoutState(db, sessionId, {
    ...state,
    current: 2,
    drafts: { '2:1': { weightKg: 82.5, reps: 6, difficulty: 'hard' } },
  });
  expect(getWorkoutState(db, sessionId)).toMatchObject({
    current: 2,
    drafts: { '2:1': { weightKg: 82.5 } },
  });
});

it('séries de la dernière autre séance, par exercice', () => {
  const old = startSession(db, USER, {
    templateId: null,
    name: 'A',
    startedAt: '2026-09-21T10:00:00.000Z',
  });
  addSet(db, USER, { ...base(old, dc), setNumber: 1, weightKg: 77.5, reps: 8 });
  const last = startSession(db, USER, {
    templateId: null,
    name: 'A',
    startedAt: '2026-09-24T10:00:00.000Z',
  });
  addSet(db, USER, { ...base(last, dc), setNumber: 1, weightKg: 80, reps: 8 });
  addSet(db, USER, { ...base(last, dc), setNumber: 2, weightKg: 80, reps: 7 });
  const current = startSession(db, USER, {
    templateId: null,
    name: 'A',
    startedAt: '2026-09-28T10:00:00.000Z',
  });
  addSet(db, USER, { ...base(current, dc), setNumber: 1, weightKg: 82.5, reps: 6 });

  const previous = lastSessionSets(db, USER, [dc, squat], current);
  expect(previous.get(dc)?.map((s) => [s.setNumber, s.weightKg, s.reps])).toEqual([
    [1, 80, 8],
    [2, 80, 7],
  ]);
  expect(previous.has(squat)).toBe(false);
});

it('supprimer une série renumérote les suivantes', () => {
  const s = startSession(db, USER, { templateId: null, name: 'A' });
  const ids = [1, 2, 3].map((n) =>
    addSet(db, USER, { ...base(s, dc), setNumber: n, weightKg: 80, reps: 8 }),
  );
  deleteSetAndRenumber(db, ids[0]!);
  expect(listSessionSets(db, s).map((x) => [x.id, x.setNumber])).toEqual([
    [ids[1], 1],
    [ids[2], 2],
  ]);
});

it('fin de séance : terminée si des séries, supprimée si vide, état effacé', () => {
  const templateId = saveTemplate(db, USER, { name: 'Push A', weekdays: [], items: [] });
  const empty = startFromTemplate(db, USER, templateId).sessionId;
  expect(endWorkout(db, empty)).toBe('discarded');
  expect(getSession(db, empty)?.deletedAt).not.toBeNull();
  expect(getWorkoutState(db, empty)).toBeUndefined();

  const full = startFromTemplate(db, USER, templateId).sessionId;
  addSet(db, USER, { ...base(full, dc), setNumber: 1, weightKg: 80, reps: 8 });
  expect(endWorkout(db, full)).toBe('finished');
  expect(getSession(db, full)?.endedAt).not.toBeNull();
  expect(getActiveSession(db, USER)).toBeUndefined();
});

it('séries faites avant une date (record à battre)', () => {
  const s = startSession(db, USER, { templateId: null, name: 'A' });
  addSet(db, USER, { ...base(s, dc), setNumber: 1, weightKg: 80, reps: 8 });
  expect(setsBefore(db, USER, [dc], '2000-01-01T00:00:00.000Z').size).toBe(0);
  expect(setsBefore(db, USER, [dc], '2999-01-01T00:00:00.000Z').get(dc)).toHaveLength(1);
});

it('séance démarrée sur un autre appareil : état reconstruit depuis la séance type', () => {
  const templateId = saveTemplate(db, USER, {
    name: 'Push A',
    weekdays: [],
    items: [
      { exerciseId: dc, targetSets: 4, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 150 },
      { exerciseId: squat, targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, restSeconds: 180 },
    ],
  });
  const { sessionId } = startFromTemplate(db, USER, templateId);
  addSet(db, USER, { ...base(sessionId, dc), setNumber: 1, weightKg: 80, reps: 8 });
  // L'autre appareil n'a que les lignes synchronisées, pas l'état de l'écran.
  db.delete(workoutState).run();

  const state = restoreWorkoutState(db, sessionId);
  expect(state?.plan.map((p) => [p.exerciseId, p.targetSets, p.restSeconds])).toEqual([
    [dc, 4, 150],
    [squat, 3, 180],
  ]);
  expect(getWorkoutState(db, sessionId)?.plan).toHaveLength(2);
});

it('séance démarrée ailleurs sans séance type : plan tiré des séries faites', () => {
  const sessionId = startSession(db, USER, { templateId: null, name: 'Libre' });
  addSet(db, USER, { ...base(sessionId, squat), setNumber: 1, weightKg: 100, reps: 5 });
  addSet(db, USER, { ...base(sessionId, squat), setNumber: 2, weightKg: 100, reps: 5 });
  addSet(db, USER, { ...base(sessionId, dc, 1), setNumber: 1, weightKg: 80, reps: 8 });
  db.delete(workoutState).run();

  expect(restoreWorkoutState(db, sessionId)?.plan).toEqual([
    { exerciseId: squat, targetSets: 2, repsMin: null, repsMax: null, restSeconds: 120 },
    { exerciseId: dc, targetSets: 1, repsMin: null, repsMax: null, restSeconds: 120 },
  ]);
});

it('séance terminée : rien à reconstruire', () => {
  const sessionId = startSession(db, USER, { templateId: null, name: 'Libre' });
  addSet(db, USER, { ...base(sessionId, dc), setNumber: 1, weightKg: 80, reps: 8 });
  endWorkout(db, sessionId);
  expect(restoreWorkoutState(db, sessionId)).toBeUndefined();
});
