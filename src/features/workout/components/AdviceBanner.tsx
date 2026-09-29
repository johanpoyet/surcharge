import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { colors } from '@/theme/tokens';
import type { Advice } from '../logic';

/** Bandeau de conseil (SPEC 9.3) : seulement pour augmenter ou baisser la charge. */
export function AdviceBanner({ advice, weightLabel }: { advice: Advice; weightLabel: string }) {
  if (advice.kind === 'keep') return null;
  const up = advice.kind === 'increase';
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <View
      accessibilityRole="text"
      className="flex-row items-center gap-2.5 rounded-input border border-volt-border bg-volt-subtle px-3 py-2.5"
    >
      <Icon size={18} color={up ? colors.volt : colors.diffHard} strokeWidth={2.5} />
      <Text className="flex-1 font-body text-14 leading-[19px] text-text">
        {up ? fr.workout.advice.increase(weightLabel) : fr.workout.advice.decrease(weightLabel)}
      </Text>
    </View>
  );
}
