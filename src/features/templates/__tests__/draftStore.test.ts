import { blocksFromDraft, draftFromBlocks } from '../draftConvert';
import { defaultItem, useTemplateDraft } from '../draftStore';

const state = () => useTemplateDraft.getState();
const strength = (ids: string[]) => ids.map((id) => defaultItem('strength', id, 'weight_reps', 90));

beforeEach(() =>
  state().load({
    name: 'Push A',
    weekdays: [3, 1],
    blocks: [{ id: 'b1', type: 'strength', name: null, config: {}, items: [] }],
  }),
);

it('charge un brouillon propre, jours triés', () => {
  expect(state()).toMatchObject({ name: 'Push A', weekdays: [1, 3], dirty: false });
  expect(state().blocks).toHaveLength(1);
});

it('ajoute des exercices au bloc choisi, avec les valeurs par défaut', () => {
  state().setPickTarget('b1');
  state().addExercises(strength(['a', 'b']));
  expect(
    state().blocks[0]!.items.map((i) => [i.exerciseId, i.targetSets, i.repsText, i.restText]),
  ).toEqual([
    ['a', 3, '8–12', '1:30'],
    ['b', 3, '8–12', '1:30'],
  ]);
  expect(state().dirty).toBe(true);
});

it('réordonne, modifie et retire des exercices dans un bloc', () => {
  state().setPickTarget('b1');
  state().addExercises(strength(['a', 'b', 'c']));
  state().moveItem('b1', 0, 2);
  expect(state().blocks[0]!.items.map((i) => i.exerciseId)).toEqual(['b', 'c', 'a']);
  const [first] = state().blocks[0]!.items;
  state().updateItem(first!.key, { targetSets: 5 });
  state().removeItem(state().blocks[0]!.items[1]!.key);
  expect(state().blocks[0]!.items.map((i) => [i.exerciseId, i.targetSets])).toEqual([
    ['b', 5],
    ['a', 3],
  ]);
});

it('ajoute, déplace, duplique et supprime des blocs', () => {
  const hyrox = state().addBlock('hyrox');
  expect(state().blocks[1]).toMatchObject({
    type: 'hyrox',
    config: { format: 'full', division: 'open_men' },
  });
  state().moveBlock(1, 0);
  expect(state().blocks.map((b) => b.type)).toEqual(['hyrox', 'strength']);
  state().duplicateBlock(hyrox);
  expect(state().blocks.map((b) => b.type)).toEqual(['hyrox', 'hyrox', 'strength']);
  expect(state().blocks[1]!.id).toBeUndefined();
  state().removeBlock(hyrox);
  expect(state().blocks.map((b) => b.type)).toEqual(['hyrox', 'strength']);
});

it('bascule les jours', () => {
  state().toggleWeekday(1);
  state().toggleWeekday(7);
  expect(state().weekdays).toEqual([3, 7]);
});

describe('cibles par défaut', () => {
  it('course : 1 série de 1 km, récup 1:30 ; circuit : 10 reps par tour', () => {
    expect(defaultItem('cardio', 'run', 'distance_time', 120)).toMatchObject({
      targetSets: 1,
      targetDistanceM: 1000,
      restText: '1:30',
    });
    expect(defaultItem('circuit', 'burpee', 'reps', 120)).toMatchObject({
      targetSets: 1,
      repsText: '10',
      restText: '0:00',
    });
    expect(defaultItem('circuit', 'bike', 'calories', 120)).toMatchObject({ targetCalories: 10 });
  });
});

describe('conversion brouillon ↔ blocs', () => {
  it('refuse une séance sans bloc, un bloc d’exercices vide, une saisie invalide', () => {
    expect(blocksFromDraft([])).toEqual({ error: 'noBlocks' });
    expect(blocksFromDraft(state().blocks)).toEqual({ error: 'emptyBlock' });
    state().setPickTarget('b1');
    state().addExercises(strength(['a']));
    state().updateItem(state().blocks[0]!.items[0]!.key, { repsText: 'beaucoup' });
    expect(blocksFromDraft(state().blocks)).toEqual({ error: 'invalidItems' });
  });

  it('un bloc Hyrox seul est valide (segments générés) ; aller-retour sans perte', () => {
    state().removeBlock('b1');
    state().addBlock('warmup');
    state().addBlock('hyrox');
    const result = blocksFromDraft(state().blocks);
    expect('blocks' in result && result.blocks.map((b) => b.type)).toEqual(['warmup', 'hyrox']);

    const loaded = [
      {
        id: 'b9',
        type: 'cardio' as const,
        name: 'Fractionné',
        config: {},
        items: [
          {
            id: 'i1',
            exerciseId: 'run',
            targetSets: 6,
            targetRepsMin: null,
            targetRepsMax: null,
            restSeconds: 90,
            targetDistanceM: 400,
          },
        ],
      },
    ];
    const draft = draftFromBlocks(loaded);
    expect(draft[0]!.items[0]).toMatchObject({
      restText: '1:30',
      targetDistanceM: 400,
      repsText: '',
    });
  });
});
