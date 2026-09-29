import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect } from 'react';

import { db, liveDb } from '@/db/client';
import { bodyWeights, profiles, type BodyWeight, type Profile } from '@/db/schema';
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

/** Pesées de l'utilisateur, de la plus ancienne à la plus récente. */
export function useBodyWeights(): BodyWeight[] {
  const userId = useAuth().session?.user.id ?? '';
  const { data } = useLiveQuery(
    liveDb
      .select()
      .from(bodyWeights)
      .where(and(eq(bodyWeights.userId, userId), isNull(bodyWeights.deletedAt)))
      .orderBy(asc(bodyWeights.measuredOn)),
    [userId],
  );
  return data;
}
