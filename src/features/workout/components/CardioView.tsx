import { Timer } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Heading, Stepper } from '@/components/ui';
import {
  formatDistance,
  formatPace,
  formatSet,
  paceSecondsPerKm,
} from '@/features/exercises/tracking';
import { cardioLine } from '@/features/templates/blockSummary';
import type { DraftItem } from '@/features/templates/draftStore';
import { formatRest } from '@/features/templates/format';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import type { WeightUnit } from '@/lib/database.types';
import { colors, iconSizes } from '@/theme/tokens';
import { formatClock } from '../logic';
import type { Workout } from '../useWorkout';
import { RestBar } from './RestBar';

const t = fr.workout.blocks.cardio;

type CardioViewProps = {
  workout: Workout;
  now: number;
  unit: WeightUnit;
  restRemaining: number;
  nextBlockName: string | null;
  onFinish: () => void;
};

/** Pas de la distance : 50 m sous 400 m, 100 m au-delà (SPEC_V2 §4.1). */
const distanceStep = (meters: number) => (meters < 400 ? 50 : 100);

/** Bloc Course / cardio : chrono tap / tap pour chaque série, puis récup automatique. */
export function CardioView({
  workout,
  now,
  unit,
  restRemaining,
  nextBlockName,
  onFinish,
}: CardioViewProps) {
  const state = workout.state!;
  const items = workout.itemsOf(workout.currentBlock);
  const current = items.find((p) => p.order === state.current) ?? items[0];
  const tracking = current?.exercise?.trackingType ?? 'distance_time';
  const timed =
    tracking === 'distance_time' || tracking === 'time' || tracking === 'weight_distance';
  const withDistance = tracking === 'distance_time' || tracking === 'weight_distance';
  const [distance, setDistance] = useState<Record<number, number>>({});
  const [count, setCount] = useState<Record<number, number>>({});

  const effort = state.effort ?? null;
  const running = effort !== null && effort.order === current?.order;
  const elapsedS = running ? Math.floor((now - effort.startedAt) / 1000) : 0;
  const setNumber = current?.activeSetNumber ?? null;
  const distanceM = current ? (distance[current.order] ?? current.item.targetDistanceM ?? 1000) : 0;
  const value = current
    ? (count[current.order] ??
      (tracking === 'calories'
        ? (current.item.targetCalories ?? 10)
        : (current.item.repsMax ?? current.item.repsMin ?? 10)))
    : 0;
  const pace = running && withDistance ? paceSecondsPerKm(distanceM, elapsedS) : null;
  const rest = state.rest;
  const allDone = items.every((p) => p.done.length >= p.planned);

  const asDraft = (): DraftItem | null =>
    current
      ? {
          key: String(current.order),
          exerciseId: current.item.exerciseId,
          targetSets: current.item.targetSets,
          repsText: String(current.item.repsMax ?? ''),
          restText: formatRest(current.item.restSeconds),
          targetDistanceM: current.item.targetDistanceM ?? null,
          targetDurationS: current.item.targetDurationS ?? null,
          targetCalories: current.item.targetCalories ?? null,
          targetWeightKg: current.item.targetWeightKg ?? null,
        }
      : null;
  const draft = asDraft();

  const stop = () => {
    if (!current || !setNumber || !effort) return;
    workout.validateMeasured(current.order, setNumber, {
      weightKg: current.item.targetWeightKg ?? 0,
      distanceM: withDistance ? distanceM : null,
      durationS: Math.max(1, elapsedS),
    });
  };

  const validateCount = () => {
    if (!current || !setNumber) return;
    workout.validateMeasured(
      current.order,
      setNumber,
      tracking === 'calories' ? { calories: value } : { reps: value },
    );
  };

  return (
    <>
      <ScrollView contentContainerClassName="gap-3 px-screen pb-4 pt-3">
        {items.length > 1 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {items.map((p) => (
              <Pressable
                key={p.order}
                accessibilityRole="button"
                onPress={() => !running && workout.setCurrent(p.order)}
                className={cn(
                  'h-9 justify-center rounded-button px-3',
                  p.order === current?.order ? 'bg-volt' : 'border border-line bg-surface',
                )}
              >
                <Text
                  className={cn(
                    'font-body-semibold text-14',
                    p.order === current?.order ? 'text-onVolt' : 'text-text',
                  )}
                >
                  {p.exercise?.name ?? ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {current && draft ? (
          <>
            <View>
              <Text className="font-body text-13 text-muted">
                {setNumber ? t.setOf(setNumber, current.planned) : fr.workout.blocks.done}
              </Text>
              <Heading size={30}>{current.exercise?.name ?? ''}</Heading>
              <Text className="mt-1 font-body text-14 text-muted">
                {t.target(cardioLine(draft, tracking, unit))}
              </Text>
            </View>

            <View className="gap-1.5">
              {current.done.map((set) => (
                <View
                  key={set.id}
                  className="h-11 flex-row items-center gap-3 rounded-input bg-surface px-3.5"
                >
                  <Text className="w-6 font-body-bold text-14 text-muted">{set.setNumber}</Text>
                  <Text className="flex-1 font-body-semibold text-15 text-text">
                    {formatSet(tracking, set, unit)}
                  </Text>
                  {set.distanceM && set.durationS ? (
                    <Text className="font-body text-13 text-muted">
                      {formatPace(paceSecondsPerKm(set.distanceM, set.durationS) ?? 0)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>

            {setNumber ? (
              <View className="items-center gap-3 rounded-card bg-surface p-4">
                {withDistance ? (
                  <Stepper
                    size="md"
                    value={distanceM}
                    onChange={(next) => setDistance((d) => ({ ...d, [current.order]: next }))}
                    step={distanceStep(distanceM)}
                    min={50}
                    max={42_200}
                    format={formatDistance}
                  />
                ) : null}
                {timed ? (
                  <>
                    <View className="flex-row items-center gap-2">
                      <Timer size={iconSizes.lg} color={colors.volt} strokeWidth={2} />
                      <Text
                        className="font-display text-80 text-text"
                        accessibilityLabel={formatClock(elapsedS)}
                      >
                        {formatClock(elapsedS)}
                      </Text>
                    </View>
                    <Text className="font-body text-13 text-muted">
                      {pace !== null ? t.pace(formatPace(pace)) : t.tapToStart}
                    </Text>
                  </>
                ) : (
                  <Stepper
                    size="lg"
                    value={value}
                    onChange={(next) => setCount((c) => ({ ...c, [current.order]: next }))}
                    step={1}
                    min={1}
                    max={500}
                    unit={tracking === 'calories' ? fr.units.cal : fr.units.reps}
                  />
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <View className="gap-2.5 px-screen pb-2 pt-1">
        {rest && restRemaining > 0 ? (
          <RestBar
            remainingSeconds={restRemaining}
            durationSeconds={rest.durationSeconds}
            nextLabel={fr.workout.rest.nextSet(rest.nextSetNumber)}
            onAdjust={workout.adjustRest}
            onSkip={workout.stopRest}
          />
        ) : null}
        {current && setNumber && timed ? (
          <Button
            label={running ? t.stop : t.start}
            onPress={() => (running ? stop() : workout.startEffort(current.order, setNumber))}
          />
        ) : current && setNumber ? (
          <Button label={t.validate(setNumber)} onPress={validateCount} />
        ) : allDone ? (
          <Button
            label={nextBlockName !== null ? fr.workout.blocks.next(nextBlockName) : fr.workout.end}
            onPress={nextBlockName !== null ? workout.nextBlock : onFinish}
          />
        ) : (
          <Button
            label={fr.workout.next}
            onPress={() => {
              const next = items.find((p) => p.done.length < p.planned);
              if (next) workout.setCurrent(next.order);
            }}
          />
        )}
      </View>
    </>
  );
}
