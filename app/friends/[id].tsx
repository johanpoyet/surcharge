import { eq } from 'drizzle-orm';
import { useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Ellipsis } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button, FullScreen, IconButton, SegmentedControl, useToast } from '@/components/ui';
import { db } from '@/db/client';
import { exercises as exercisesTable } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatPace } from '@/features/exercises/tracking';
import { useProfile } from '@/features/profile/hooks';
import {
  blockUser,
  fetchExerciseStats,
  fetchFeed,
  fetchFriendStats,
  getFriendProfiles,
  removeFriendship,
  reportUser,
  setKudos,
  type FriendExerciseStats,
  type FriendProfile,
  type FriendStats,
} from '@/features/social/api';
import { Avatar } from '@/features/social/components/Avatar';
import { commonExercises, periodStats, type Period } from '@/features/social/compare';
import { formatPct } from '@/features/social/leaderboard';
import { buildSnapshot } from '@/features/social/sync';
import { formatClock } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import { goBack } from '@/lib/navigation';
import { cn } from '@/lib/cn';
import { formatWeight } from '@/lib/format';

const t = fr.friends.compare;
const PERIODS = [
  { value: 'week' as const, label: t.periods.week },
  { value: 'month' as const, label: t.periods.month },
];

type Loaded = {
  friend: FriendProfile;
  stats: FriendStats | null;
  exercises: FriendExerciseStats[];
  latestEventId: string | null;
};

/** Barres face à face : moi (volt) à gauche, l'ami à droite, à l'échelle du plus grand. */
function DuelBar({
  label,
  mine,
  theirs,
  format = String,
}: {
  label: string;
  mine: number;
  theirs: number;
  format?: (value: number) => string;
}) {
  const max = Math.max(mine, theirs, 1);
  return (
    <View className="gap-1.5">
      <Text className="font-body text-14 text-muted">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Text className="w-14 pr-1 font-display text-26 text-volt">{format(mine)}</Text>
        <View className="h-2.5 flex-1 flex-row gap-1">
          <View className="flex-1 flex-row justify-end overflow-hidden rounded-full bg-line">
            <View
              className="h-full rounded-full bg-volt"
              style={{ width: `${(mine / max) * 100}%` }}
            />
          </View>
          <View className="flex-1 overflow-hidden rounded-full bg-line">
            <View
              className="h-full rounded-full bg-text"
              style={{ width: `${(theirs / max) * 100}%` }}
            />
          </View>
        </View>
        <Text className="w-14 pr-1 text-right font-display text-26 text-text">
          {format(theirs)}
        </Text>
      </View>
    </View>
  );
}

function Tile({
  who,
  value,
  detail,
  me,
}: {
  who: string;
  value: string;
  detail: string;
  me: boolean;
}) {
  return (
    <View className={cn('flex-1 gap-0.5 rounded-tile bg-bg p-3', me && 'border border-volt/40')}>
      <Text className="font-body text-13 text-muted">{who}</Text>
      <Text
        numberOfLines={1}
        className={cn('pr-1 font-display text-30', me ? 'text-volt' : 'text-text')}
      >
        {value}
      </Text>
      <Text numberOfLines={1} className="font-body text-13 text-muted">
        {detail}
      </Text>
    </View>
  );
}

