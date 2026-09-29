import { Pressable, Text, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';

type WeekdayPickerProps = {
  /** Jours sélectionnés (1 = lundi … 7 = dimanche). */
  value: readonly number[];
  onToggle: (weekday: number) => void;
};

/** 7 boutons L M M J V S D (jours au planning). */
export function WeekdayPicker({ value, onToggle }: WeekdayPickerProps) {
  return (
    <View className="flex-row gap-1.5">
      {fr.weekdays.letters.map((letter, index) => {
        const weekday = index + 1;
        const selected = value.includes(weekday);
        return (
          <Pressable
            key={weekday}
            accessibilityRole="checkbox"
            accessibilityLabel={fr.weekdays.long[index]}
            accessibilityState={{ checked: selected }}
            onPress={() => onToggle(weekday)}
            className={cn(
              'h-11 flex-1 items-center justify-center rounded-button active:opacity-80',
              selected ? 'bg-volt' : 'border border-line bg-surface',
            )}
          >
            <Text
              className={cn(
                'text-15',
                selected ? 'font-body-bold text-onVolt' : 'font-body-semibold text-muted',
              )}
            >
              {letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
