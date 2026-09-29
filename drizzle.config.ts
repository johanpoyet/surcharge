import { defineConfig } from 'drizzle-kit';

// Migrations SQLite locales : `npm run db:generate` après chaque modification de src/db/schema.ts.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
});
