import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { Directory, File, Paths } from 'expo-file-system';

import type { AppDatabase } from '@/db/client';
import { exercises } from '@/db/schema';
import { updateExercise } from '@/features/exercises/repository';
import { supabase } from '@/lib/supabase';

const BUCKET = 'exercise-photos';
const SIGNED_URL_SECONDS = 3600;

/**
 * Envoie les photos locales pas encore en ligne vers `exercise-photos/{user_id}/…` (SPEC 7).
 * Le nom contient une version : une photo remplacée est retéléchargée par les autres appareils.
 */
export async function uploadPendingPhotos(db: AppDatabase, userId: string): Promise<number> {
  const pending = db
    .select({ id: exercises.id, uri: exercises.photoLocalUri })
    .from(exercises)
    .where(
      and(
        eq(exercises.userId, userId),
        isNotNull(exercises.photoLocalUri),
        isNull(exercises.photoPath),
        isNull(exercises.deletedAt),
      ),
    )
    .all();
  let uploaded = 0;
  for (const { id, uri } of pending) {
    if (!uri) continue;
    const file = new File(uri);
    if (!file.exists) continue;
    const path = `${userId}/${id}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, await file.bytes(), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    updateExercise(db, id, { photoPath: path });
    uploaded += 1;
  }
  return uploaded;
}

/** Nouvel appareil : télécharge les photos en ligne qui n'ont pas de copie locale. */
export async function downloadMissingPhotos(db: AppDatabase, userId: string): Promise<number> {
  const missing = db
    .select({ id: exercises.id, path: exercises.photoPath })
    .from(exercises)
    .where(
      and(
        eq(exercises.userId, userId),
        isNotNull(exercises.photoPath),
        isNull(exercises.photoLocalUri),
        isNull(exercises.deletedAt),
      ),
    )
    .all();
  if (missing.length === 0) return 0;
  const directory = new Directory(Paths.document, BUCKET);
  if (!directory.exists) directory.create({ intermediates: true });
  let downloaded = 0;
  for (const { id, path } of missing) {
    if (!path) continue;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data) continue;
    const destination = new File(directory, `${id}-${Date.now()}.jpg`);
    const file = await File.downloadFileAsync(data.signedUrl, destination);
    // Copie locale seulement : ni `dirty`, ni outbox, ni changement de `updated_at`.
    db.update(exercises).set({ photoLocalUri: file.uri }).where(eq(exercises.id, id)).run();
    downloaded += 1;
  }
  return downloaded;
}
