import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Button, Stepper } from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { parseBlockConfig } from '@/features/templates/blockConfig';
import { circuitTitle, itemTarget } from '@/features/templates/blockSummary';
import type { DraftItem } from '@/features/templates/draftStore';
import { formatRest } from '@/features/templates/format';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import type { WeightUnit } from '@/lib/database.types';
import { colors } from '@/theme/tokens';
import {
  activeSeconds,
  circuitDurationS,
  intervalStatus,
  projectedRounds,
  signalTimes,
} from '../blocks/engine';
import { useSignalSound } from '../blocks/useSignalSound';
import { formatClock } from '../logic';
import { lastBlock } from '../repository';
import type { Workout } from '../useWorkout';

const t = fr.workout.blocks.circuit;

const RING = 260;
const STROKE = 14;
const RADIUS = (RING - STROKE) / 2 - 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anneau de compte à rebours (maquette seance-wod). */
function Ring({ fraction, label, time }: { fraction: number; label: string; time: string }) {
  return (
    <View className="items-center justify-center self-center" style={{ width: RING, height: RING }}>
      <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={RADIUS}
          fill="none"
          stroke={colors.surface2}
          strokeWidth={STROKE}
        />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={RADIUS}
          fill="none"
          stroke={colors.volt}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * Math.max(0, Math.min(1, fraction))} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <Text className="font-body-semibold text-13 uppercase tracking-wide text-muted">{label}</Text>
      <Text className="px-3 font-display text-80 text-text" accessibilityLabel={time}>
        {time}
      </Text>
    </View>
  );
}

type CircuitViewProps = { workout: Workout; now: number; unit: WeightUnit };

