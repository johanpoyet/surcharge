import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';

import type { AppDatabase } from '@/db/client';
import * as schema from '@/db/schema';

const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

/** Base SQLite en mémoire avec les migrations Drizzle de l'app (mêmes fichiers que sur le téléphone). */
export async function createTestDb(): Promise<AppDatabase> {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  for (const file of readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    for (const statement of readFileSync(join(MIGRATIONS_DIR, file), 'utf8').split(
      '--> statement-breakpoint',
    )) {
      if (statement.trim()) sqlite.run(statement);
    }
  }
  return drizzle(sqlite, { schema }) as unknown as AppDatabase;
}
