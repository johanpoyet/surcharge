/**
 * @jest-environment node
 */
import { templateIdForDate } from '@/features/planning/repository';
import { createExercise } from '@/features/exercises/repository';
import { createTestDb } from '@/test/testDb';
import type { AppDatabase } from '@/db/client';
import {
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplateExercises,
  saveTemplate,
  templateItemsQuery,
  templateWeekdays,
} from '../repository';

const USER = '11111111-1111-1111-1111-111111111111';
const monday = new Date(2026, 8, 28);
const wednesday = new Date(2026, 8, 30);

let db: AppDatabase;
let exerciseIds: string[];

beforeEach(async () => {
  db = await createTestDb();
  exerciseIds = [
    'Développé couché',
    'Développé incliné haltères',
    'Élévations latérales',
    'Extension triceps poulie',
  ].map((name) => createExercise(db, USER, { name, muscle: 'chest', equipment: 'barbell' }));
});

const item = (exerciseId: string, id?: string) => ({
  id,
  exerciseId,
  targetSets: 3,
  targetRepsMin: 8,
  targetRepsMax: 10,
  restSeconds: 120,
});

it('crée « Push A » avec 4 exercices, placée le lundi (critère de la Phase 5)', () => {
  const id = saveTemplate(db, USER, {
    name: ' Push A ',
    items: exerciseIds.map((e) => item(e)),
    weekdays: [1],
  });
  expect(getTemplate(db, id)?.name).toBe('Push A');
  expect(listTemplateExercises(db, id).map((i) => i.exerciseId)).toEqual(exerciseIds);
  expect(templateIdForDate(db, USER, monday)).toBe(id);
  expect(templateWeekdays(db, USER, id)).toEqual([1]);
});

it('modifie : réordonne, retire un exercice et change les jours', () => {
  const id = saveTemplate(db, USER, {
    name: 'Push A',
    items: exerciseIds.map((e) => item(e)),
    weekdays: [1],
  });
  const rows = listTemplateExercises(db, id);
  saveTemplate(db, USER, {
    id,
    name: 'Push A',
    items: [item(rows[2]!.exerciseId, rows[2]!.id), item(rows[0]!.exerciseId, rows[0]!.id)],
    weekdays: [3],
  });
  expect(listTemplateExercises(db, id).map((i) => i.exerciseId)).toEqual([
    exerciseIds[2],
    exerciseIds[0],
  ]);
  expect(templateIdForDate(db, USER, monday)).toBeNull();
  expect(templateIdForDate(db, USER, wednesday)).toBe(id);
});

it('un jour déjà pris passe à la nouvelle séance type', () => {
  const pushA = saveTemplate(db, USER, { name: 'Push A', items: [], weekdays: [1, 3] });
  const pullA = saveTemplate(db, USER, { name: 'Pull A', items: [], weekdays: [1] });
  expect(templateIdForDate(db, USER, monday)).toBe(pullA);
  expect(templateWeekdays(db, USER, pushA)).toEqual([3]);
});

it('duplique les exercices mais pas les jours', () => {
  const id = saveTemplate(db, USER, {
    name: 'Push A',
    items: exerciseIds.map((e) => item(e)),
    weekdays: [1],
  });
  const copy = duplicateTemplate(db, USER, id, 'Push A (copie)');
  expect(getTemplate(db, copy)?.name).toBe('Push A (copie)');
  expect(listTemplateExercises(db, copy)).toHaveLength(4);
  expect(templateWeekdays(db, USER, copy)).toEqual([]);
  expect(templateIdForDate(db, USER, monday)).toBe(id);
});

it('supprimer une séance type libère ses jours', () => {
  const id = saveTemplate(db, USER, {
    name: 'Push A',
    items: [item(exerciseIds[0]!)],
    weekdays: [1],
  });
  deleteTemplate(db, id);
  expect(templateIdForDate(db, USER, monday)).toBeNull();
});

it('la requête des lignes joint le nom et le muscle de l’exercice', () => {
  saveTemplate(db, USER, { name: 'Push A', items: [item(exerciseIds[0]!)], weekdays: [] });
  expect(templateItemsQuery(db, USER).all()).toEqual([
    expect.objectContaining({ exerciseName: 'Développé couché', muscle: 'chest', position: 0 }),
  ]);
});
