import { formatNumber, formatWeight } from '../format';

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
