import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  DifficultyBadge,
  Heading,
  IconButton,
  PhotoSlot,
  StatTile,
} from '@/components/ui';
import { db } from '@/db/client';
import { useExercise, useExerciseHistory } from '@/features/exercises/hooks';
import { deleteLocalPhoto } from '@/features/exercises/photos';
import { updateExercise } from '@/features/exercises/repository';
import { usePhotoPicker } from '@/features/exercises/usePhotoPicker';
import { useProfile } from '@/features/profile/hooks';
import { FeelingCard } from '@/features/exercises/components/FeelingCard';
import { ProgressChartCard } from '@/features/exercises/components/ProgressChartCard';
import { TrackingChartCard } from '@/features/exercises/components/TrackingChartCard';
import {
  bestPace,
  formatSet,
  shortSetValue,
  trackingRecord,
  usesWeight,
} from '@/features/exercises/tracking';
import { bestEstimated1RM, recordSet } from '@/features/stats/calc';
import { difficultyAt, exerciseSeries } from '@/features/stats/series';
import { formatClock, loadAdvice } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { formatMonth, formatSessionDay, formatShortDay } from '@/lib/dates';
import { formatNumber, formatWeight } from '@/lib/format';
import { fromKg } from '@/lib/units';

const t = fr.exercises.detail;
const HISTORY_PREVIEW = 3;

