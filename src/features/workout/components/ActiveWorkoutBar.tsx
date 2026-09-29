import { and, desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { ChevronUp } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { liveDb } from '@/db/client';
import { sessions } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { fr } from '@/i18n/fr';
import { useNow } from '@/lib/useNow';
import { colors } from '@/theme/tokens';
import { formatClock } from '../logic';

type ActiveWorkoutBarProps = { onOpen: (sessionId: string) => void };

/** Barre flottante au-dessus des onglets quand une séance est réduite (SPEC 8.2). */
export function ActiveWorkoutBar({ onOpen }: ActiveWorkoutBarProps) {
  const userId = useAuth().session?.user.id ?? '';
  const now = useNow();
  const { data } = useLiveQuery(
    liveDb
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.endedAt), isNull(sessions.deletedAt)))
      .orderBy(desc(sessions.startedAt))
      .limit(1),
    [userId],
  );
  const active = data[0];
  if (!active) return null;
  const elapsed = formatClock((now - new Date(active.startedAt).getTime()) / 1000);

  return (
    <View className="bg-bg px-3 pb-2 pt-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${fr.workout.activeBar} : ${active.name}, ${elapsed}. ${fr.workout.resume}`}
        onPress={() => onOpen(active.id)}
        className="h-[52px] flex-row items-center gap-3 rounded-cta bg-volt px-4 active:opacity-90"
      >
        <View className="flex-1">
          <Text className="font-body-bold text-11 uppercase tracking-wide text-onVolt">
            {fr.workout.activeBar}
          </Text>
          <Text numberOfLines={1} className="font-display text-20 uppercase text-onVolt">
            {active.name}
          </Text>
        </View>
        <Text className="font-display text-22 text-onVolt">{elapsed}</Text>
        <ChevronUp size={22} color={colors.onVolt} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}
