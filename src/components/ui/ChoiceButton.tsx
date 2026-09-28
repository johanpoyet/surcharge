import { Pressable, Text } from 'react-native';

import { cn } from '@/lib/cn';

type ChoiceButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Chiffre en police condensée (séances par semaine). */
  display?: boolean;
  accessibilityLabel?: string;
  className?: string;
};

/** Grand bouton de choix (objectif, séances par semaine) ; le choix actif est en volt. */
export function ChoiceButton({
  label,
  selected,
  onPress,
  display = false,
  accessibilityLabel,
  className,
}: ChoiceButtonProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={cn(
        'items-center justify-center rounded-input active:opacity-80',
        display ? 'h-12' : 'h-[52px] px-2',
        selected ? 'bg-volt' : 'border border-line bg-surface',
        className,
      )}
    >
      <Text
        className={cn(
          display
            ? 'font-display text-22'
            : cn('text-15', selected ? 'font-body-bold' : 'font-body-semibold'),
          selected ? 'text-onVolt' : 'text-text',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
