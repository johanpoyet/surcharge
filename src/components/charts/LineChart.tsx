import { Circle, useFont } from '@shopify/react-native-skia';
import { View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import { colors } from '@/theme/tokens';

// Police des axes : Barlow 500 (la même que l'interface).
const AXIS_FONT = require('@expo-google-fonts/barlow/500Medium/Barlow_500Medium.ttf');

export type ChartPoint = {
  x: number;
  y: number;
  /** Point mis en avant : cercle vide (record). */
  highlight?: boolean;
};

type LineChartProps = {
  data: readonly ChartPoint[];
  height?: number;
  /** Graduations de l'axe vertical (texte) ; masquées si absent. */
  formatY?: (value: number) => string;
  yTickCount?: number;
  accessibilityLabel: string;
};

/** Courbe volt sur fond sombre (progression, poids corporel). */
export function LineChart({
  data,
  height = 160,
  formatY,
  yTickCount = 4,
  accessibilityLabel,
}: LineChartProps) {
  const font = useFont(AXIS_FONT, 11);
  const rows = data.map((point) => ({ x: point.x, y: point.y }));

  return (
    <View
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <CartesianChart
        data={rows}
        xKey="x"
        yKeys={['y']}
        domainPadding={{ top: 14, bottom: 14, left: 10, right: 10 }}
        frame={{ lineWidth: 0 }}
        xAxis={{ font: null, lineWidth: 0, tickCount: 0 }}
        yAxis={[
          {
            font: formatY ? font : null,
            tickCount: yTickCount,
            labelColor: colors.muted,
            lineColor: colors.line,
            lineWidth: formatY ? 1 : 0,
            formatYLabel: (value: number) => (formatY ? formatY(value) : ''),
          },
        ]}
      >
        {({ points }) => (
          <>
            <Line points={points.y} color={colors.volt} strokeWidth={2.5} curveType="linear" />
            {points.y.map((point, index) =>
              point.y === null || point.y === undefined ? null : data[index]?.highlight ? (
                <Circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={6}
                  color={colors.volt}
                  style="stroke"
                  strokeWidth={2.5}
                />
              ) : (
                <Circle key={index} cx={point.x} cy={point.y} r={3.5} color={colors.volt} />
              ),
            )}
          </>
        )}
      </CartesianChart>
    </View>
  );
}
