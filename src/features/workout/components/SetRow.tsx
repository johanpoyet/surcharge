import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { DifficultyBadge } from '@/components/ui';
import type { SessionSet } from '@/db/schema';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';

const t = fr.workout;

/** Largeurs des colonnes Série | Précédent | Kg | Reps | Ressenti (maquette). */
export const columnClasses = {
  set: 'w-9',
  previous: 'flex-1',
  weight: 'w-16',
  reps: 'w-[52px]',
  difficulty: 'w-10 items-end',
};

type SetRowProps = {
  set: SessionSet;
  previousLabel: string;
  weightLabel: string;
  editing: boolean;
  onPress: () => void;
  onDelete: () => void;
};

/** Série validée : ligne compacte ; toucher = modifier, glisser vers la gauche = supprimer. */
export function SetRow({
  set,
  previousLabel,
  weightLabel,
  editing,
  onPress,
  onDelete,
}: SetRowProps) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.deleteSetA11y(set.setNumber)}
          onPress={onDelete}
          className="ml-1.5 h-[42px] justify-center rounded-input bg-diffFail px-4"
        >
          <Text className="font-body-bold text-14 text-onVolt">{t.deleteSet}</Text>
        </Pressable>
      )}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.editSetA11y(set.setNumber)}
        accessibilityHint={`${weightLabel} × ${set.reps}`}
        onPress={onPress}
        className={cn(
          'h-[42px] flex-row items-center gap-2 rounded-input bg-surface px-2.5 active:opacity-80',
          editing && 'border border-volt',
        )}
      >
        <Text className={cn(columnClasses.set, 'font-body-bold text-16 text-text')}>
          {set.setNumber}
        </Text>
        <Text className={cn(columnClasses.previous, 'font-body text-16 text-muted')}>
          {previousLabel}
        </Text>
        <Text className={cn(columnClasses.weight, 'font-body-bold text-16 text-text')}>
          {weightLabel}
        </Text>
        <Text className={cn(columnClasses.reps, 'font-body-bold text-16 text-text')}>
          {set.reps}
        </Text>
        <View className={columnClasses.difficulty}>
          {set.difficulty ? <DifficultyBadge difficulty={set.difficulty} /> : null}
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
