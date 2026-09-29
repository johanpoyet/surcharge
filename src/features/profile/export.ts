import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppDatabase } from '@/db/client';
import { exercises, sessions, sessionSets } from '@/db/schema';
import { fr } from '@/i18n/fr';
import { toLocalDateString } from '@/lib/format';
import { buildCsv } from './csv';

export type ExportResult = 'shared' | 'empty' | 'unavailable';

/** Export CSV des séances terminées et de leurs séries, via la feuille de partage (SPEC 11). */
export async function exportCsv(db: AppDatabase, userId: string): Promise<ExportResult> {
  const rows = db
    .select({
      startedAt: sessions.startedAt,
      sessionName: sessions.name,
      exerciseName: exercises.name,
      exerciseOrder: sessionSets.exerciseOrder,
      setNumber: sessionSets.setNumber,
      weightKg: sessionSets.weightKg,
      reps: sessionSets.reps,
      difficulty: sessionSets.difficulty,
    })
    .from(sessionSets)
    .innerJoin(sessions, eq(sessions.id, sessionSets.sessionId))
    .innerJoin(exercises, eq(exercises.id, sessionSets.exerciseId))
    .where(
      and(
        eq(sessionSets.userId, userId),
        isNull(sessionSets.deletedAt),
        isNull(sessions.deletedAt),
        isNotNull(sessions.endedAt),
      ),
    )
    .orderBy(asc(sessions.startedAt), asc(sessionSets.exerciseOrder), asc(sessionSets.setNumber))
    .all();
  if (rows.length === 0) return 'empty';
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';

  const file = new File(
    Paths.cache,
    `${fr.profile.csv.fileName}-${toLocalDateString(new Date())}.csv`,
  );
  if (file.exists) file.delete();
  file.create();
  file.write(buildCsv(rows));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: fr.profile.csv.dialogTitle,
  });
  return 'shared';
}
