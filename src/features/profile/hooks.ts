import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect } from 'react';

import { db, liveDb } from '@/db/client';
import { profiles, type Profile } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchProfile } from './api';
import { saveRemoteProfile } from './repository';

/**
 * Profil de l'utilisateur connecté, lu dans SQLite. S'il n'y est pas encore (compte créé avant
 * la base locale, nouvel appareil), il est récupéré une fois dans Supabase.
 */
export function useProfile(): { profile: Profile | undefined; firstName: string } {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { data } = useLiveQuery(liveDb.select().from(profiles).where(eq(profiles.id, userId)), [
    userId,
  ]);
  const profile = data[0];
  const hasProfile = profile !== undefined;

  useEffect(() => {
    if (!userId || hasProfile) return;
    fetchProfile(userId)
      .then((row) => {
        if (row) saveRemoteProfile(db, row);
      })
      .catch(() => {
        // Hors ligne : on garde le prénom des métadonnées.
      });
  }, [userId, hasProfile]);

  const metadataName = session?.user.user_metadata.first_name;
  const firstName = profile?.firstName ?? (typeof metadataName === 'string' ? metadataName : '');
  return { profile, firstName };
}
