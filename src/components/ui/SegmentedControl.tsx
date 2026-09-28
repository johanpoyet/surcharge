import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';

export type SegmentOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `md` : Sem./Mois (sur fond d'écran) ; `sm` : 1M/3M/1A, Charge/Volume/Reps (dans une carte). */
  size?: 'md' | 'sm';
  className?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const medium = size === 'md';
  return (
    <View
      accessibilityRole="tablist"
      className={cn(
        'flex-row p-[3px]',
        medium ? 'rounded-button bg-surface' : 'rounded-[9px] bg-bg',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            hitSlop={{ top: 8, bottom: 8 }}
            className={cn(
              'items-center justify-center',
              medium ? 'h-[30px] rounded-sm px-3' : 'h-7 rounded-badge px-2.5',
              selected && 'bg-volt',
            )}
          >
            <Text
              className={cn(
                medium ? 'text-13' : 'text-12',
                selected ? 'font-body-bold text-onVolt' : 'font-body-semibold text-muted',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
