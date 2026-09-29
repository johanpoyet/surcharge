import { toLocalDateString } from '@/lib/format';
import {
  countPlanned,
  monthGrid,
  monthLabel,
  planForDay,
  startOfWeek,
  weekDays,
} from '../calendar';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const key = (date: Date) => toLocalDateString(date);

describe('semaines', () => {
  it('commence le lundi', () => {
    expect(key(startOfWeek(d(2026, 9, 30)))).toBe('2026-09-28');
    expect(key(startOfWeek(d(2026, 10, 4)))).toBe('2026-09-28'); // dimanche
    expect(weekDays(d(2026, 9, 28)).map(key)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });

  it('grille d’octobre 2026 : du lundi 28 sept. au dimanche 1er nov.', () => {
    const grid = monthGrid(2026, 9);
    expect(grid).toHaveLength(5);
    expect(key(grid[0]![0]!)).toBe('2026-09-28');
    expect(key(grid[4]![6]!)).toBe('2026-11-01');
  });
});

describe('séance du jour (SPEC 9.1)', () => {
  const weekly = new Map([[1, 'push']]);

  it('modèle de semaine', () => {
    expect(planForDay(d(2026, 9, 28), new Map(), weekly)).toEqual({
      date: '2026-09-28',
      templateId: 'push',
      source: 'weekly',
    });
    expect(planForDay(d(2026, 9, 29), new Map(), weekly).source).toBe('none');
  });

  it('une exception ne vaut que pour sa date (critère de la Phase 7)', () => {
    const overrides = new Map([['2026-09-28', 'pull']]);
    expect(planForDay(d(2026, 9, 28), overrides, weekly).templateId).toBe('pull');
    expect(planForDay(d(2026, 10, 5), overrides, weekly).templateId).toBe('push');
  });

  it('exception à null = repos forcé', () => {
    expect(planForDay(d(2026, 9, 28), new Map([['2026-09-28', null]]), weekly)).toEqual({
      date: '2026-09-28',
      templateId: null,
      source: 'override',
    });
  });

  it('compte les séances prévues et tronque les étiquettes', () => {
    const plans = [
      planForDay(d(2026, 9, 28), new Map(), weekly),
      planForDay(d(2026, 10, 5), new Map(), weekly),
    ];
    expect(countPlanned(plans).get('push')).toBe(2);
    expect(monthLabel('Push A')).toBe('PUSH A');
    expect(monthLabel('Jambes lourdes')).toBe('JAMBES');
  });
});
