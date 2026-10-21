/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BANNED_WORDS, normalizeUsername, usernameProblem } from '../bannedWords';

it('normalise et contrôle un pseudo comme le serveur', () => {
  expect(normalizeUsername('  @Johan.P ')).toBe('johan.p');
  expect(usernameProblem('johan.p')).toBeNull();
  expect(usernameProblem('Jo')).toBe('format');
  expect(usernameProblem('johan p')).toBe('format');
  expect(usernameProblem('gros_c.onnard')).toBe('banned');
  expect(usernameProblem('admin_surcharge')).toBe('banned');
});

it('même liste de mots interdits que la fonction SQL', () => {
  const sql = readFileSync(
    join(__dirname, '../../../../supabase/migrations/0007_social.sql'),
    'utf8',
  );
  const block = /unnest\(array\[([\s\S]*?)\]\)/.exec(sql)?.[1] ?? '';
  const serverWords = [...block.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  expect([...serverWords].sort()).toEqual([...BANNED_WORDS].sort());
});
