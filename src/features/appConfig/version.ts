// Comparaison de versions « 1.2.0 » (logique pure, testée sans Supabase ni module natif).

/** Découpe « 1.2.0 » en [1, 2, 0] ; null si le format n'est pas reconnu. */
export function parseVersion(version: string): number[] | null {
  const parts = version.trim().split('.');
  if (parts.length === 0 || parts.length > 4) return null;
  const numbers = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : NaN));
  return numbers.some(Number.isNaN) ? null : numbers;
}

/** < 0 si a < b, 0 si égales, > 0 si a > b (« 1.2 » = « 1.2.0 ») ; null si l'une est illisible. */
export function compareVersions(a: string, b: string): number | null {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Mise à jour obligatoire seulement si les deux versions sont lisibles et que l'app est
 * strictement plus ancienne : en cas de doute, on ne bloque jamais.
 */
export function isUpdateRequired(appVersion: string | null, minSupported: unknown): boolean {
  if (appVersion === null || typeof minSupported !== 'string') return false;
  const comparison = compareVersions(appVersion, minSupported);
  return comparison !== null && comparison < 0;
}
