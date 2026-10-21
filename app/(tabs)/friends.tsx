import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, UserPlus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandWatermark, Button, Heading, IconButton, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile } from '@/features/profile/hooks';
import { FeedItem } from '@/features/social/components/FeedItem';
import { LeaderboardCard } from '@/features/social/components/LeaderboardCard';
import { UsernameSheet } from '@/features/social/components/UsernameSheet';
import { markKudosSeen, useFriends, useFriendsBadge, useMyIdentity } from '@/features/social/hooks';
import { average, type LeaderboardPerson } from '@/features/social/leaderboard';
import { HYROX_FULL_KEY } from '@/features/social/publicStats';
import { fr } from '@/i18n/fr';
import { colors } from '@/theme/tokens';

const t = fr.friends;
const askedKey = (userId: string) => `friends.usernameAsked.${userId}`;

/** Onglet Amis (SPEC_V2 §7.1, maquette amis) : demandes, classement de la semaine, activité. */
export default function FriendsScreen() {
  const userId = useAuth().session?.user.id ?? '';
  const { firstName } = useProfile();
  const toast = useToast();
  const { state, reload, toggleKudos } = useFriends();
  const identity = useMyIdentity();
  const pending = useFriendsBadge((s) => s.pending);
  const [askUsername, setAskUsername] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date();

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void markKudosSeen(userId);
    }, [userId]),
  );

  // Premier passage : choix du pseudo (une seule fois, « Plus tard » ne redemande pas).
  useFocusEffect(
    useCallback(() => {
      if (!userId || identity.username) return;
      let cancelled = false;
      void AsyncStorage.getItem(askedKey(userId))
        .then((asked) => {
          if (!cancelled && asked !== '1') setAskUsername(true);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
        // La feuille ne doit pas rester par-dessus l'écran suivant.
        setAskUsername(false);
      };
    }, [identity.username, userId]),
  );

  const closeUsername = (username: string | null) => {
    setAskUsername(false);
    void AsyncStorage.setItem(askedKey(userId), '1').catch(() => undefined);
    if (username) {
      identity.setUsername(username);
      toast.show(t.username.saved);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const openFriend = (id: string) => router.push({ pathname: '/friends/[id]', params: { id } });

  const header = (
    <View className="flex-row items-center justify-between">
      <Heading size={34}>{t.title}</Heading>
      <IconButton
        icon={UserPlus}
        tone="volt"
        accessibilityLabel={t.add}
        onPress={() => router.push('/friends/add')}
      />
    </View>
  );

  const requestsBanner =
    pending > 0 ? (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/friends/requests')}
        className="h-14 flex-row items-center gap-3 rounded-tile border border-line bg-surface px-3.5 active:opacity-80"
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-volt">
          <Text className="font-body-bold text-15 text-onVolt">{pending}</Text>
        </View>
        <Text className="flex-1 font-body-bold text-16 text-text">{t.requestsBanner}</Text>
        <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
      </Pressable>
    ) : null;

  let body: React.ReactNode;
  if (state.status === 'loading') {
    body = null;
  } else if (state.status === 'offline') {
    body = (
      <View className="gap-3 rounded-card bg-surface p-4">
        <Text className="font-body text-15 text-muted">{t.offline}</Text>
        <Button label={t.retry} variant="secondary" size="sm" onPress={reload} />
      </View>
    );
  } else if (state.data.friends.length === 0) {
    body = (
      <View className="items-center gap-3 overflow-hidden rounded-card bg-surface px-5 py-10">
        <BrandWatermark size={260} fill={colors.surface2} className="-right-16 -top-10" />
        <Text className="text-center font-display text-34 uppercase text-text">
          {t.empty.title}
        </Text>
        <Text className="text-center font-body text-15 text-muted">{t.empty.hint}</Text>
        <Button
          label={t.empty.cta}
          className="mt-2 self-stretch"
          onPress={() => router.push('/friends/add')}
        />
      </View>
    );
  } else {
    const { data } = state;
    const names = new Map(data.friends.map((f) => [f.userId, f.firstName]));
    const progressOf = (rows: { catalog_key: string; progress_pct_3m: number | null }[]) =>
      average(rows.filter((r) => r.catalog_key !== HYROX_FULL_KEY).map((r) => r.progress_pct_3m));
    const people: LeaderboardPerson[] = [
      {
        userId,
        name: firstName,
        isMe: true,
        stats: data.me?.stats ?? null,
        progress: progressOf(data.me?.exercises ?? []),
      },
      ...data.friends.map((f) => ({
        userId: f.userId,
        name: f.firstName,
        isMe: false,
        stats: data.stats.get(f.userId) ?? null,
        progress: progressOf(data.exercises.get(f.userId) ?? []),
      })),
    ];
    body = (
      <>
        <LeaderboardCard people={people} today={now} onOpen={openFriend} />
        <Text className="mt-2 pr-1 font-display text-30 uppercase text-text">{t.feed.title}</Text>
        {data.feed.length === 0 ? (
          <Text className="font-body text-15 text-muted">{t.feed.empty}</Text>
        ) : (
          data.feed.map((event) => (
            <FeedItem
              key={event.id}
              event={{
                id: event.id,
                userId: event.user_id,
                type: event.type,
                payload: event.payload,
                createdAt: event.created_at,
              }}
              name={names.get(event.user_id) ?? ''}
              now={now}
              bravo={data.kudos.has(event.id)}
              onBravo={() => void toggleKudos(event.id)}
            />
          ))
        )}
      </>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        contentContainerClassName="gap-3.5 px-screen pb-6 pt-3"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.volt} />
        }
      >
        {header}
        {requestsBanner}
        {body}
      </ScrollView>
      <UsernameSheet visible={askUsername} onDone={closeUsername} />
    </SafeAreaView>
  );
}
