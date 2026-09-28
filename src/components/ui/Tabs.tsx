import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import type { SegmentOption } from './SegmentedControl';

type TabsProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** Onglets soulignés (Planning | Mes séances). */
export function Tabs<T extends string>({ options, value, onChange, className }: TabsProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      className={cn('flex-row gap-[22px] border-b border-surface2', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              '-mb-px h-10 justify-center border-b-2',
              selected ? 'border-volt' : 'border-transparent',
            )}
          >
            <Text
              className={cn(
                'text-16',
                selected ? 'font-body-bold text-text' : 'font-body-semibold text-muted',
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
