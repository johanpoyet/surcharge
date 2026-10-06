import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Button, Heading, IconButton, PhotoSlot, ProgressSegments } from '@/components/ui';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import type { WeightUnit } from '@/lib/database.types';
import { formatNumber, formatWeight } from '@/lib/format';
import { fromKg } from '@/lib/units';
import { lastTimeSummary, loadAdvice, type SetDraft } from '../logic';
import type { Workout } from '../useWorkout';
import { ActiveSetCard } from './ActiveSetCard';
import { AdviceBanner } from './AdviceBanner';
import { RestBar } from './RestBar';
import { columnClasses, SetRow } from './SetRow';

const t = fr.workout;

type StrengthViewProps = {
  workout: Workout;
  unit: WeightUnit;
  restRemaining: number;
  /** Nom du bloc suivant (séance en blocs), null s'il n'y en a pas. */
  nextBlockName: string | null;
  onFinish: () => void;
};

/** Bloc Musculation : l'écran de séance V1 (SPEC 8.2), limité aux exercices du bloc courant. */
export function StrengthView({
  workout,
  unit,
  restRemaining,
  nextBlockName,
  onFinish,
}: StrengthViewProps) {
  const [editing, setEditing] = useState<{ id: string; draft: SetDraft; setNumber: number } | null>(
    null,
  );
  const state = workout.state!;
  const items = workout.itemsOf(workout.currentBlock);
  const index = Math.max(
    0,
    items.findIndex((p) => p.order === state.current),
  );
  const current = items[index];
  const count = items.length;
  const rest = state.rest;

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

  const nextUnfinished = items.find((p) => p.order !== state.current && p.done.length < p.planned);

  const onPrimary = () => {
    if (editing) {
      workout.editSet(editing.id, editing.draft);
      setEditing(null);
      return;
    }
    if (current?.activeSetNumber) return workout.validate();
    if (nextUnfinished) return workout.setCurrent(nextUnfinished.order);
    if (nextBlockName !== null) return workout.nextBlock();
    onFinish();
  };

  const primaryLabel = editing
    ? t.update(editing.setNumber)
    : current?.activeSetNumber
      ? t.validate(current.activeSetNumber)
      : nextUnfinished
        ? t.next
        : nextBlockName !== null
          ? t.blocks.next(nextBlockName)
          : t.end;

  const go = (delta: number) => {
    const target = items[index + delta];
    if (!target) return;
    setEditing(null);
    workout.setCurrent(target.order);
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

  const restNext = rest ? workout.progress[rest.nextOrder] : undefined;
  const restLabel =
    rest && restNext
      ? rest.nextOrder === state.current
        ? t.rest.nextSet(rest.nextSetNumber)
        : (restNext.exercise?.name ?? '').toLowerCase()
      : '';
  const fills = items.map((p) => (p.planned ? p.done.length / p.planned : 0));

  return (
    <>
      <View className="px-screen pt-3">
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
                      {t.exerciseOf(index + 1, count)}
                    </Text>
                    <View className="flex-row gap-1">
                      <IconButton
                        icon={ChevronLeft}
                        size="sm"
                        tone="ghost"
                        accessibilityLabel={t.previousExercise}
                        disabled={index === 0}
                        onPress={() => go(-1)}
                      />
                      <IconButton
                        icon={ChevronRight}
                        size="sm"
                        tone="ghost"
                        accessibilityLabel={t.nextExercise}
                        disabled={index >= count - 1}
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
    </>
  );
}
