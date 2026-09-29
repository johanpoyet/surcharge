import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/**
 * Type commun à la base de l'app (expo-sqlite) et à celle des tests (sql.js) :
 * les repositories n'utilisent que l'API synchrone de Drizzle.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

// enableChangeListener : nécessaire à useLiveQuery.
export const expoDb = openDatabaseSync('surcharge.db', { enableChangeListener: true });

export const liveDb: ExpoSQLiteDatabase<typeof schema> = drizzle(expoDb, { schema });

export const db: AppDatabase = liveDb;