/** Bloc circuit en cours (maquette seance-wod) : AMRAP, EMOM, For Time, Tabata. */
export function CircuitView({ workout, now, unit }: CircuitViewProps) {
  const userId = useAuth().session?.user.id ?? '';
  const signal = useSignalSound();
  const index = workout.currentBlock;
  const block = workout.blocks[index]!;
  const config = parseBlockConfig('circuit', block.config);
  const run = workout.runOf(index);
  const items = workout.itemsOf(index);
  const elapsed = activeSeconds(run, now);
  const total = circuitDurationS(config);
  const timeUp = total !== null && elapsed >= total;
  const status = intervalStatus(config, elapsed);
  const rounds = run.rounds ?? 0;
  const [extraReps, setExtraReps] = useState(0);

  const last = useMemo(
    () => lastBlock(db, userId, block, workout.session?.id ?? ''),
    [block, userId, workout.session?.id],
  );

  // Bip à chaque changement d'intervalle et à la fin, au premier plan (les notifications
  // programmées sonnent en arrière-plan).
  const signals = useMemo(
    () => signalTimes(parseBlockConfig('circuit', block.config)),
    [block.config],
  );
  const passed = signals.filter((at) => elapsed >= at).length;
  const previous = useRef(passed);
  useEffect(() => {
    if (passed > previous.current && run.pausedAt === null) {
      signal(passed >= signals.length ? 'end' : 'beep');
    }
    previous.current = passed;
  }, [passed, run.pausedAt, signal, signals.length]);

  const asDraft = (p: (typeof items)[number]): DraftItem => ({
    key: String(p.order),
    exerciseId: p.item.exerciseId,
    targetSets: 1,
    repsText: String(p.item.repsMax ?? p.item.repsMin ?? ''),
    restText: formatRest(0),
    targetDistanceM: p.item.targetDistanceM ?? null,
    targetDurationS: p.item.targetDurationS ?? null,
    targetCalories: p.item.targetCalories ?? null,
    targetWeightKg: p.item.targetWeightKg ?? null,
  });

  const lastResult = last?.block.result;
  const lastLine =
    config.format === 'amrap' && lastResult && typeof lastResult.rounds === 'number'
      ? t.last(lastResult.rounds, Number(lastResult.extraReps ?? 0))
      : config.format === 'for_time' && lastResult && typeof lastResult.totalS === 'number'
        ? t.lastTime(formatClock(lastResult.totalS))
        : null;
  const projection =
    config.format === 'amrap' ? projectedRounds(rounds, elapsed, config.durationS) : null;

  const ring = (() => {
    if (config.format === 'for_time') {
      return (
        <Ring
          fraction={total ? elapsed / total : 1}
          label={t.elapsed}
          time={formatClock(elapsed)}
        />
      );
    }
    if (config.format === 'amrap' || !status) {
      return (
        <Ring
          fraction={total ? (total - elapsed) / total : 0}
          label={t.remaining}
          time={formatClock(Math.max(0, (total ?? 0) - elapsed))}
        />
      );
    }
    if (config.format === 'emom') {
      return (
        <Ring
          fraction={status.remainingS / config.intervalS}
          label={t.round(status.round, config.rounds)}
          time={formatClock(status.remainingS)}
        />
      );
    }
    const working = status.phase === 'work';
    return (
      <Ring
        fraction={status.remainingS / Math.max(1, working ? config.workS : config.restS)}
        label={`${working ? t.work : t.rest} · ${t.round(status.round, config.rounds)}`}
        time={formatClock(status.remainingS)}
      />
    );
  })();

  return (
    <View className="flex-1 gap-3.5 px-screen pt-3">
      <View className="items-center">
        <View className="h-8 justify-center rounded-sm bg-volt px-3.5">
          <Text className="font-display text-18 uppercase text-onVolt">{circuitTitle(config)}</Text>
        </View>
      </View>
      {ring}

      {items.length > 0 ? (
        <View className="gap-2 rounded-card bg-surface px-4 py-3.5">
          <Text className="font-body-bold text-12 uppercase tracking-wide text-muted">
            {t.oneRound}
          </Text>
          {items.map((p) => (
            <View key={p.order} className="flex-row justify-between">
              <Text className="font-body text-16 text-text">
                <Text className="font-body-bold">
                  {itemTarget(asDraft(p), p.exercise?.trackingType ?? 'reps', unit)}
                </Text>{' '}
                {p.exercise?.name ?? ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-1" />

      {config.format === 'amrap' && !timeUp ? (
        <>
          <View className="flex-row items-center gap-2.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.minusRound}
              onPress={() => workout.addRound(-1)}
              className="h-[88px] w-16 items-center justify-center rounded-card bg-surface active:opacity-80"
            >
              <Text className="font-body text-30 text-text">−</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t.rounds(rounds)}. ${t.tapRound}`}
              onPress={() => workout.addRound(1)}
              className="h-[88px] flex-1 items-center justify-center rounded-card bg-volt active:opacity-90"
            >
              <Text className="px-2 font-display text-44 uppercase text-onVolt">
                {t.rounds(rounds)}
              </Text>
              <Text className="font-body-bold text-13 text-onVolt">{t.tapRound}</Text>
            </Pressable>
          </View>
          {lastLine || projection !== null ? (
            <Text className="pb-2 text-center font-body text-13 text-muted">
              {[lastLine, projection !== null ? t.pace(projection) : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
        </>
      ) : null}

      {config.format === 'amrap' && timeUp ? (
        <View className="gap-3 pb-2">
          <Text className="text-center font-display text-30 uppercase text-text">
            {t.rounds(rounds)}
          </Text>
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 font-body-semibold text-15 text-text">{t.extraReps}</Text>
            <Stepper
              size="sm"
              value={extraReps}
              onChange={setExtraReps}
              step={1}
              min={0}
              max={200}
              format={String}
            />
          </View>
          <Button
            label={t.validate}
            onPress={() => workout.completeBlock(index, { rounds, extraReps })}
          />
        </View>
      ) : null}

      {config.format === 'for_time' ? (
        <View className={cn('gap-2 pb-2')}>
          {lastLine ? (
            <Text className="text-center font-body text-13 text-muted">{lastLine}</Text>
          ) : null}
          {timeUp ? (
            <Text className="text-center font-body-bold text-15 text-diffHard">{t.capReached}</Text>
          ) : null}
          <Button
            label={t.doneButton}
            onPress={() =>
              workout.completeBlock(index, {
                totalS: timeUp && total !== null ? total : elapsed,
                capped: timeUp,
              })
            }
          />
        </View>
      ) : null}

      {config.format === 'emom' || config.format === 'tabata' ? (
        <View className="pb-2">
          <Button
            label={timeUp ? t.validate : fr.workout.blocks.endBlock}
            variant={timeUp ? 'primary' : 'secondary'}
            onPress={() =>
              workout.completeBlock(index, {
                completedRounds: timeUp ? config.rounds : Math.max(0, (status?.round ?? 1) - 1),
              })
            }
          />
        </View>
      ) : null}
    </View>
  );
}
