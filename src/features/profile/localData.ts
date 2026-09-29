import { Directory, Paths } from 'expo-file-system';

import type { AppDatabase } from '@/db/client';
import {
  bodyWeights,
  exercises,
  outbox,
  profiles,
  scheduleOverrides,
  sessions,
  sessionSets,
  syncState,
  templateExercises,
  weeklySchedule,
  workoutState,
  workoutTemplates,
} from '@/db/schema';

/** Vide la base locale et les photos du téléphone (après suppression du compte). */
export function clearLocalData(db: AppDatabase): void {
  db.transaction((tx) => {
    for (const table of [
      sessionSets,
      sessions,
      templateExercises,
      weeklySchedule,
      scheduleOverrides,
      workoutTemplates,
      exercises,
      bodyWeights,
      profiles,
      outbox,
      syncState,
      workoutState,
    ]) {
      tx.delete(table).run();
    }
  });
  try {
    const photos = new Directory(Paths.document, 'exercise-photos');
    if (photos.exists) photos.delete();
  } catch {
    // Photos déjà absentes.
  }
}
