import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Heading,
  IconButton,
  Overline,
  PhotoSlot,
  ProgressSegments,
  useToast,
} from '@/components/ui';
import { useProfile } from '@/features/profile/hooks';
import { ActiveSetCard } from '@/features/workout/components/ActiveSetCard';
import { AdviceBanner } from '@/features/workout/components/AdviceBanner';
import { RestBar } from '@/features/workout/components/RestBar';
import { columnClasses, SetRow } from '@/features/workout/components/SetRow';
import { formatClock, lastTimeSummary, loadAdvice, type SetDraft } from '@/features/workout/logic';
import { useWorkout } from '@/features/workout/useWorkout';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { formatNumber, formatWeight } from '@/lib/format';
import { fromKg } from '@/lib/units';
import { useNow } from '@/lib/useNow';

const t = fr.workout;

export default function WorkoutScreen() {
  useKeepAwake();
  const toast = useToast();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const workout = useWorkout(sessionId);
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const now = useNow();
  const [editing, setEditing] = useState<{ id: string; draft: SetDraft; setNumber: number } | null>(
    null,
  );

  const rest = workout.state?.rest ?? null;
  const restRemaining = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0;

  // Fin du repos au premier plan : vibration + message (la notification couvre l'arrière-plan).
  useEffect(() => {
    if (rest && restRemaining <= 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(t.rest.done);
      workout.stopRest();
    }
  }, [rest, restRemaining, toast, workout]);

  const { state, session, progress } = workout;
  if (!state || !session || session.endedAt) {
    return (
      <SafeAreaView className="flex-1 bg-bg px-screen">
        <IconButton
          icon={ChevronDown}
          accessibilityLabel={t.minimize}
          onPress={() => router.back()}
        />
        <Text className="mt-6 font-body text-15 text-muted">{t.notFound}</Text>
      </SafeAreaView>
    );
  }

  const current = progress[state.current];
  const count = progress.length;
  const weightText = (kg: number) => `${formatNumber(fromKg(kg, unit))}`;
  const setLabel = (kg: number, reps: number) => t.setValue(weightText(kg), reps);
  const previousFor = (setNumber: number) => {
    const p = current?.previous.find((s) => s.setNumber === setNumber);
    return p ? setLabel(p.weightKg, p.reps) : t.noPrevious;
  };

  const last = current ? lastTimeSummary(current.previous) : null;
  const advice = current
    ? loadAdvice(current.previous, current.item.repsMax, current.exercise?.weightStep ?? 2.5)
    : null;

  const activeSetNumber = editing ? editing.setNumber : (current?.activeSetNumber ?? null);
  const activeDraft = editing
    ? editing.draft
    : activeSetNumber && current
      ? workout.draftFor(current.order, activeSetNumber)
      : null;

  const changeDraft = (patch: Partial<SetDraft>) => {
    if (editing) setEditing({ ...editing, draft: { ...editing.draft, ...patch } });
    else if (current && activeSetNumber) workout.setDraft(current.order, activeSetNumber, patch);
  };

  const nextUnfinished = progress.find(
    (p) => p.order !== state.current && p.done.length < p.planned,
  );
  const allDone = workout.remainingSets === 0;

  const onPrimary = () => {
    if (editing) {
      workout.editSet(editing.id, editing.draft);
      setEditing(null);
      return;
    }
    if (current?.activeSetNumber) return workout.validate();
    if (nextUnfinished) return workout.setCurrent(nextUnfinished.order);
    confirmFinish();
  };

  const primaryLabel = editing
    ? t.update(editing.setNumber)
    : current?.activeSetNumber
      ? t.validate(current.activeSetNumber)
      : nextUnfinished
        ? t.next
        : t.end;

  const finishNow = () => {
    const result = workout.finish();
    if (result === 'discarded') {
      toast.show(t.discarded);
      router.back();
    } else {
      router.replace({ pathname: '/workout/summary/[sessionId]', params: { sessionId } });
    }
  };

  const confirmFinish = () => {
    const done = workout.sets.length;
    if (done > 0 && allDone) return finishNow();
    Alert.alert(
      t.finishTitle,
      done === 0 ? t.finishEmpty : t.finishRemaining(workout.remainingSets),
      [
        { text: t.keepGoing, style: 'cancel' },
        {
          text: t.finishConfirm,
          style: done === 0 ? 'destructive' : 'default',
          onPress: finishNow,
        },
      ],
    );
  };

  const go = (delta: number) => {
    setEditing(null);
    workout.setCurrent(state.current + delta);
  };
  const swipe = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.LEFT)
      .runOnJS(true)
      .onEnd(() => go(1)),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .runOnJS(true)
      .onEnd(() => go(-1)),
  );

  const restNext = rest ? progress[rest.nextOrder] : undefined;
  const restLabel =
    rest && restNext
      ? rest.nextOrder === state.current
        ? t.rest.nextSet(rest.nextSetNumber)
        : (restNext.exercise?.name ?? '').toLowerCase()
      : '';

  const elapsed = (now - new Date(session.startedAt).getTime()) / 1000;
  const fills = progress.map((p) => (p.planned ? p.done.length / p.planned : 0));

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="gap-3 px-screen pt-1">
        <View className="flex-row items-center justify-between">
          <IconButton
            icon={ChevronDown}
            accessibilityLabel={t.minimize}
            onPress={() => router.back()}
          />
          <View className="items-center">
            <Overline className="text-13">{session.name}</Overline>
            <Text
              className="font-display text-26 text-volt"
              accessibilityLabel={formatClock(elapsed)}
            >
              {formatClock(elapsed)}
            </Text>
          </View>
          <Button
            label={t.finish}
            variant="secondary"
            size="sm"
            className="h-11"
            onPress={confirmFinish}
          />
        </View>
        <ProgressSegments count={count} progress={0} fills={fills} />
      </View>

      <GestureDetector gesture={swipe}>
        <ScrollView
          contentContainerClassName="gap-3 px-screen pb-4 pt-3"
          keyboardShouldPersistTaps="handled"
        >
          {current ? (
            <>
              <View className="flex-row items-center gap-3.5">
                <PhotoSlot variant="thumb" uri={current.exercise?.photoLocalUri} />
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-body text-13 text-muted">
                      {t.exerciseOf(state.current + 1, count)}
                    </Text>
                    <View className="flex-row gap-1">
                      <IconButton
                        icon={ChevronLeft}
                        size="sm"
                        tone="ghost"
                        accessibilityLabel={t.previousExercise}
                        disabled={state.current === 0}
                        onPress={() => go(-1)}
                      />
                      <IconButton
                        icon={ChevronRight}
                        size="sm"
                        tone="ghost"
                        accessibilityLabel={t.nextExercise}
                        disabled={state.current >= count - 1}
                        onPress={() => go(1)}
                      />
                    </View>
                  </View>
                  <Heading size={30}>{current.exercise?.name ?? ''}</Heading>
                  <Text className="mt-1 font-body text-14 text-muted">
                    {last
                      ? t.lastTime(last.sets, last.reps, formatWeight(last.weightKg, unit))
                      : t.firstTime}
                  </Text>
                </View>
              </View>

              {advice ? (
                <AdviceBanner advice={advice} weightLabel={formatWeight(advice.weightKg, unit)} />
              ) : null}

              <View className="flex-row gap-2 px-2.5">
                {(
                  [
                    [columnClasses.set, t.columns.set],
                    [columnClasses.previous, t.columns.previous],
                    [columnClasses.weight, t.weightColumn(fr.units[unit])],
                    [columnClasses.reps, t.columns.reps],
                  ] as const
                ).map(([className, label]) => (
                  <Text
                    key={label}
                    className={cn(
                      className,
                      'font-body-bold text-11 uppercase tracking-wide text-muted',
                    )}
                  >
                    {label}
                  </Text>
                ))}
                <View className={columnClasses.difficulty} />
              </View>

              <View className="gap-1.5">
                {current.done.map((set) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    previousLabel={previousFor(set.setNumber)}
                    weightLabel={weightText(set.weightKg)}
                    editing={editing?.id === set.id}
                    onPress={() =>
                      setEditing(
                        editing?.id === set.id
                          ? null
                          : {
                              id: set.id,
                              setNumber: set.setNumber,
                              draft: {
                                weightKg: set.weightKg,
                                reps: set.reps,
                                difficulty: set.difficulty,
                              },
                            },
                      )
                    }
                    onDelete={() => {
                      if (editing?.id === set.id) setEditing(null);
                      workout.removeSet(set.id);
                    }}
                  />
                ))}

                {activeSetNumber && activeDraft ? (
                  <ActiveSetCard
                    setNumber={activeSetNumber}
                    previousLabel={
                      previousFor(activeSetNumber) === t.noPrevious
                        ? null
                        : previousFor(activeSetNumber)
                    }
                    draft={activeDraft}
                    weightStepKg={current.exercise?.weightStep ?? 2.5}
                    unit={unit}
                    onChange={changeDraft}
                  />
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => workout.addPlannedSet(current.order)}
                  className="h-[42px] items-center justify-center rounded-input border border-dashed border-lineStrong active:opacity-80"
                >
                  <Text className="font-body-semibold text-14 text-muted">{t.addSet}</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
      </GestureDetector>

      <View className="gap-2.5 px-screen pb-2 pt-1">
        {rest && restRemaining > 0 ? (
          <RestBar
            remainingSeconds={restRemaining}
            durationSeconds={rest.durationSeconds}
            nextLabel={restLabel}
            onAdjust={workout.adjustRest}
            onSkip={workout.stopRest}
          />
        ) : null}
        <Button label={primaryLabel} onPress={onPrimary} />
      </View>
    </SafeAreaView>
  );
}
