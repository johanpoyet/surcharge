import { Image } from 'expo-image';
import { Dumbbell } from 'lucide-react-native';
import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

/** Vignette 52×52 : photo de la machine, sinon pictogramme. */
export function ExerciseThumb({ uri, className }: { uri: string | null; className?: string }) {
  return (
    <View
      className={cn(
        'h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-input bg-surface2',
        className,
      )}
    >
      {uri ? (
        <Image source={{ uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
      ) : (
        <Dumbbell size={20} color={colors.faint} strokeWidth={2} />
      )}
    </View>
  );
}
