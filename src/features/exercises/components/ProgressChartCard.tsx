import { format, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { LineChart } from '@/components/charts/LineChart';
import { Card, SegmentedControl } from '@/components/ui';
import { metricValue, type ChartMetric, type SessionPoint } from '@/features/stats/series';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { formatNumber, formatThousands } from '@/lib/format';
import { fromKg } from '@/lib/units';
import { colors } from '@/theme/tokens';

const t = fr.exercises.detail;
const METRICS = (['weight', 'volume', 'reps'] as const).map((value) => ({
  value,
  label: t.metrics[value],
}));

/** Courbe de progression du détail exercice : Charge / Volume / Reps, records en cercle vide. */
export function ProgressChartCard({ series, unit }: { series: SessionPoint[]; unit: WeightUnit }) {
  const [metric, setMetric] = useState<ChartMetric>('weight');
  const points = series.flatMap((point, index) => {
    const value = metricValue(point, metric);
    if (value === null) return [];
    const y = metric === 'reps' ? value : fromKg(value, unit);
    return [
      { x: index, y, highlight: point.record && metric === 'weight', startedAt: point.startedAt },
    ];
  });

  const unitLabel = metric === 'reps' ? fr.units.reps : fr.units[unit];
  const show = (value: number) =>
    metric === 'volume' ? formatThousands(value) : formatNumber(value, 1);
  const first = points[0];
  const last = points[points.length - 1];
  const delta = first && last ? last.y - first.y : 0;
  const month = (iso: string) => format(parseISO(iso), 'MMM', { locale: frLocale });
  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-body-bold text-18 text-text">{t.progression}</Text>
        <SegmentedControl size="sm" options={METRICS} value={metric} onChange={setMetric} />
      </View>

      {points.length < 2 || !first || !last ? (
        <Text className="font-body text-14 text-muted">{t.notEnough}</Text>
      ) : (
        <>
          <View className="flex-row items-baseline gap-2.5">
            <Text className="font-display text-30 text-text">
              {`${delta > 0 ? '+' : delta < 0 ? '−' : ''}${show(Math.abs(delta))} ${unitLabel}`}
            </Text>
            <Text className="flex-1 font-body text-13 text-muted">
              {`${t.since(month(first.startedAt))} · ${t.metricCaption[metric]}`}
            </Text>
          </View>
          <LineChart
            data={points}
            formatY={(value) =>
              metric === 'volume' ? formatThousands(value) : formatNumber(value, 0)
            }
            accessibilityLabel={t.chartA11y(t.metrics[metric], points.length)}
          />
          <View className="-mt-1 flex-row justify-between pl-8">
            <Text className="font-body text-12 text-muted">
              {capitalize(month(first.startedAt))}
            </Text>
            <Text className="font-body text-12 text-muted">
              {capitalize(month(last.startedAt))}
            </Text>
          </View>
          {metric === 'weight' ? (
            <View className="flex-row gap-4">
              <View className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-full bg-volt" />
                <Text className="font-body text-12 text-muted">{t.legendSession}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View
                  className="h-2.5 w-2.5 rounded-full border-2 border-volt"
                  style={{ borderColor: colors.volt }}
                />
                <Text className="font-body text-12 text-muted">{t.legendRecord}</Text>
              </View>
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}
