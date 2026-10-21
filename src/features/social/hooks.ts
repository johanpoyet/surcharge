import AsyncStorage from '@react-native-async-storage/async-storage';
import { eq } from 'drizzle-orm';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { create } from 'zustand';

import { db } from '@/db/client';
import { profiles } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  countKudosReceived,
  fetchExerciseStats,
  fetchFeed,
  fetchFriendStats,
  fetchMyIdentity,
  fetchMyKudos,
  getFriendProfiles,
  setKudos,
  type FriendExerciseStats,
  type FriendProfile,
  type FriendStats,
  type RemoteEvent,
} from './api';
import { buildSnapshot } from './sync';
import type { PublicSnapshot } from './publicStats';

const useUserId = () => useAuth().session?.user.id ?? '';

// —— Badge de l'onglet Amis : demandes reçues et bravos pas encore vus (SPEC_V2 §7.4) ——

const seenKey = (userId: string) => `friends.kudosSeenAt.${userId}`;

export const useFriendsBadge = create<{ pending: number; kudos: number }>(() => ({
  pending: 0,
  kudos: 0,
}));

/** Recalcule le badge (ouverture de l'app, retour au premier plan). Hors ligne : inchangé. */
export async function refreshFriendsBadge(userId: string): Promise<void> {
  try {
    const [people, seen] = await Promise.all([
      getFriendProfiles(),
      AsyncStorage.getItem(seenKey(userId)),
    ]);
    const pending = people.filter((p) => p.status === 'pending' && p.incoming).length;
    // Premier passage : on ne compte pas les bravos d'avant.
    const kudos = seen ? await countKudosReceived(userId, seen) : 0;
    if (!seen) await AsyncStorage.setItem(seenKey(userId), new Date().toISOString());
    useFriendsBadge.setState({ pending, kudos });
  } catch {
    // Pas de réseau : on garde le badge précédent.
  }
}

/** L'onglet Amis a été ouvert : les bravos reçus sont vus. */
export async function markKudosSeen(userId: string): Promise<void> {
  useFriendsBadge.setState({ kudos: 0 });
  await AsyncStorage.setItem(seenKey(userId), new Date().toISOString()).catch(() => undefined);
}

// —— Données de l'onglet Amis ——

export type FriendsData = {
  people: FriendProfile[];
  friends: FriendProfile[];
  stats: Map<string, FriendStats>;
  exercises: Map<string, FriendExerciseStats[]>;
  feed: RemoteEvent[];
  kudos: Set<string>;
  me: PublicSnapshot | null;
};

type State = { status: 'loading' } | { status: 'offline' } | { status: 'ready'; data: FriendsData };

/** Amis, stats publiques, fil d'activité et bravos donnés ; rechargé à chaque passage sur l'écran. */
export function useFriends() {
  const userId = useUserId();
  const [state, setState] = useState<State>({ status: 'loading' });
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (!userId || loading.current) return;
    loading.current = true;
    try {
      const people = await getFriendProfiles();
      const friends = people.filter((p) => p.status === 'accepted');
      const ids = friends.map((f) => f.userId);
      const [stats, exercises, feed] = await Promise.all([
        fetchFriendStats(ids),
        fetchExerciseStats(ids),
        fetchFeed(ids),
      ]);
      const kudos = await fetchMyKudos(
        userId,
        feed.map((e) => e.id),
      );
      const byUser = new Map<string, FriendExerciseStats[]>();
      for (const row of exercises)
        byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);
      useFriendsBadge.setState({
        pending: people.filter((p) => p.status === 'pending' && p.incoming).length,
      });
      setState({
        status: 'ready',
        data: {
          people,
          friends,
          stats: new Map(stats.map((s) => [s.user_id, s])),
          exercises: byUser,
          feed,
          kudos,
          // « Toi » : calculé en local, toujours à jour même avant la prochaine synchro.
          me: buildSnapshot(db, userId),
        },
      });
    } catch {
      setState((current) => (current.status === 'ready' ? current : { status: 'offline' }));
    } finally {
      loading.current = false;
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Bravo donné ou retiré, affiché tout de suite puis confirmé par le serveur. */
  const toggleKudos = async (eventId: string) => {
    if (state.status !== 'ready') return;
    const given = !state.data.kudos.has(eventId);
    const apply = (on: boolean) =>
      setState((current) => {
        if (current.status !== 'ready') return current;
        const next = new Set(current.data.kudos);
        if (on) next.add(eventId);
        else next.delete(eventId);
        return { status: 'ready', data: { ...current.data, kudos: next } };
      });
    apply(given);
    try {
      await setKudos(userId, eventId, given);
    } catch {
      apply(!given);
    }
  };

  return { state, reload: load, toggleKudos };
}

/** Mon code ami et mon pseudo : base locale, sinon serveur (compte pas encore synchronisé). */
export function useMyIdentity() {
  const userId = useUserId();
  const [identity, setIdentity] = useState<{ friendCode: string | null; username: string | null }>(
    () => {
      const row = userId
        ? db
            .select({ friendCode: profiles.friendCode, username: profiles.username })
            .from(profiles)
            .where(eq(profiles.id, userId))
            .get()
        : undefined;
      return { friendCode: row?.friendCode ?? null, username: row?.username ?? null };
    },
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      fetchMyIdentity(userId)
        .then((remote) => {
          if (cancelled) return;
          setIdentity(remote);
          // Copie locale (pas d'outbox : c'est la valeur du serveur).
          db.update(profiles)
            .set({ friendCode: remote.friendCode, username: remote.username })
            .where(eq(profiles.id, userId))
            .run();
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  return {
    ...identity,
    setUsername: (username: string) => setIdentity((i) => ({ ...i, username })),
  };
}
