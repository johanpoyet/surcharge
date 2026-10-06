/**
 * @jest-environment node
 */
import { templateIdForDate } from '@/features/planning/repository';
import { createExercise, listExercises } from '@/features/exercises/repository';
import { createTestDb } from '@/test/testDb';
import type { AppDatabase } from '@/db/client';
import {
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplateBlocks,
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

describe('séances types en blocs (V2)', () => {
  const block = (
    type: 'warmup' | 'strength' | 'cardio' | 'circuit' | 'hyrox',
    items: ReturnType<typeof item>[] = [],
    config: Record<string, unknown> = {},
    id?: string,
  ) => ({ id, type, name: null, config, items });

  it('« Simu Hyrox » : échauffement, Hyrox complet, muscu (critère de la Phase D)', () => {
    const id = saveTemplate(db, USER, {
      name: 'Simu Hyrox',
      weekdays: [6],
      blocks: [
        block('warmup', [], { durationMin: 10, note: 'Footing léger + mobilité' }),
        block('hyrox', [], { format: 'full', division: 'open_men' }),
        block('strength', [item(exerciseIds[0]!), item(exerciseIds[1]!)]),
      ],
    });
    const blocks = listTemplateBlocks(db, id);
    expect(blocks.map((b) => b.type)).toEqual(['warmup', 'hyrox', 'strength']);
    expect(blocks[0]?.config).toEqual({ durationMin: 10, note: 'Footing léger + mobilité' });
    expect(blocks[2]?.items.map((i) => i.exerciseId)).toEqual(exerciseIds.slice(0, 2));
    // Placée le samedi au planning.
    expect(templateIdForDate(db, USER, new Date(2026, 9, 3))).toBe(id);
    // Les exercices Hyrox du catalogue sont dans la bibliothèque.
    expect(listExercises(db, USER).some((e) => e.catalogKey === 'hyrox_skierg')).toBe(true);
  });

  it('positions des exercices continues d’un bloc à l’autre (ordre lu par les anciennes versions)', () => {
    const id = saveTemplate(db, USER, {
      name: 'Mix',
      weekdays: [],
      blocks: [
        block('strength', [item(exerciseIds[0]!)]),
        block('circuit', [item(exerciseIds[1]!), item(exerciseIds[2]!)], {
          format: 'amrap',
          durationS: 600,
        }),
      ],
    });
    expect(listTemplateExercises(db, id).map((i) => [i.exerciseId, i.position])).toEqual([
      [exerciseIds[0], 0],
      [exerciseIds[1], 1],
      [exerciseIds[2], 2],
    ]);
  });

  it('modifier : réordonne les blocs, en supprime un avec ses exercices', () => {
    const id = saveTemplate(db, USER, {
      name: 'Mix',
      weekdays: [],
      blocks: [
        block('strength', [item(exerciseIds[0]!)]),
        block('cardio', [item(exerciseIds[1]!)]),
      ],
    });
    const [strength, cardio] = listTemplateBlocks(db, id);
    saveTemplate(db, USER, {
      id,
      name: 'Mix',
      weekdays: [],
      blocks: [
        { ...block('warmup'), name: 'Mobilité' },
        { ...block('strength', strength!.items as never, {}, strength!.id) },
      ],
    });
    const after = listTemplateBlocks(db, id);
    expect(after.map((b) => [b.type, b.name])).toEqual([
      ['warmup', 'Mobilité'],
      ['strength', null],
    ]);
    expect(after[1]?.id).toBe(strength!.id);
    // Le bloc cardio et son exercice sont supprimés (doucement).
    expect(listTemplateExercises(db, id).map((i) => i.exerciseId)).toEqual([exerciseIds[0]]);
    expect(cardio?.id).toBeDefined();
  });

  it('duplique les blocs et leurs exercices', () => {
    const id = saveTemplate(db, USER, {
      name: 'Mix',
      weekdays: [1],
      blocks: [block('warmup', [], { durationMin: 5 }), block('strength', [item(exerciseIds[0]!)])],
    });
    const copy = duplicateTemplate(db, USER, id, 'Mix (copie)');
    const blocks = listTemplateBlocks(db, copy);
    expect(blocks.map((b) => b.type)).toEqual(['warmup', 'strength']);
    expect(blocks[1]?.items).toHaveLength(1);
    expect(blocks[0]?.id).not.toBe(listTemplateBlocks(db, id)[0]?.id);
  });

  it('API V1 (exercices seuls) : un bloc Musculation', () => {
    const id = saveTemplate(db, USER, {
      name: 'Push',
      weekdays: [],
      items: [item(exerciseIds[0]!)],
    });
    expect(listTemplateBlocks(db, id)).toMatchObject([{ type: 'strength', id }]);
  });
});
