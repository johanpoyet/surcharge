import { nowIso } from '../time';

it('horodatages strictement croissants, même dans la même milliseconde', () => {
  const values = Array.from({ length: 50 }, () => nowIso());
  for (let i = 1; i < values.length; i++) expect(values[i]! > values[i - 1]!).toBe(true);
});
