import { Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { cn } from '@/lib/cn';
import { formatWeight } from '@/lib/format';
import type { Progression } from '../summary';

const t = fr.home.progression;
// Hauteur de barre minimale : garde la plus petite charge visible.
const MIN_RATIO = 0.35;

/** Exercice le plus pratiqué : barres des dernières séances (la dernière en volt). */
export function ProgressionCard({
  progression,
  exerciseName,
  unit,
}: {
  progression: Progression;
  exerciseName: string;
  unit: WeightUnit;
}) {
  const { maxes, deltaKg, weeks } = progression;
  const low = Math.min(...maxes);
  const high = Math.max(...maxes);
  const ratio = (value: number) =>
    high === low ? 1 : MIN_RATIO + ((value - low) / (high - low)) * (1 - MIN_RATIO);

  return (
    <Card>
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text className="font-body text-13 text-muted">{t.title}</Text>
          <Text numberOfLines={1} className="font-body-bold text-18 text-text">
            {exerciseName}
          </Text>
        </View>
        {deltaKg > 0 ? (
          <View className="h-7 justify-center rounded-sm bg-volt-soft px-2.5">
            <Text className="font-body-bold text-13 text-volt">
              {t.badge(formatWeight(deltaKg, unit), weeks)}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="mt-3.5 h-24 flex-row items-end gap-2" accessibilityElementsHidden>
        {maxes.map((value, index) => (
          <View
            key={index}
            className={cn(
              'flex-1 rounded-[5px]',
              index === maxes.length - 1 ? 'bg-volt' : 'bg-line',
            )}
            style={{ height: `${ratio(value) * 100}%` }}
          />
        ))}
      </View>
      <View className="mt-2 flex-row justify-between">
        <Text className="font-body text-12 text-muted">{formatWeight(maxes[0]!, unit)}</Text>
        <Text className="font-body text-12 text-muted">
          {formatWeight(maxes[maxes.length - 1]!, unit)}
        </Text>
      </View>
    </Card>
  );
}