function Tag({ label, tone }: { label: string; tone: 'volt' | 'text' | 'muted' }) {
  return (
    <View
      className={cn(
        'h-7 justify-center rounded-sm px-2.5',
        tone === 'volt' ? 'bg-volt-soft' : 'bg-surface',
      )}
    >
      <Text
        className={cn(
          'text-13',
          tone === 'volt' ? 'font-body-bold text-volt' : 'font-body-semibold',
          tone === 'text' && 'text-text',
          tone === 'muted' && 'text-muted',
        )}
      >
        {label}
      </Text>
    </View>
  );
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercise(id);
  const history = useExerciseHistory(id);
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const photos = usePhotoPicker();
  const [showAll, setShowAll] = useState(false);

  if (!exercise) {
    return (
      <SafeAreaView className="flex-1 bg-bg px-screen">
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel={fr.common.back}
          onPress={() => router.back()}
        />
        <Text className="mt-6 font-body text-15 text-muted">{t.notFound}</Text>
      </SafeAreaView>
    );
  }

  const type = exercise.trackingType;
  // Charge × reps : écran V1 inchangé. Autres types : records, courbe et historique adaptés.
  const v1 = type === 'weight_reps';
  const allSets = history.flatMap((session) => session.sets);
  const record = recordSet(allSets);
  const typedRecord = v1 ? null : trackingRecord(type, allSets);
  const typedRecordValue = typedRecord ? shortSetValue(type, typedRecord, unit) : null;
  const lastBest = history[0] ? trackingRecord(type, history[0].sets) : null;
  const lastBestValue = !v1 && lastBest ? shortSetValue(type, lastBest, unit) : null;
  const pace = type === 'distance_time' ? bestPace(allSets) : null;
  const oneRm = bestEstimated1RM(allSets);
  const firstSession = history[history.length - 1];
  const series = exerciseSeries(
    history.map((h) => ({
      sessionId: h.sessionId,
      startedAt: h.startedAt,
      sets: h.sets.map((set) => ({ ...set, exerciseId: exercise.id })),
    })),
  );
  // Charge de travail : charge max de la dernière séance (bloc « Ressenti à X kg »).
  const lastSession = history[0];
  const workingWeight = lastSession ? Math.max(...lastSession.sets.map((s) => s.weightKg)) : null;
  const feeling = difficultyAt(allSets, workingWeight ?? -1);
  const advice = lastSession ? loadAdvice(lastSession.sets, null, exercise.weightStep) : null;
  const visibleHistory = showAll ? history : history.slice(0, HISTORY_PREVIEW);

  const changePhoto = () =>
    photos.choose(
      (uri) => {
        deleteLocalPhoto(exercise.photoLocalUri);
        updateExercise(db, exercise.id, { photoLocalUri: uri });
      },
      exercise.photoLocalUri
        ? () => {
            deleteLocalPhoto(exercise.photoLocalUri);
            updateExercise(db, exercise.id, { photoLocalUri: null });
          }
        : undefined,
    );

  const stepLabel = `${formatNumber(Math.round(fromKg(exercise.weightStep, unit) * 2) / 2, 1)} ${fr.units[unit]}`;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-3.5 px-screen pb-10 pt-2">
        <View className="flex-row items-center justify-between">
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel={fr.common.back}
            onPress={() => router.back()}
          />
          <Button
            label={t.edit}
            variant="secondary"
            size="sm"
            className="h-11"
            onPress={() =>
              router.push({ pathname: '/exercises/[id]/edit', params: { id: exercise.id } })
            }
          />
        </View>

        <PhotoSlot variant="banner" uri={exercise.photoLocalUri} onPress={changePhoto} />

        <View>
          <Heading size={38}>{exercise.name}</Heading>
          <View className="mt-2.5 flex-row flex-wrap gap-1.5">
            <Tag label={fr.exercises.muscles[exercise.muscle]} tone="volt" />
            <Tag label={fr.exercises.equipment[exercise.equipment]} tone="text" />
            {usesWeight(type) ? <Tag label={t.step(stepLabel)} tone="muted" /> : null}
            {v1 ? null : <Tag label={fr.exercises.tracking.types[type].title} tone="muted" />}
          </View>
        </View>

        {v1 ? (
          <View className="flex-row gap-2">
            <StatTile
              label={t.record}
              value={record ? formatWeight(record.weightKg, unit) : t.noData}
              caption={
                record
                  ? t.recordCaption(record.reps, formatShortDay(record.completedAt))
                  : undefined
              }
              accent={record !== null}
            />
            <StatTile
              label={t.oneRm}
              value={oneRm !== null ? formatWeight(oneRm, unit) : t.noData}
              caption={t.oneRmCaption}
            />
            <StatTile
              label={t.sessions}
              value={String(history.length)}
              caption={firstSession ? t.since(formatMonth(firstSession.startedAt)) : t.noSessions}
            />
          </View>
        ) : (
          <View className="flex-row gap-2">
            <StatTile
              label={t.record}
              value={typedRecordValue?.value ?? t.noData}
              caption={
                typedRecord && typedRecordValue
                  ? typedRecordValue.detail
                    ? t.recordAt(typedRecordValue.detail, formatShortDay(typedRecord.completedAt))
                    : formatShortDay(typedRecord.completedAt)
                  : undefined
              }
              accent={typedRecord !== null}
            />
            {type === 'distance_time' ? (
              <StatTile
                label={t.bestPace}
                value={pace !== null ? formatClock(Math.round(pace)) : t.noData}
                caption={pace !== null ? `${fr.units.perKm} · ${t.bestPaceCaption}` : undefined}
              />
            ) : (
              <StatTile
                label={t.last}
                value={lastBestValue?.value ?? t.noData}
                caption={lastBestValue?.detail ?? undefined}
              />
            )}
            <StatTile
              label={t.sessions}
              value={String(history.length)}
              caption={firstSession ? t.since(formatMonth(firstSession.startedAt)) : t.noSessions}
            />
          </View>
        )}

        {exercise.note ? (
          <Card>
            <Text className="font-body text-15 text-text">{exercise.note}</Text>
          </Card>
        ) : null}

        {v1 ? (
          <ProgressChartCard series={series} unit={unit} />
        ) : (
          <TrackingChartCard type={type} sessions={[...history].reverse()} unit={unit} />
        )}

        {v1 && lastSession && workingWeight !== null ? (
          <FeelingCard
            weightLabel={formatWeight(workingWeight, unit)}
            counts={feeling.counts}
            rated={feeling.rated}
            total={feeling.total}
            advice={advice}
            adviceWeightLabel={advice ? formatWeight(advice.weightKg, unit) : ''}
            nextWeightLabel={formatWeight(workingWeight + exercise.weightStep, unit)}
          />
        ) : null}

        <Text className="mt-1 font-body-bold text-18 text-text">{t.history}</Text>
        {history.length === 0 ? (
          <Text className="font-body text-15 text-muted">{t.noHistory}</Text>
        ) : (
          visibleHistory.map((session) => (
            <View key={session.sessionId} className="gap-2 rounded-tile bg-surface px-3.5 py-3">
              <View className="flex-row justify-between">
                <Text className="font-body-bold text-14 text-text">
                  {formatSessionDay(session.startedAt)}
                </Text>
                <Text className="font-body text-14 text-muted">{session.sessionName}</Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {session.sets.map((set) => (
                  <View
                    key={set.id}
                    className="h-7 flex-row items-center gap-1.5 rounded-sm bg-bg pl-1 pr-2"
                  >
                    {set.difficulty ? (
                      <DifficultyBadge difficulty={set.difficulty} size="sm" />
                    ) : null}
                    <Text className="font-body text-13 text-text">
                      {v1
                        ? t.set(formatNumber(fromKg(set.weightKg, unit)), set.reps)
                        : formatSet(type, set, unit)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
        {history.length > HISTORY_PREVIEW ? (
          <Button
            label={showAll ? t.showLess : t.showAll}
            variant="secondary"
            size="sm"
            className="h-11"
            onPress={() => setShowAll((v) => !v)}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
