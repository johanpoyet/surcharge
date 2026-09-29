import { useTemplateDraft } from '../draftStore';

const state = () => useTemplateDraft.getState();

beforeEach(() => state().load({ name: 'Push A', weekdays: [3, 1], items: [] }));

it('charge un brouillon propre, jours triés', () => {
  expect(state()).toMatchObject({ name: 'Push A', weekdays: [1, 3], items: [], dirty: false });
});

it('ajoute des exercices avec les valeurs par défaut', () => {
  state().addExercises(['a', 'b'], 90);
  expect(state().items.map((i) => [i.exerciseId, i.targetSets, i.repsText, i.restText])).toEqual([
    ['a', 3, '8–12', '1:30'],
    ['b', 3, '8–12', '1:30'],
  ]);
  expect(state().dirty).toBe(true);
});

it('réordonne, modifie et retire', () => {
  state().addExercises(['a', 'b', 'c'], 120);
  state().moveItem(0, 2);
  expect(state().items.map((i) => i.exerciseId)).toEqual(['b', 'c', 'a']);
  const [first] = state().items;
  state().updateItem(first!.key, { targetSets: 5 });
  state().removeItem(state().items[1]!.key);
  expect(state().items.map((i) => [i.exerciseId, i.targetSets])).toEqual([
    ['b', 5],
    ['a', 3],
  ]);
});

it('bascule les jours', () => {
  state().toggleWeekday(1);
  state().toggleWeekday(7);
  expect(state().weekdays).toEqual([3, 7]);
});
