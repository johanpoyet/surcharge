import { Text, View } from 'react-native';

import { Card, DifficultyBadge } from '@/components/ui';
import { DIFFICULTIES } from '@/features/workout/difficulty';
import type { Advice } from '@/features/workout/logic';
import type { DifficultyCounts } from '@/features/stats/series';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';

const t = fr.exercises.detail;

const barClasses = {
  easy: 'bg-diffEasy',
  medium: 'bg-diffMedium',
  hard: 'bg-diffHard',
  fail: 'bg-diffFail',
} as const;

type FeelingCardProps = {
  weightLabel: string;
  counts: DifficultyCounts;
  rated: number;
  total: number;
  advice: Advice | null;
  /** Charges formatées : conseil et charge suivante (charge + pas). */
  adviceWeightLabel: string;
  nextWeightLabel: string;
};

/** « Ressenti à X kg » : répartition des ressentis et conseil de charge (SPEC 9.3). */
export function FeelingCard({
  weightLabel,
  counts,
  rated,
  total,
  advice,
  adviceWeightLabel,
  nextWeightLabel,
}: FeelingCardProps) {
  const adviceText = !advice
    ? null
    : advice.kind === 'increase'
      ? fr.workout.advice.increase(adviceWeightLabel)
      : advice.kind === 'decrease'
        ? fr.workout.advice.decrease(adviceWeightLabel)
        : t.adviceKeep(weightLabel, nextWeightLabel);

  return (
    <Card className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-body-bold text-18 text-text">{t.feeling(weightLabel)}</Text>
        <Text className="font-body text-13 text-muted">{t.feelingSets(total)}</Text>
      </View>
      {rated === 0 ? (
        <Text className="font-body text-14 text-muted">{t.feelingNone}</Text>
      ) : (
        <>
          <View
            className="h-3 flex-row gap-0.5 overflow-hidden rounded-full"
            accessibilityElementsHidden
          >
            {DIFFICULTIES.filter((d) => counts[d] > 0).map((d) => (
              <View key={d} className={cn('h-3', barClasses[d])} style={{ flex: counts[d] }} />
            ))}
          </View>
          <View className="flex-row gap-3">
            {DIFFICULTIES.map((d) => (
              <View key={d} className="flex-row items-center gap-1.5">
                <DifficultyBadge difficulty={d} size="sm" />
                <Text className="font-body-semibold text-13 text-text">{counts[d]}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      {adviceText ? (
        <View className="rounded-input border border-volt-border bg-volt-subtle px-3 py-2.5">
          <Text className="font-body text-14 leading-[19px] text-text">{adviceText}</Text>
        </View>
      ) : null}
    </Card>
  );
}
