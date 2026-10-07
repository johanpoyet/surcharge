import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';

import { Button, Card, FullScreen, Heading, Overline, StatTile } from '@/components/ui';
import { db, liveDb } from '@/db/client';
import { sessionBlocks, sessions, workoutTemplates } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExercises } from '@/features/exercises/hooks';
import { formatSet } from '@/features/exercises/tracking';
import { useProfile } from '@/features/profile/hooks';
import { volume } from '@/features/stats/calc';
import { isStrength } from '@/features/stats/typed';
import {
  CardioRecapCard,
  CircuitRecapCard,
  shareText,
} from '@/features/workout/components/BlockRecaps';
import { HyroxRecapCard } from '@/features/workout/components/HyroxRecapCard';
import { formatClock, recordsBeaten } from '@/features/workout/logic';
import { sessionTypedSetsQuery, setsBefore, type TypedSetRow } from '@/features/workout/repository';
import { fr } from '@/i18n/fr';
import { formatThousands, formatWeight } from '@/lib/format';
import { fromKg } from '@/lib/units';
import { colors } from '@/theme/tokens';

const t = fr.workout.summary;

/** Récap de fin de séance : blocs (Hyrox, circuit, cardio) puis musculation (SPEC 8, SPEC_V2 §5.4). */
export default function WorkoutSummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const userId = useAuth().session?.user.id ?? '';
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const exercises = useExercises();
  const { data: sessionRows } = useLiveQuery(
    liveDb.select().from(sessions).where(eq(sessions.id, sessionId)),
    [sessionId],
  );
  const { data: sets } = useLiveQuery(sessionTypedSetsQuery(liveDb, sessionId), [sessionId]);
  const { data: blocks } = useLiveQuery(
    liveDb
      .select()
      .from(sessionBlocks)
      .where(and(eq(sessionBlocks.sessionId, sessionId), isNull(sessionBlocks.deletedAt)))
      .orderBy(asc(sessionBlocks.position)),
    [sessionId],
  );
  const session = sessionRows[0];
  const templateId = session?.templateId ?? null;
  const template = useMemo(() => {
    if (!templateId) return null;
    const row = db
      .select({
        id: workoutTemplates.id,
        name: workoutTemplates.name,
        deletedAt: workoutTemplates.deletedAt,
      })
      .from(workoutTemplates)
      .where(eq(workoutTemplates.id, templateId))
      .get();
    return row && !row.deletedAt ? { id: row.id, name: row.name } : null;
  }, [templateId]);

  // Séries hors Hyrox (les segments Hyrox ont leur propre récap).
  const otherSets = useMemo(() => {
    const hyroxIds = new Set(blocks.filter((b) => b.type === 'hyrox').map((b) => b.id));
    return sets.filter((s) => !s.blockId || !hyroxIds.has(s.blockId));
  }, [blocks, sets]);
  const strengthSets = otherSets.filter(isStrength);

  const records = useMemo(() => {
    if (!session) return [];
    const byExercise = new Map<string, TypedSetRow[]>();
    for (const set of otherSets)
      byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
    const before = setsBefore(db, userId, [...byExercise.keys()], session.startedAt);
    return recordsBeaten(byExercise, before);
  }, [otherSets, session, userId]);

  const names = new Map(exercises.map((e) => [e.id, e.name]));
  const durationSeconds = session?.endedAt
    ? (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
    : 0;
  const ended = blocks.filter((b) => b.endedAt);
  const hasHyrox = ended.some((b) => b.type === 'hyrox');
  const showStrength = strengthSets.length > 0 || blocks.length === 0;

  const share = () =>
    void Share.share({
      message: shareText(session?.name ?? '', durationSeconds, blocks, strengthSets.length),
    }).catch(() => undefined);

  return (
    <FullScreen>
      <ScrollView contentContainerClassName="gap-3.5 px-screen pb-6 pt-6">
        {hasHyrox ? null : (
          <View>
            <Overline className="text-13">{session?.name ?? ''}</Overline>
            <Heading size={48}>{t.title}</Heading>
          </View>
        )}

        {ended.map((block) =>
          block.type === 'hyrox' ? (
            <HyroxRecapCard
              key={block.id}
              block={block}
              sessionName={session?.name ?? ''}
              userId={userId}
              template={template}
            />
          ) : block.type === 'circuit' ? (
            <CircuitRecapCard key={block.id} block={block} userId={userId} />
          ) : block.type === 'cardio' ? (
            <CardioRecapCard key={block.id} block={block} />
          ) : null,
        )}

        {showStrength ? (
          <>
            {hasHyrox || ended.length > 0 ? (
              <Text className="mt-1 font-body-bold text-18 text-text">{t.strength}</Text>
            ) : null}
            <View className="flex-row gap-2">
              <StatTile label={t.duration} value={formatClock(durationSeconds)} />
              <StatTile
                label={t.volume}
                value={formatThousands(fromKg(volume(strengthSets), unit))}
                unit={fr.units[unit]}
              />
              <StatTile label={t.sets} value={String(strengthSets.length)} />
            </View>
          </>
        ) : null}

        {showStrength || records.length > 0 ? (
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
                  <Text className="pr-1 font-display text-22 text-volt">
                    {isStrength(set)
                      ? `${formatWeight(set.weightKg, unit)} × ${set.reps}`
                      : formatSet(set.trackingType, set, unit)}
                  </Text>
                </View>
              ))
            )}
          </Card>
        ) : null}

        <View className="mt-2 flex-row gap-2">
          <Button label={t.share} variant="secondary" className="h-14 flex-1" onPress={share} />
          <Button label={t.done} className="h-14 flex-1" onPress={() => router.dismissTo('/')} />
        </View>
      </ScrollView>
    </FullScreen>
  );
}
