import { toLocalDateString } from '../format';
import { convertDisplayed, fromKg, toKg } from '../units';

describe('unités', () => {
  it('stocke en kg quelle que soit l’unité affichée', () => {
    expect(toKg(80, 'kg')).toBe(80);
    expect(toKg(176.4, 'lb')).toBeCloseTo(80.01, 2);
    expect(fromKg(100, 'lb')).toBeCloseTo(220.46, 2);
  });

  it('convertit la valeur affichée au dixième', () => {
    expect(convertDisplayed(78.4, 'kg', 'lb')).toBe(172.8);
    expect(convertDisplayed(172.8, 'lb', 'kg')).toBe(78.4);
    expect(convertDisplayed(78.4, 'kg', 'kg')).toBe(78.4);
  });
});

describe('toLocalDateString', () => {
  it('formate la date locale', () => {
    expect(toLocalDateString(new Date(2026, 8, 28, 23, 30))).toBe('2026-09-28');
  });
});
