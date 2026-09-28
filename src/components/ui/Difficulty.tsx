import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import { DIFFICULTIES, type Difficulty } from '@/features/workout/difficulty';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';

// Classes littérales par ressenti (Tailwind doit les voir en entier).
const fillClasses: Record<Difficulty, string> = {
  easy: 'bg-diffEasy',
  medium: 'bg-diffMedium',
  hard: 'bg-diffHard',
  fail: 'bg-diffFail',
};

type BadgeProps = {
  difficulty: Difficulty;
  size?: 'md' | 'sm';
  className?: string;
};

/** Carré avec la lettre du ressenti : jamais la couleur seule (SPEC section 4). */
export function DifficultyBadge({ difficulty, size = 'md', className }: BadgeProps) {
  return (
    <View
      accessible
      accessibilityLabel={fr.difficulty.a11y(fr.difficulty[difficulty])}
      className={cn(
        'items-center justify-center',
        size === 'md' ? 'h-7 w-7 rounded-badge' : 'h-[22px] w-[22px] rounded-tag',
        fillClasses[difficulty],
        className,
      )}
    >
      <Text className={cn('font-body-bold text-onVolt', size === 'md' ? 'text-13' : 'text-11')}>
        {fr.difficulty.letters[difficulty]}
      </Text>
    </View>
  );
}

type PickerProps = {
  value: Difficulty | null;
  /** Le ressenti est optionnel : toucher le choix actif le désélectionne (`null`). */
  onChange: (value: Difficulty | null) => void;
  className?: string;
};

/** 4 boutons Facile / Moyen / Difficile / Échec ; le choix actif est rempli de sa couleur. */
export function DifficultyPicker({ value, onChange, className }: PickerProps) {
  const select = (difficulty: Difficulty) => {
    const next = difficulty === value ? null : difficulty;
    onChange(next);
    if (next === 'fail') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      void Haptics.selectionAsync();
    }
  };

  return (
    <View accessibilityRole="radiogroup" className={cn('flex-row gap-1.5', className)}>
      {DIFFICULTIES.map((difficulty) => {
        const selected = difficulty === value;
        return (
          <Pressable
            key={difficulty}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => select(difficulty)}
            className={cn(
              'h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-button active:opacity-80',
              selected ? fillClasses[difficulty] : 'border border-line bg-bg',
            )}
          >
            {selected ? null : (
              <View className={cn('h-2 w-2 rounded-[2px]', fillClasses[difficulty])} />
            )}
            <Text
              className={cn(
                'text-14',
                selected ? 'font-body-bold text-onVolt' : 'font-body-semibold text-text',
              )}
            >
              {fr.difficulty[difficulty]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
