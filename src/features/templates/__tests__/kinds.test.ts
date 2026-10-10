import { mergeKinds, sessionKinds } from '../kinds';

it('déduit le type d’une séance de ses blocs, dans l’ordre et sans doublon', () => {
  expect(sessionKinds(['strength'])).toEqual(['strength']);
  expect(sessionKinds(['warmup', 'hyrox'])).toEqual(['hyrox']);
  expect(sessionKinds(['warmup', 'cardio', 'cardio'])).toEqual(['running']);
  expect(sessionKinds(['strength', 'circuit'])).toEqual(['strength', 'cross_training']);
});

it('séance V1 sans bloc : musculation ; jamais plus de deux icônes', () => {
  expect(sessionKinds([])).toEqual(['strength']);
  expect(sessionKinds(['warmup'])).toEqual(['strength']);
  expect(sessionKinds(['strength', 'cardio', 'circuit', 'hyrox'])).toEqual(['strength', 'running']);
  expect(mergeKinds(['running'], ['running', 'hyrox'])).toEqual(['running', 'hyrox']);
});
