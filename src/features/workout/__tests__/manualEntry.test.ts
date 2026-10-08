import { activityTimes, isImplausiblePace, kmText, parseDuration, parseKm } from '../manualEntry';

describe('parseDuration', () => {
  it.each([
    ['58:30', 58 * 60 + 30],
    ['1:05:20', 3600 + 5 * 60 + 20],
    ['45', 45 * 60],
    ['1h05', 3600 + 5 * 60],
    ['1h', 3600],
    ['1h05:30', 3600 + 5 * 60 + 30],
    [" 25'30 ", 25 * 60 + 30],
    ['0:45', 45],
  ])('%s → %i s', (text, seconds) => expect(parseDuration(text)).toBe(seconds));

  it.each(['', 'abc', '12:75', '0', '1:2:3:4', '-5'])('refuse « %s »', (text) =>
    expect(parseDuration(text)).toBeNull(),
  );
});

describe('parseKm', () => {
  it('lit les virgules et les points, en mètres', () => {
    expect(parseKm('12')).toBe(12_000);
    expect(parseKm('12,5')).toBe(12_500);
    expect(parseKm('0.4')).toBe(400);
    expect(kmText(12_500)).toBe('12,5');
  });

  it.each(['', '0', 'abc', '1,2,3', '-3'])('refuse « %s »', (text) =>
    expect(parseKm(text)).toBeNull(),
  );
});

it('repère une allure impossible : 12 km en 8 s, pas un vrai 10 km', () => {
  expect(isImplausiblePace(12_000, 8, 'running')).toBe(true);
  expect(isImplausiblePace(10_000, 50 * 60, 'running')).toBe(false);
  // 1:50 /km : impossible en course, normal à vélo.
  expect(isImplausiblePace(1000, 110, 'running')).toBe(true);
  expect(isImplausiblePace(1000, 110, 'other')).toBe(false);
  expect(isImplausiblePace(null, 60, 'running')).toBe(false);
});

it('place une sortie du jour juste avant maintenant, une sortie passée à midi', () => {
  const now = new Date(2026, 9, 8, 19, 0, 0);
  expect(activityTimes(new Date(2026, 9, 8), 3600, now)).toEqual({
    startedAt: new Date(2026, 9, 8, 18, 0, 0).toISOString(),
    endedAt: now.toISOString(),
  });
  expect(activityTimes(new Date(2026, 9, 6), 1800, now)).toEqual({
    startedAt: new Date(2026, 9, 6, 12, 0, 0).toISOString(),
    endedAt: new Date(2026, 9, 6, 12, 30, 0).toISOString(),
  });
});
