import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';
import { BrandWatermark } from './Logo';
import { onVoltAlpha } from '@/theme/tokens';

type CardProps = ViewProps & {
  /** `hero` : grande carte volt (« Séance du jour »). */
  variant?: 'default' | 'hero';
  /** Motif de marque en filigrane dans le coin. */
  watermark?: boolean;
  className?: string;
};

export function Card({
  variant = 'default',
  watermark = false,
  className,
  children,
  ...props
}: CardProps) {
  const hero = variant === 'hero';
  return (
    <View
      className={cn(
        'overflow-hidden',
        hero ? 'rounded-hero bg-volt p-5' : 'rounded-card bg-surface p-4',
        className,
      )}
      {...props}
    >
      {watermark ? (
        <BrandWatermark
          size={190}
          fill={hero ? onVoltAlpha.watermark : undefined}
          className="-right-[30px] -top-2.5"
        />
      ) : null}
      {children}
    </View>
  );
}
