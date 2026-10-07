import { format, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import type { TrackingType } from '@/db/schema';
import { formatSet, type TrackedSet } from '@/features/exercises/tracking';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { cn } from '@/lib/cn';
import { formatWeight } from '@/lib/format';
import { colors } from '@/theme/tokens';

const t = fr.profile.records;
const PREVIEW = 3;

export type RecordItem = TrackedSet & {
  id: string;
  exerciseName: string;
  completedAt: string;
  trackingType: TrackingType | null;
};

/** Records personnels (le plus récent d'abord), « Tout voir » déplie la liste. */
export function RecordsCard({ records, unit }: { records: RecordItem[]; unit: WeightUnit }) {
  const [all, setAll] = useState(false);
  const visible = all ? records : records.slice(0, PREVIEW);
  return (
    <Card className="gap-1">
      <View className="mb-1.5 flex-row items-baseline justify-between">
        <Text className="font-body-bold text-18 text-text">{t.title}</Text>
        {records.length > PREVIEW ? (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setAll((v) => !v)}>
            <Text className="font-body-semibold text-14 text-volt">{all ? t.less : t.all}</Text>
          </Pressable>
        ) : null}
      </View>
      {records.length === 0 ? (
        <Text className="font-body text-14 text-muted">{t.empty}</Text>
      ) : (
        visible.map((record, index) => (
          <View
            key={record.id}
            className={cn(
              'h-14 flex-row items-center gap-3',
              index < visible.length - 1 && 'border-b border-surface2',
            )}
          >
            <View className="h-9 w-9 items-center justify-center rounded-button bg-volt-soft">
              <Trophy size={18} color={colors.volt} strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="font-body-bold text-15 text-text">
                {record.exerciseName}
              </Text>
              <Text className="font-body text-13 text-muted">
                {format(parseISO(record.completedAt), 'd MMM', { locale: frLocale })}
              </Text>
            </View>
            <Text className="font-display text-22 text-volt">
              {record.trackingType && record.trackingType !== 'weight_reps'
                ? formatSet(record.trackingType, record, unit)
                : t.value(formatWeight(record.weightKg, unit), record.reps)}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}
