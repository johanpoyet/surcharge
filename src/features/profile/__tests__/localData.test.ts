/**
 * @jest-environment node
 */
import { exercises, outbox } from '@/db/schema';
import { createExercise, seedDefaultExercises } from '@/features/exercises/repository';
import { saveTemplate } from '@/features/templates/repository';
import { startFromTemplate } from '@/features/workout/start';
import { createTestDb } from '@/test/testDb';
import { clearLocalData } from '../localData';

jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents' },
  Directory: jest.fn().mockImplementation(() => ({ exists: false, delete: jest.fn() })),
}));

const USER = '11111111-1111-1111-1111-111111111111';

it('vide toutes les tables locales', async () => {
  const db = await createTestDb();
  seedDefaultExercises(db, USER);
  const exerciseId = createExercise(db, USER, {
    name: 'Presse',
    muscle: 'legs',
    equipment: 'machine',
  });
  const templateId = saveTemplate(db, USER, {
    name: 'Legs',
    weekdays: [1],
    items: [{ exerciseId, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 }],
  });
  startFromTemplate(db, USER, templateId);

  clearLocalData(db);
  expect(db.select().from(exercises).all()).toHaveLength(0);
  expect(db.select().from(outbox).all()).toHaveLength(0);
});
