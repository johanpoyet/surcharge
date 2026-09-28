import { Text, View, type TextProps } from 'react-native';

import { cn } from '@/lib/cn';

type DisplaySize = 60 | 56 | 48 | 40 | 34 | 32 | 30 | 26 | 24 | 22 | 20;

// Classes littérales pour que Tailwind les détecte.
const displaySizes: Record<DisplaySize, string> = {
  60: 'text-60',
  56: 'text-56',
  48: 'text-48',
  40: 'text-40',
  34: 'text-34',
  32: 'text-32',
  30: 'text-30',
  26: 'text-26',
  24: 'text-24',
  22: 'text-22',
  20: 'text-20',
};

type HeadingProps = TextProps & {
  size?: DisplaySize;
  uppercase?: boolean;
  className?: string;
};

/** Titre ou chiffre clé en Barlow Condensed ExtraBold Italic. */
export function Heading({ size = 34, uppercase = true, className, ...props }: HeadingProps) {
  return (
    <Text
      accessibilityRole="header"
      className={cn(
        'font-display text-text',
        displaySizes[size],
        uppercase && 'uppercase',
        className,
      )}
      {...props}
    />
  );
}

type StackedLine = { text: string; accent?: boolean };

type StackedTitleProps = {
  lines: readonly StackedLine[];
  size?: DisplaySize;
  className?: string;
};

// Resserrement des lignes (≈ line-height 0,92 des maquettes). Sur iOS, un lineHeight plus petit
// que la police rogne les accents des majuscules (« SOULÈVE ») : on empile donc une ligne par
// Text, sans lineHeight, et on les rapproche avec une marge négative.
const TIGHTEN_RATIO = 0.2;

/** Grand titre sur plusieurs lignes serrées, dernière ligne souvent en volt. */
export function StackedTitle({ lines, size = 60, className }: StackedTitleProps) {
  const overlap = -Math.round(size * TIGHTEN_RATIO);
  return (
    <View accessible accessibilityRole="header" className={className}>
      {lines.map((line, index) => (
        <Text
          key={`${line.text}-${index}`}
          className={cn(
            'font-display uppercase',
            displaySizes[size],
            line.accent ? 'text-volt' : 'text-text',
          )}
          style={index > 0 ? { marginTop: overlap } : undefined}
        >
          {line.text}
        </Text>
      ))}
    </View>
  );
}

type OverlineProps = TextProps & { className?: string };

/** Sur-titre : Barlow 700, 12-13 px, majuscules, espacé, muted. */
export function Overline({ className, ...props }: OverlineProps) {
  return (
    <Text
      className={cn('font-body-bold text-12 uppercase tracking-overline text-muted', className)}
      {...props}
    />
  );
}
