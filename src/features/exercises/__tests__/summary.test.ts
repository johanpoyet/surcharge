import { normalizeSearch, sortByLastUse, summarizeExercises, typedSummary } from '../summary';

const row = (exerciseId: string, sessionId: string, maxKg: number | null, lastAt: string) => ({
  exerciseId,
  sessionId,
  maxKg,
  lastAt,
});

describe('summarizeExercises', () => {
  it('dernière utilisation, charge max de la dernière séance et tendance', () => {
    const summaries = summarizeExercises([
      row('dc', 's1', 80, '2026-09-21T10:00:00Z'),
      row('dc', 's2', 82.5, '2026-09-28T10:00:00Z'),
      row('squat', 's1', 110, '2026-09-21T10:30:00Z'),
    ]);
    expect(summaries.get('dc')).toMatchObject({
      lastUsedAt: '2026-09-28T10:00:00Z',
      lastMaxKg: 82.5,
      trend: { kind: 'record' },
    });
    expect(summaries.get('squat')?.trend).toBeNull();
  });

  it('ignore les séances sans série réussie pour la charge et la tendance', () => {
    const summaries = summarizeExercises([
      row('dc', 's1', 80, '2026-09-21T10:00:00Z'),
      row('dc', 's2', 82.5, '2026-09-24T10:00:00Z'),
      row('dc', 's3', null, '2026-09-28T10:00:00Z'),
    ]);
    expect(summaries.get('dc')).toMatchObject({
      lastUsedAt: '2026-09-28T10:00:00Z',
      lastMaxKg: 82.5,
      trend: { kind: 'record' },
    });
  });
});

describe('sortByLastUse', () => {
  it('les plus récents d’abord, puis les jamais faits par ordre alphabétique', () => {
    const items = [
      { id: 'a', name: 'Élévations latérales' },
      { id: 'b', name: 'Squat' },
      { id: 'c', name: 'Curl barre' },
      { id: 'd', name: 'Dips' },
    ];
    const summaries = summarizeExercises([
      row('b', 's1', 100, '2026-09-20T10:00:00Z'),
      row('d', 's2', 10, '2026-09-28T10:00:00Z'),
    ]);
    expect(sortByLastUse(items, summaries).map((i) => i.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});

it('recherche sans accents ni casse', () => {
  expect(normalizeSearch('  Élévations ')).toBe('elevations');
  expect(normalizeSearch('Presse à cuisses 45°')).toContain('presse a cuisses');
});

describe('typedSummary (types de suivi V2)', () => {
  it('course : meilleure allure de la dernière séance, une allure qui baisse est un progrès', () => {
    const summaries = summarizeExercises([
      { ...row('run', 's1', null, '2026-09-21T10:00:00Z'), bestPace: 240 },
      { ...row('run', 's2', null, '2026-09-28T10:00:00Z'), bestPace: 230 },
    ]);
    expect(typedSummary('distance_time', summaries.get('run')!)).toEqual({
      metric: 'pace',
      value: 230,
      trend: { kind: 'record' },
    });
  });

  it('calories : pas de valeur sans série', () => {
    const summaries = summarizeExercises([row('bike', 's1', null, '2026-09-21T10:00:00Z')]);
    expect(typedSummary('calories', summaries.get('bike')!)).toBeNull();
  });
});
