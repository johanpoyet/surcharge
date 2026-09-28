import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import type { ProfileRow } from '@/lib/database.types';
import { fetchProfile } from './api';

/** Profil de l'utilisateur connecté (lecture réseau en Phase 2, SQLite en Phase 3). */
export function useProfile(): { profile: ProfileRow | null; firstName: string } {
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchProfile(userId)
      .then((row) => {
        if (active) setProfile(row);
      })
      .catch(() => {
        // Hors ligne : on garde le prénom des métadonnées.
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const metadataName = session?.user.user_metadata.first_name;
  const firstName = profile?.first_name ?? (typeof metadataName === 'string' ? metadataName : '');
  return { profile, firstName };
}
