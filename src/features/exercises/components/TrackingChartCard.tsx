import { format, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { LineChart } from '@/components/charts/LineChart';
import { Card, SegmentedControl } from '@/components/ui';
import type { TrackingType } from '@/db/schema';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import {
  formatMetric,
  metricsFor,
  referenceDistance,
  sessionMetric,
  type TrackedSet,
  type TrackingMetric,
} from '../tracking';

const t = fr.exercises.detail;

type ChartSession = { startedAt: string; sets: readonly TrackedSet[] };

const captionOf = (type: TrackingType, metric: TrackingMetric) =>
  metric === 'reps' && type !== 'weight_reps' ? t.maxRepsCaption : t.metricCaption[metric];

/**
 * Courbe de progression d'un exercice qui n'est pas en « charge × reps » (SPEC_V2 §4.1) :
 * temps, allure et distance pour la course, durée, reps ou calories max… jamais de charge s'il
 * n'y en a pas. Les séances sont données de la plus ancienne à la plus récente.
 */
export function TrackingChartCard({
  type,
  sessions,
  unit,
}: {
  type: TrackingType;
  sessions: readonly ChartSession[];
  unit: WeightUnit;
}) {
  const metrics = metricsFor(type);
  const [metric, setMetric] = useState<TrackingMetric>(metrics[0] ?? 'reps');
  const refDistance = referenceDistance(sessions.flatMap((s) => s.sets));

  const points = sessions.flatMap((session, index) => {
    const value = sessionMetric(type, metric, session.sets, refDistance);
    return value === null ? [] : [{ x: index, y: value, startedAt: session.startedAt }];
  });

  const first = points[0];
  const last = points[points.length - 1];
  const delta = first && last ? last.y - first.y : 0;
  const month = (iso: string) => format(parseISO(iso), 'MMM', { locale: frLocale });
  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  const caption =
    metric === 'time' && refDistance !== null
      ? `${captionOf(type, metric)} (${formatMetric('distance', refDistance, unit)})`
      : captionOf(type, metric);

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-body-bold text-18 text-text">{t.progression}</Text>
        {metrics.length > 1 ? (
          <SegmentedControl
            size="sm"
            options={metrics.map((value) => ({ value, label: t.metrics[value] }))}
            value={metric}
            onChange={setMetric}
          />
        ) : null}
      </View>

      {points.length < 2 || !first || !last ? (
        <Text className="font-body text-14 text-muted">{t.notEnough}</Text>
      ) : (
        <>
          <View className="flex-row items-baseline gap-2.5">
            <Text className="font-display text-30 text-text">
              {`${delta > 0 ? '+' : delta < 0 ? '−' : ''}${formatMetric(metric, Math.abs(delta), unit)}`}
            </Text>
            <Text className="flex-1 font-body text-13 text-muted">
              {`${t.since(month(first.startedAt))} · ${caption}`}
            </Text>
          </View>
          <LineChart
            data={points}
            formatY={(value) => formatMetric(metric, value, unit)}
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
        </>
      )}
    </Card>
  );
}