/** Toi vs ami (SPEC_V2 §7.3, maquette ami-comparaison). */
export default function FriendCompareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuth().session?.user.id ?? '';
  const { firstName } = useProfile();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('week');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const me = useMemo(() => (userId ? buildSnapshot(db, userId) : null), [userId]);
  const today = new Date();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const people = await getFriendProfiles();
        const friend = people.find((p) => p.userId === id && p.status === 'accepted');
        if (!friend) return goBack('/friends');
        const [stats, exercises, feed] = await Promise.all([
          fetchFriendStats([id]),
          fetchExerciseStats([id]),
          fetchFeed([id], 1),
        ]);
        if (!cancelled)
          setLoaded({
            friend,
            stats: stats[0] ?? null,
            exercises,
            latestEventId: feed[0]?.id ?? null,
          });
      } catch {
        if (!cancelled) toast.show(fr.friends.offline);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  // Noms des exercices du catalogue : ceux de ma bibliothèque.
  const names = useMemo(
    () =>
      new Map(
        db
          .select({ key: exercisesTable.catalogKey, name: exercisesTable.name })
          .from(exercisesTable)
          .where(eq(exercisesTable.userId, userId))
          .all()
          .flatMap((e) => (e.key ? [[e.key, e.name] as const] : [])),
      ),
    [userId],
  );

  if (!loaded) return <FullScreen>{null}</FullScreen>;
  const { friend } = loaded;
  const mine = periodStats(me?.stats ?? null, period, today);
  const theirs = periodStats(loaded.stats, period, today);
  const common = commonExercises(me?.exercises ?? [], loaded.exercises);

  const detailOf = (
    row: { best_weight_kg: number | null; best_time_s: number | null },
    isMe: boolean,
  ) =>
    row.best_weight_kg !== null
      ? t.best(formatWeight(row.best_weight_kg))
      : row.best_time_s !== null
        ? t.bestPace(formatPace(row.best_time_s))
        : isMe
          ? t.noData
          : t.hiddenWeights;

  const encourage = async () => {
    if (!loaded.latestEventId) return toast.show(t.nothingToEncourage(friend.firstName));
    try {
      await setKudos(userId, loaded.latestEventId, true);
      toast.show(t.encouraged(friend.firstName));
    } catch {
      // Déjà donné (clé en double) ou hors ligne : même message rassurant si c'était déjà fait.
      toast.show(t.encouraged(friend.firstName));
    }
  };

  const menu = () =>
    Alert.alert(friend.firstName, undefined, [
      {
        text: t.remove,
        onPress: () =>
          Alert.alert(t.removeTitle(friend.firstName), undefined, [
            { text: t.cancel, style: 'cancel' },
            {
              text: t.remove,
              style: 'destructive',
              onPress: () =>
                void removeFriendship(friend.friendshipId)
                  .then(() => {
                    toast.show(t.removed);
                    goBack('/friends');
                  })
                  .catch(() => toast.show(fr.friends.addScreen.error)),
            },
          ]),
      },
      {
        text: t.block,
        style: 'destructive',
        onPress: () =>
          Alert.alert(t.blockTitle(friend.firstName), t.blockMessage, [
            { text: t.cancel, style: 'cancel' },
            {
              text: t.block,
              style: 'destructive',
              onPress: () =>
                void blockUser(friend.userId)
                  .then(() => {
                    toast.show(t.blocked);
                    goBack('/friends');
                  })
                  .catch(() => toast.show(fr.friends.addScreen.error)),
            },
          ]),
      },
      {
        text: t.report,
        onPress: () =>
          Alert.alert(t.reportTitle, undefined, [
            ...(['username', 'abuse', 'spam', 'other'] as const).map((reason) => ({
              text: t.reasons[reason],
              onPress: () =>
                void reportUser(userId, friend.userId, reason)
                  .then(() => toast.show(t.reported))
                  .catch(() => toast.show(fr.friends.addScreen.error)),
            })),
            { text: t.cancel, style: 'cancel' as const },
          ]),
      },
      { text: t.cancel, style: 'cancel' },
    ]);

  return (
    <FullScreen>
      <ScrollView contentContainerClassName="gap-4 px-screen pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel={t.back}
            onPress={() => goBack('/friends')}
          />
          <IconButton icon={Ellipsis} accessibilityLabel={t.menu} onPress={menu} />
        </View>
        <View className="flex-row items-center justify-center gap-5">
          <View className="items-center gap-1.5">
            <Avatar name={firstName} highlight size="lg" />
            <Text className="font-body-bold text-17 text-text">{t.me}</Text>
          </View>
          <Text className="pb-6 pr-1 font-display text-34 text-muted">{t.vs}</Text>
          <View className="items-center gap-1.5">
            <Avatar name={friend.firstName} size="lg" />
            <Text className="font-body-bold text-17 text-text">{friend.firstName}</Text>
          </View>
        </View>
        <SegmentedControl
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          className="self-center"
        />

        <View className="gap-4 rounded-card bg-surface p-4">
          <DuelBar label={t.sessions} mine={mine.sessions} theirs={theirs.sessions} />
          <DuelBar
            label={t.goal}
            mine={mine.goalPct}
            theirs={theirs.goalPct}
            format={(v) => `${v}%`}
          />
          <DuelBar label={t.records} mine={mine.records} theirs={theirs.records} />
        </View>

        <View className="mt-1 flex-row items-baseline justify-between">
          <Text className="pr-1 font-display text-26 uppercase text-text">{t.common}</Text>
          <Text className="font-body text-13 text-muted">{t.commonHint}</Text>
        </View>
        {common.exercises.length === 0 && !common.hyrox ? (
          <Text className="font-body text-15 text-muted">{t.noCommon}</Text>
        ) : null}
        {common.exercises.map((entry) => (
          <View key={entry.key} className="gap-3 rounded-card bg-surface p-4">
            <Text className="font-body-bold text-17 text-text">
              {names.get(entry.key) ?? entry.key}
            </Text>
            <View className="flex-row gap-2">
              <Tile
                who={t.me}
                me
                value={
                  entry.mine.progress_pct_3m === null
                    ? t.noData
                    : formatPct(entry.mine.progress_pct_3m)
                }
                detail={detailOf(entry.mine, true)}
              />
              <Tile
                who={friend.firstName}
                me={false}
                value={
                  entry.theirs.progress_pct_3m === null
                    ? t.noData
                    : formatPct(entry.theirs.progress_pct_3m)
                }
                detail={detailOf(entry.theirs, false)}
              />
            </View>
          </View>
        ))}
        {common.hyrox ? (
          <View className="gap-3 rounded-card bg-surface p-4">
            <Text className="font-body-bold text-17 text-text">{t.hyrox}</Text>
            <View className="flex-row gap-2">
              <Tile
                who={t.me}
                me
                value={
                  common.hyrox.mine.best_time_s
                    ? formatClock(common.hyrox.mine.best_time_s)
                    : t.noData
                }
                detail={t.hyroxBest}
              />
              <Tile
                who={friend.firstName}
                me={false}
                value={
                  common.hyrox.theirs.best_time_s
                    ? formatClock(common.hyrox.theirs.best_time_s)
                    : t.noData
                }
                detail={t.hyroxBest}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
      <View className="px-screen pb-2 pt-1">
        <Button label={t.encourage(friend.firstName)} onPress={() => void encourage()} />
      </View>
    </FullScreen>
  );
}
