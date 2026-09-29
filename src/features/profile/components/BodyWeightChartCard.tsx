import { format, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { LineChart } from '@/components/charts/LineChart';
import { Button, Card, SegmentedControl } from '@/components/ui';
import type { BodyWeight } from '@/db/schema';
import { weightsInPeriod, type Period } from '@/features/stats/series';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { formatNumber, formatWeight } from '@/lib/format';
import { fromKg } from '@/lib/units';

const t = fr.profile.bodyWeight;
const PERIODS = (['1M', '3M', '1A'] as const).map((value) => ({ value, label: t.periods[value] }));
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Poids corporel : dernière pesée, variation sur la période, courbe, ajout d'une pesée. */
export function BodyWeightChartCard({
  weights,
  unit,
}: {
  weights: BodyWeight[];
  unit: WeightUnit;
}) {
  const [period, setPeriod] = useState<Period>('3M');
  const { points, deltaKg } = weightsInPeriod(weights, period, new Date());
  const latest = weights[weights.length - 1];
  const first = points[0];
  const last = points[points.length - 1];
  const middle = points[Math.floor(points.length / 2)];
  const month = (iso: string) => capitalize(format(parseISO(iso), 'MMM', { locale: frLocale }));
  const delta =
    deltaKg === null
      ? null
      : `${deltaKg > 0 ? '+' : deltaKg < 0 ? '−' : ''}${formatNumber(Math.abs(fromKg(deltaKg, unit)))} ${fr.units[unit]}`;

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-body-bold text-18 text-text">{t.title}</Text>
        <SegmentedControl size="sm" options={PERIODS} value={period} onChange={setPeriod} />
      </View>
      {latest ? (
        <View className="flex-row items-baseline gap-2.5">
          <Text className="font-display text-40 text-text">
            {formatWeight(latest.weightKg, unit)}
          </Text>
          {delta ? (
            <Text className="font-body-semibold text-14 text-volt">
              {t.change(delta, t.periodLabels[period])}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text className="font-body text-14 text-muted">{t.empty}</Text>
      )}
      {points.length > 1 && first && last && middle ? (
        <>
          <LineChart
            height={110}
            data={points.map((w, i) => ({
              x: i,
              y: fromKg(w.weightKg, unit),
              highlight: i === points.length - 1,
            }))}
            accessibilityLabel={t.chart}
          />
          <View className="-mt-1.5 flex-row justify-between">
            <Text className="font-body text-12 text-muted">{month(first.measuredOn)}</Text>
            <Text className="font-body text-12 text-muted">{month(middle.measuredOn)}</Text>
            <Text className="font-body text-12 text-muted">{month(last.measuredOn)}</Text>
          </View>
        </>
      ) : null}
      <Button
        label={t.add}
        variant="outline"
        size="md"
        onPress={() => router.push('/body-weight')}
      />
    </Card>
  );
}
