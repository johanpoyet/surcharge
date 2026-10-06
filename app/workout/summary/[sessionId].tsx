import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, Card, FullScreen, Heading, Overline, StatTile } from '@/components/ui';
import { db, liveDb } from '@/db/client';
import { sessions, type SessionSet } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExercises } from '@/features/exercises/hooks';
import { useProfile } from '@/features/profile/hooks';
import { volume } from '@/features/stats/calc';
import { formatClock, recordsBeaten } from '@/features/workout/logic';
import { sessionSetsQuery, setsBefore } from '@/features/workout/repository';
import { fr } from '@/i18n/fr';
import { formatThousands, formatWeight } from '@/lib/format';
import { fromKg } from '@/lib/units';
import { colors } from '@/theme/tokens';

const t = fr.workout.summary;

/** Récap de fin de séance (SPEC 8, sans maquette). */
export default function WorkoutSummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const userId = useAuth().session?.user.id ?? '';
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const exercises = useExercises();
  const { data: sessionRows } = useLiveQuery(
    liveDb.select().from(sessions).where(eq(sessions.id, sessionId)),
    [sessionId],
  );
  const { data: sets } = useLiveQuery(sessionSetsQuery(liveDb, sessionId), [sessionId]);
  const session = sessionRows[0];

  const records = useMemo(() => {
    if (!session) return [];
    const byExercise = new Map<string, SessionSet[]>();
    for (const set of sets)
      byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
    const before = setsBefore(db, userId, [...byExercise.keys()], session.startedAt);
    return recordsBeaten(byExercise, before);
  }, [session, sets, userId]);

  const names = new Map(exercises.map((e) => [e.id, e.name]));
  const durationSeconds = session?.endedAt
    ? (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
    : 0;

  return (
    <FullScreen>
      <ScrollView contentContainerClassName="gap-4 px-screen pb-6 pt-6">
        <View>
          <Overline className="text-13">{session?.name ?? ''}</Overline>
          <Heading size={48}>{t.title}</Heading>
        </View>

        <View className="flex-row gap-2">
          <StatTile label={t.duration} value={formatClock(durationSeconds)} />
          <StatTile
            label={t.volume}
            value={formatThousands(fromKg(volume(sets), unit))}
            unit={fr.units[unit]}
          />
          <StatTile label={t.sets} value={String(sets.length)} />
        </View>

        <Card className="gap-1">
          <Text className="mb-1.5 font-body-bold text-18 text-text">{t.records}</Text>
          {records.length === 0 ? (
            <Text className="font-body text-15 text-muted">{t.noRecords}</Text>
          ) : (
            records.map(({ exerciseId, set }) => (
              <View key={exerciseId} className="h-14 flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-button bg-volt-soft">
                  <Trophy size={18} color={colors.volt} strokeWidth={2} />
                </View>
                <Text numberOfLines={1} className="flex-1 font-body-bold text-15 text-text">
                  {names.get(exerciseId) ?? ''}
                </Text>
                <Text className="font-display text-22 text-volt">
                  {`${formatWeight(set.weightKg, unit)} × ${set.reps}`}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Button label={t.done} className="mt-2" onPress={() => router.dismissTo('/')} />
      </ScrollView>
    </FullScreen>
  );
}
