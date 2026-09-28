import { View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';

import { cn } from '@/lib/cn';

import { colors } from '@/theme/tokens';

// Les 3 barres inclinées croissantes du logo (SPEC section 4, viewBox 48×48).
function Bars({ fill }: { fill: string }) {
  return (
    <G transform="skewX(-12) translate(8 0)" fill={fill}>
      <Rect x={8} y={25} width={7} height={13} rx={2} />
      <Rect x={18} y={18} width={7} height={20} rx={2} />
      <Rect x={28} y={10} width={7} height={28} rx={2} />
    </G>
  );
}

/** Logo carré volt. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Rect width={48} height={48} rx={12} fill={colors.volt} />
      <Bars fill={colors.onVolt} />
    </Svg>
  );
}

type WatermarkProps = {
  size?: number;
  fill?: string;
  className?: string;
};

/** Motif de marque en grand filigrane, positionné en absolu via `className` (ex. `-right-[120px] top-10`). */
export function BrandWatermark({ size = 340, fill = colors.surface, className }: WatermarkProps) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('absolute', className)}
    >
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Bars fill={fill} />
      </Svg>
    </View>
  );
}
