import { compareVersions, isUpdateRequired, parseVersion } from '../version';

describe('parseVersion', () => {
  it('lit les versions numériques', () => {
    expect(parseVersion('1.2.0')).toEqual([1, 2, 0]);
    expect(parseVersion(' 10.0 ')).toEqual([10, 0]);
  });

  it('refuse les formats inconnus', () => {
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('1.2.0-beta')).toBeNull();
    expect(parseVersion('1..2')).toBeNull();
    expect(parseVersion('v1.2')).toBeNull();
  });
});

describe('compareVersions', () => {
  it('compare chaque nombre, pas le texte', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0', '1.2.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
  });

  it('considère les zéros manquants comme égaux', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
  });

  it('renvoie null si une version est illisible', () => {
    expect(compareVersions('1.2.0', 'abc')).toBeNull();
  });
});

describe('isUpdateRequired', () => {
  it('bloque une version strictement plus ancienne', () => {
    expect(isUpdateRequired('1.1.0', '1.2.0')).toBe(true);
    expect(isUpdateRequired('1.2.0', '9.9.9')).toBe(true);
  });

  it('laisse passer une version égale ou plus récente', () => {
    expect(isUpdateRequired('1.2.0', '1.2.0')).toBe(false);
    expect(isUpdateRequired('1.2.0', '1.0.0')).toBe(false);
  });

  it('ne bloque jamais en cas de doute', () => {
    expect(isUpdateRequired(null, '9.9.9')).toBe(false);
    expect(isUpdateRequired('1.2.0', undefined)).toBe(false);
    expect(isUpdateRequired('1.2.0', 9)).toBe(false);
    expect(isUpdateRequired('1.2.0', 'n’importe quoi')).toBe(false);
  });
});
