import { parseBlockConfig } from '../blockConfig';
import { estimateTemplate, estimateTemplateMinutes, runningKm } from '../estimate';

describe('durée estimée par blocs (SPEC_V2 §4.6)', () => {
  it('Simu Hyrox : échauffement 10 min + Hyrox complet 90 min + muscu', () => {
    const blocks = [
      { type: 'warmup' as const, config: { durationMin: 10 }, items: [] },
      { type: 'hyrox' as const, config: { format: 'full', division: 'open_men' }, items: [] },
      {
        type: 'strength' as const,
        config: {},
        items: [
          { targetSets: 3, restSeconds: 60 },
          { targetSets: 3, restSeconds: 60 },
        ],
      },
    ];
    // 600 + 5400 + 6 × 105 = 6630 s ≈ 110,5 min → 110
    expect(estimateTemplateMinutes(blocks)).toBe(110);
    expect(runningKm(blocks)).toBe(8);
  });

  it('circuits : durée fixe ou time cap, 15 min par défaut', () => {
    const minutes = (config: object) =>
      estimateTemplateMinutes([{ type: 'circuit', config: config as never, items: [] }]);
    expect(minutes({ format: 'amrap', durationS: 720 })).toBe(10); // 12 → arrondi à 10
    expect(minutes({ format: 'emom', intervalS: 60, rounds: 20 })).toBe(20);
    expect(minutes({ format: 'tabata', workS: 20, restS: 10, rounds: 8 })).toBe(5);
    expect(minutes({ format: 'for_time', rounds: 3 })).toBe(15);
  });

  it('cardio : somme des cibles, sinon 30 min ; km des exercices de course', () => {
    expect(estimateTemplateMinutes([{ type: 'cardio', config: {}, items: [] }])).toBe(30);
    const intervals = {
      type: 'cardio' as const,
      config: {},
      items: [{ targetSets: 6, targetDistanceM: 400, restSeconds: 90, running: true }],
    };
    // 6 × (400 × 0,36 + 90) = 1404 s ≈ 23,4 min → 25
    expect(estimateTemplateMinutes([intervals])).toBe(25);
    expect(runningKm([intervals])).toBe(2.4);
  });

  it('séance V1 (un bloc Musculation) : même résultat qu’avant', () => {
    expect(
      estimateTemplateMinutes([
        { type: 'strength', config: {}, items: [{ targetSets: 4, restSeconds: 120 }] },
      ]),
    ).toBe(10);
  });

  it('configuration invalide : valeurs par défaut', () => {
    expect(parseBlockConfig('hyrox', { format: 'marathon' })).toEqual({
      format: 'full',
      division: 'open_men',
    });
    expect(parseBlockConfig('circuit', null)).toMatchObject({ format: 'amrap' });
  });
});

describe('estimateTemplate (lignes en base)', () => {
  const row = (blockId: string | null, discipline = 'strength') => ({
    blockId,
    targetSets: 4,
    restSeconds: 120,
    targetDistanceM: null,
    targetDurationS: null,
    discipline,
  });

  it('séance V1 sans bloc : bloc Musculation implicite', () => {
    expect(estimateTemplate([], [row(null)])).toEqual({ minutes: 10, km: 0 });
  });

  it('blocs + exercices rattachés', () => {
    const blocks = [
      { id: 'h', type: 'hyrox' as const, config: { format: 'half', division: 'open_men' } },
      { id: 's', type: 'strength' as const, config: {} },
    ];
    // 45 min + 4 × (45 + 120) s = 56 min → 55
    expect(estimateTemplate(blocks, [row('s')])).toEqual({ minutes: 55, km: 4 });
  });
});
