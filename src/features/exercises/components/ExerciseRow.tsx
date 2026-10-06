import { Pressable, Text, View } from 'react-native';

import type { Exercise } from '@/db/schema';
import type { Trend } from '@/features/stats/calc';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { cn } from '@/lib/cn';
import { formatRelativeDay } from '@/lib/dates';
import { formatWeight } from '@/lib/format';
import { typedSummary, type ExerciseSummary } from '../summary';
import { formatMetric, type TrackingMetric, type ValueTrend } from '../tracking';
import { ExerciseThumb } from './ExerciseThumb';

const t = fr.exercises;

function trendLabel(trend: Trend, unit: WeightUnit): { text: string; className: string } {
  switch (trend.kind) {
    case 'record':
      return { text: t.trend.record, className: 'font-body-bold text-volt' };
    case 'up':
      return {
        text: t.trend.up(formatWeight(trend.deltaKg, unit)),
        className: 'font-body-bold text-volt',
      };
    case 'same':
      return { text: t.trend.same, className: 'font-body-semibold text-muted' };
    case 'down':
      return {
        text: t.trend.down(formatWeight(trend.deltaKg, unit)),
        className: 'font-body-bold text-diffHard',
      };
  }
}

/** Tendance d'un exercice non « charge × reps » : ↑ = progrès (temps qui baisse, reps qui montent…). */
function valueTrendLabel(
  trend: ValueTrend,
  metric: TrackingMetric,
  unit: WeightUnit,
): { text: string; className: string } {
  switch (trend.kind) {
    case 'record':
      return { text: t.trend.record, className: 'font-body-bold text-volt' };
    case 'better':
      return {
        text: t.trend.up(formatMetric(metric, trend.delta, unit)),
        className: 'font-body-bold text-volt',
      };
    case 'same':
      return { text: t.trend.same, className: 'font-body-semibold text-muted' };
    case 'worse':
      return {
        text: t.trend.down(formatMetric(metric, trend.delta, unit)),
        className: 'font-body-bold text-diffHard',
      };
  }
}

type ExerciseRowProps = {
  exercise: Exercise;
  summary: ExerciseSummary | undefined;
  unit: WeightUnit;
  onPress: () => void;
};

/** Ligne de la bibliothèque : photo, nom, muscle · date, charge max et tendance. */
export function ExerciseRow({ exercise, summary, unit, onPress }: ExerciseRowProps) {
  const subtitle = [
    t.muscles[exercise.muscle],
    summary ? formatRelativeDay(summary.lastUsedAt) : t.equipment[exercise.equipment],
  ].join(' · ');

  let maxLabel: string | null = null;
  let trend: { text: string; className: string } | null = null;
  if (exercise.trackingType === 'weight_reps') {
    // Au poids du corps, la charge est le lest : « +10 kg ».
    const max = summary?.lastMaxKg;
    const bodyweight = exercise.equipment === 'bodyweight';
    maxLabel =
      max === undefined || max === null || (bodyweight && max === 0)
        ? null
        : `${bodyweight ? '+' : ''}${formatWeight(max, unit)}`;
    trend = summary?.trend ? trendLabel(summary.trend, unit) : null;
  } else if (summary) {
    const typed = typedSummary(exercise.trackingType, summary);
    if (typed) {
      maxLabel = formatMetric(typed.metric, typed.value, unit);
      trend = typed.trend ? valueTrendLabel(typed.trend, typed.metric, unit) : null;
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[exercise.name, subtitle, maxLabel, trend?.text]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      className="h-[72px] flex-row items-center gap-3 rounded-tile bg-surface pl-2.5 pr-3.5 active:opacity-80"
    >
      <ExerciseThumb uri={exercise.photoLocalUri} />
      <View className="flex-1">
        <Text numberOfLines={1} className="font-body-bold text-16 text-text">
          {exercise.name}
        </Text>
        <Text numberOfLines={1} className="font-body text-13 text-muted">
          {subtitle}
        </Text>
      </View>
      {maxLabel ? (
        <View className="items-end">
          <Text className="font-display text-22 text-text">{maxLabel}</Text>
          {trend ? <Text className={cn('text-12', trend.className)}>{trend.text}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
