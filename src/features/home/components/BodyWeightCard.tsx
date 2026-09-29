import { Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Card } from '@/components/ui';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { formatNumber, formatWeight } from '@/lib/format';
import { fromKg } from '@/lib/units';
import { colors } from '@/theme/tokens';
import type { BodyWeightSummary } from '../summary';

const WIDTH = 130;
const HEIGHT = 44;
const PAD = 4;

function Sparkline({ points }: { points: readonly number[] }) {
  const low = Math.min(...points);
  const high = Math.max(...points);
  const coords = points.map((value, i) => {
    const x = PAD + (i / Math.max(1, points.length - 1)) * (WIDTH - PAD * 2);
    const y =
      high === low ? HEIGHT / 2 : PAD + (1 - (value - low) / (high - low)) * (HEIGHT - PAD * 2);
    return [x, y] as const;
  });
  const last = coords[coords.length - 1]!;
  return (
    <Svg width={WIDTH} height={HEIGHT} accessibilityElementsHidden>
      <Polyline
        points={coords.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke={colors.volt}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={last[0]} cy={last[1]} r={3.5} fill={colors.volt} />
    </Svg>
  );
}

/** Dernière pesée, variation sur le mois, courbe. */
export function BodyWeightCard({
  summary,
  unit,
}: {
  summary: BodyWeightSummary;
  unit: WeightUnit;
}) {
  const delta = summary.deltaKg;
  const deltaLabel =
    delta === null
      ? null
      : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${formatNumber(Math.abs(fromKg(delta, unit)))} ${fr.units[unit]}`;
  return (
    <Card className="flex-row items-center gap-3">
      <View className="flex-1">
        <Text className="font-body text-13 text-muted">{fr.home.bodyWeight.title}</Text>
        <Text className="font-display text-30 text-text">
          {formatWeight(summary.latestKg, unit)}
        </Text>
        {deltaLabel ? (
          <Text className="font-body-semibold text-13 text-volt">
            {fr.home.bodyWeight.change(deltaLabel)}
          </Text>
        ) : null}
      </View>
      {summary.pointsKg.length > 1 ? <Sparkline points={summary.pointsKg} /> : null}
    </Card>
  );
}
