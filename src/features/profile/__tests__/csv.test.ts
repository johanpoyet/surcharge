import { buildCsv } from '../csv';

it('CSV français : « ; », virgule décimale, ressenti en clair, champs échappés', () => {
  const csv = buildCsv([
    {
      startedAt: new Date(2026, 8, 28, 18, 5).toISOString(),
      sessionName: 'Push A',
      exerciseName: 'Développé couché; prise large',
      exerciseOrder: 0,
      setNumber: 1,
      weightKg: 82.5,
      reps: 6,
      difficulty: 'hard',
    },
  ]);
  const [header, line] = csv.replace('﻿', '').trim().split('\n');
  expect(csv.startsWith('﻿')).toBe(true);
  expect(header).toBe('date;heure;séance;exercice;ordre;série;charge_kg;reps;ressenti');
  expect(line).toBe('2026-09-28;18:05;Push A;"Développé couché; prise large";1;1;82,5;6;Difficile');
});
