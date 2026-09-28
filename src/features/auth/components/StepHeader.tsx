import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { View } from 'react-native';

import { IconButton, Overline, ProgressSegments } from '@/components/ui';
import { fr } from '@/i18n/fr';

type StepHeaderProps = {
  step: number;
  total: number;
  onBack?: () => void;
};

/** Retour + « Étape N / T » + barre segmentée (inscription). */
export function StepHeader({ step, total, onBack }: StepHeaderProps) {
  return (
    <View className="flex-row items-center gap-3.5">
      <IconButton
        icon={ChevronLeft}
        accessibilityLabel={fr.common.back}
        onPress={onBack ?? (() => router.back())}
      />
      <View className="flex-1 gap-1.5">
        <Overline>{fr.common.step(step, total)}</Overline>
        <ProgressSegments count={total} progress={step} />
      </View>
    </View>
  );
}
