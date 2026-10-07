import { View } from 'react-native';

import { ChoiceButton } from '@/components/ui';
import type { Discipline } from '@/db/schema';
import { fr } from '@/i18n/fr';
import { DISCIPLINE_CHOICES } from '../disciplines';

type DisciplinesPickerProps = {
  value: readonly Discipline[];
  onChange: (value: Discipline[]) => void;
};

/** Choix multiple des disciplines (au moins une reste cochée). */
export function DisciplinesPicker({ value, onChange }: DisciplinesPickerProps) {
  const toggle = (discipline: Discipline) => {
    const next = value.includes(discipline)
      ? value.filter((d) => d !== discipline)
      : [...value, discipline];
    if (next.length > 0) onChange(DISCIPLINE_CHOICES.filter((d) => next.includes(d)));
  };
  return (
    <View className="flex-row flex-wrap gap-2">
      {DISCIPLINE_CHOICES.map((discipline) => (
        <ChoiceButton
          key={discipline}
          label={fr.exercises.tracking.disciplines[discipline]}
          selected={value.includes(discipline)}
          onPress={() => toggle(discipline)}
          className="grow basis-[48%]"
        />
      ))}
    </View>
  );
}
