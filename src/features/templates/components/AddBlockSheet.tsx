import { Dumbbell, Flame, Footprints, RotateCw, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Sheet } from '@/components/ui';
import type { BlockType } from '@/db/schema';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { colors, iconSizes } from '@/theme/tokens';

const t = fr.templates.blocks;

// Ordre de la maquette ajouter-bloc, plus l'échauffement (absent de la maquette) en premier.
const OPTIONS: readonly { type: BlockType; icon: LucideIcon | null }[] = [
  { type: 'warmup', icon: Flame },
  { type: 'strength', icon: Dumbbell },
  { type: 'cardio', icon: Footprints },
  { type: 'circuit', icon: RotateCw },
  { type: 'hyrox', icon: null },
];

type AddBlockSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (type: BlockType) => void;
};

/** Feuille « Ajouter un bloc » (maquette ajouter-bloc). */
export function AddBlockSheet({ visible, onClose, onAdd }: AddBlockSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} closeLabel={t.cancel}>
      <Text className="mt-1.5 font-display text-28 uppercase text-text">{t.sheetTitle}</Text>
      <Text className="-mt-1.5 font-body text-14 text-muted">{t.sheetHint}</Text>
      {OPTIONS.map(({ type, icon: Icon }) => {
        const hyrox = type === 'hyrox';
        return (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`${t.options[type].title}, ${t.options[type].hint}`}
            onPress={() => onAdd(type)}
            className="min-h-[76px] flex-row items-center gap-3 rounded-tile border border-line bg-bg p-3 active:border-volt active:bg-volt-subtle"
          >
            <View
              className={cn(
                'h-12 w-12 items-center justify-center rounded-input',
                hyrox ? 'bg-volt' : 'bg-surface2',
              )}
            >
              {Icon ? (
                <Icon size={iconSizes.lg} color={colors.volt} strokeWidth={2} />
              ) : (
                <Text className="font-display text-15 text-onVolt">HRX</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="font-body-bold text-16 text-text">{t.options[type].title}</Text>
              <Text className="font-body text-13 text-muted">{t.options[type].hint}</Text>
            </View>
          </Pressable>
        );
      })}
    </Sheet>
  );
}
