import { formatNumber, formatThousands, formatWeight } from '../format';

describe('formatNumber', () => {
  it('utilise la virgule décimale', () => {
    expect(formatNumber(82.5)).toBe('82,5');
  });

  it('retire les décimales inutiles', () => {
    expect(formatNumber(80)).toBe('80');
    expect(formatNumber(80.04)).toBe('80');
  });
});

describe('formatWeight', () => {
  it('affiche les kg', () => {
    expect(formatWeight(82.5)).toBe('82,5 kg');
  });

  it('convertit en lb à l’affichage', () => {
    expect(formatWeight(100, 'lb')).toBe('220,5 lb');
  });
});

it('sépare les milliers par une espace fine', () => {
  expect(formatThousands(4520)).toBe('4\u202f520');
  expect(formatThousands(1234567.4)).toBe('1\u202f234\u202f567');
  expect(formatThousands(980)).toBe('980');
});
