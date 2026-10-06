import { useAuth } from '@/features/auth/AuthProvider';
import { ArrowRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { db } from '@/db/client';
import { formatDistance } from '@/features/exercises/tracking';
import { parseBlockConfig } from '@/features/templates/blockConfig';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import type { WeightUnit } from '@/lib/database.types';
import { formatWeight } from '@/lib/format';
import { colors } from '@/theme/tokens';
import { canUndo, formatDelta, segmentMs } from '../blocks/engine';
import { formatClock } from '../logic';
import { lastBlock } from '../repository';
import type { ExerciseProgress, Workout } from '../useWorkout';

const t = fr.workout.blocks.hyrox;
const tb = fr.templates.blocks;

type HyroxViewProps = { workout: Workout; now: number; unit: WeightUnit };

/** Couleur d'un écart : en avance (volt), en retard (orange), égal (gris) ; le signe dit pareil. */
const deltaTone = (deltaS: number) =>
  deltaS < 0 ? 'text-volt' : deltaS > 0 ? 'text-diffHard' : 'text-muted';

/** Bloc Hyrox en cours (maquette seance-hyrox) : un seul gros bouton par segment. */
export function HyroxView({ workout, now, unit }: HyroxViewProps) {
  const userId = useAuth().session?.user.id ?? '';
  const index = workout.currentBlock;
  const block = workout.blocks[index]!;
  const config = parseBlockConfig('hyrox', block.config);
  const run = workout.runOf(index);
  const items = workout.itemsOf(index);
  const cursor = run.hyrox;
  const segment = cursor?.segment ?? 0;
  const current = items[segment];
  const transition = cursor?.phase === 'transition';
  const stations = items.filter((p) => p.item.segment?.kind === 'station').length;

  // Dernière fois (SPEC_V2 §4.5) : temps de chaque segment, dans l'ordre.
  const last = useMemo(
    () => lastBlock(db, userId, block, workout.session?.id ?? ''),
    [block, userId, workout.session?.id],
  );
  const lastDurations = useMemo(
    () => (last?.sets ?? []).map((set) => set.durationS ?? null),
    [last],
  );

  const nameOf = (p: ExerciseProgress | undefined) =>
    !p
      ? ''
      : p.item.segment?.kind === 'run'
        ? t.runName(p.item.segment.round)
        : (p.exercise?.name ?? '');
  const elapsedS = Math.floor(segmentMs(run, now) / 1000);
  const lastS = transition ? null : (lastDurations[segment] ?? null);
  const deltaS = lastS !== null ? elapsedS - lastS : null;

  const detail = (p: ExerciseProgress) => {
    const seg = p.item.segment;
    const target = p.item.targetDistanceM
      ? formatDistance(p.item.targetDistanceM)
      : tb.reps(seg?.reps ?? 0);
    if (seg?.weightKg === undefined) return target;
    const division = t.divisionShort[config.division];
    const weight = tb.weight(seg.weightCount, formatWeight(seg.weightKg, unit));
    return `${target} · ${weight}${division ? ` (${division})` : ''}`;
  };

  const done = items.slice(0, segment).map((p, k) => {
    const set = p.done[0];
    const duration = set?.durationS ?? 0;
    const lastK = lastDurations[k];
    return { p, duration, delta: lastK != null ? duration - lastK : null };
  });
  const undo = canUndo(run, now) ? done[done.length - 1] : undefined;
  const next = items[segment + 1];

  const label = transition
    ? t.arrived
    : current?.item.segment?.kind === 'station'
      ? t.stationDone
      : t.runDone;

  return (
    <View className="flex-1 gap-3 px-screen pt-3">
      <View className="flex-row gap-[3px]">
        {items.map((p, k) => {
          const isRun = p.item.segment?.kind === 'run';
          return (
            <View key={p.order} className="h-1.5 flex-1 overflow-hidden rounded-[2px] bg-line">
              {k < segment ? (
                <View className={cn('h-full w-full', isRun ? 'bg-volt' : 'bg-muted')} />
              ) : k === segment ? (
                <View className={cn('h-full w-1/2', isRun ? 'bg-volt' : 'bg-muted')} />
              ) : null}
            </View>
          );
        })}
      </View>
      <View className="-mt-1 flex-row gap-3.5">
        {[
          [t.legendRun, 'bg-volt'],
          [t.legendStation, 'bg-muted'],
        ].map(([text, color]) => (
          <View key={text} className="flex-row items-center gap-1.5">
            <View className={cn('h-1.5 w-2.5 rounded-[2px]', color)} />
            <Text className="font-body text-12 text-muted">{text}</Text>
          </View>
        ))}
      </View>

      {current ? (
        <View className="mt-1 items-center gap-1 rounded-[22px] bg-surface p-[18px]">
          <Text className="font-body-bold text-12 uppercase tracking-overline text-muted">
            {transition
              ? t.transition
              : current.item.segment?.kind === 'station'
                ? t.stationOf(current.item.segment.round, stations)
                : t.runOf(current.item.segment?.round ?? 1, stations)}
          </Text>
          <Text className="text-center font-display text-40 uppercase text-text">
            {transition ? t.toStation(nameOf(current)) : nameOf(current)}
          </Text>
          <Text className="font-body text-15 text-muted">{detail(current)}</Text>
          <Text
            className="mt-2 font-display text-96 text-text"
            accessibilityLabel={formatClock(elapsedS)}
          >
            {formatClock(elapsedS)}
          </Text>
          {lastS !== null && deltaS !== null ? (
            <View className="mt-1 flex-row gap-2">
              <View className="h-[30px] justify-center rounded-sm bg-bg px-2.5">
                <Text className="font-body text-13 text-muted">{t.last(formatClock(lastS))}</Text>
              </View>
              <View
                className={cn(
                  'h-[30px] justify-center rounded-sm px-2.5',
                  deltaS <= 0 ? 'bg-volt-soft' : 'bg-bg',
                )}
              >
                <Text className={cn('font-body-bold text-13', deltaTone(deltaS))}>
                  {deltaS === 0
                    ? t.even
                    : deltaS < 0
                      ? t.ahead(formatDelta(deltaS, formatClock))
                      : t.behind(formatDelta(deltaS, formatClock))}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {done.length > 0 ? (
        <Text className="font-body-bold text-12 uppercase tracking-wide text-muted">
          {t.splits}
        </Text>
      ) : null}
      <ScrollView className="-mt-1 flex-1" contentContainerClassName="gap-1">
        {done.map(({ p, duration, delta }) => (
          <View
            key={p.order}
            className="h-[34px] flex-row items-center gap-2 rounded-button bg-surface px-2.5"
          >
            <Text className="flex-1 font-body text-14 text-text">{nameOf(p)}</Text>
            <Text className="font-body-bold text-14 text-text">{formatClock(duration)}</Text>
            <Text
              className={cn(
                'w-16 text-right font-body-semibold text-14',
                delta === null ? 'text-muted' : deltaTone(delta),
              )}
            >
              {delta === null ? '' : formatDelta(delta, formatClock)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className="gap-2 pb-2">
        {undo ? (
          <View className="h-11 flex-row items-center justify-between rounded-input bg-surface2 pl-3.5">
            <Text className="font-body-semibold text-14 text-text">
              {t.recorded(nameOf(undo.p), formatClock(undo.duration))}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={workout.undoHyrox}
              className="h-11 justify-center px-3.5 active:opacity-70"
            >
              <Text className="font-body-bold text-14 text-volt">{t.undo}</Text>
            </Pressable>
          </View>
        ) : next && !transition ? (
          <Text className="text-center font-body text-13 text-muted">
            {t.nextLabel(`${nameOf(next)} · ${detail(next)}`)}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => workout.tapHyrox()}
          className="h-[72px] flex-row items-center justify-center gap-2.5 rounded-card bg-volt active:opacity-90"
        >
          <Text className="font-display text-26 uppercase text-onVolt">{label}</Text>
          <ArrowRight size={24} color={colors.onVolt} strokeWidth={2.6} />
        </Pressable>
      </View>
    </View>
  );
}
