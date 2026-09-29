import { View } from 'react-native';

import { cn } from '@/lib/cn';

type ProgressSegmentsProps = {
  count: number;
  /** Nombre de segments remplis, décimales autorisées (2,6 = 2 pleins + 60 % du 3e). */
  progress: number;
  /** Remplissage de chaque segment (0 à 1), prioritaire sur `progress` (séance : 1 par exercice). */
  fills?: readonly number[];
  className?: string;
};

/** Barre segmentée : 1 segment par exercice (séance) ou par étape (inscription). */
export function ProgressSegments({ count, progress, fills, className }: ProgressSegmentsProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: count, now: Math.floor(progress) }}
      className={cn('flex-row gap-1', className)}
    >
      {Array.from({ length: count }, (_, index) => {
        const fill = Math.min(1, Math.max(0, fills ? (fills[index] ?? 0) : progress - index));
        return (
          <View key={index} className="h-1 flex-1 overflow-hidden rounded-[2px] bg-line">
            {fill > 0 ? <View className="h-1 bg-volt" style={{ width: `${fill * 100}%` }} /> : null}
          </View>
        );
      })}
    </View>
  );
}
