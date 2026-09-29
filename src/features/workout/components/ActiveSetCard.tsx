import { Text, View } from 'react-native';

import { DifficultyPicker, Stepper } from '@/components/ui';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { formatNumber } from '@/lib/format';
import { fromKg } from '@/lib/units';
import type { SetDraft } from '../logic';

const t = fr.workout;

type ActiveSetCardProps = {
  setNumber: number;
  previousLabel: string | null;
  draft: SetDraft;
  weightStepKg: number;
  unit: WeightUnit;
  onChange: (patch: Partial<SetDraft>) => void;
};

/** Série active : charge et reps (Steppers), puis ressenti (facultatif). */
export function ActiveSetCard({
  setNumber,
  previousLabel,
  draft,
  weightStepKg,
  unit,
  onChange,
}: ActiveSetCardProps) {
  const stepLabel = `${formatNumber(fromKg(weightStepKg, unit), 2)} ${fr.units[unit]}`;
  return (
    <View className="gap-2.5 rounded-cta border-[1.5px] border-volt bg-surface p-2.5">
      <View className="flex-row items-center justify-between px-0.5">
        <Text className="font-body-bold text-15 text-volt">{t.setTitle(setNumber)}</Text>
        {previousLabel ? (
          <Text className="font-body text-15 text-muted">{t.previous(previousLabel)}</Text>
        ) : null}
      </View>
      <View className="flex-row gap-2">
        <Stepper
          className="flex-1"
          value={draft.weightKg}
          onChange={(weightKg) => onChange({ weightKg })}
          step={weightStepKg}
          min={0}
          max={500}
          unit={fr.units[unit]}
          format={(kg) => formatNumber(fromKg(kg, unit), 1)}
          decrementLabel={t.decreaseWeight(stepLabel)}
          incrementLabel={t.increaseWeight(stepLabel)}
        />
        <Stepper
          className="flex-1"
          value={draft.reps}
          onChange={(reps) => onChange({ reps })}
          step={1}
          min={0}
          max={100}
          unit={fr.units.reps}
          format={(v) => String(v)}
          decrementLabel={t.decreaseReps}
          incrementLabel={t.increaseReps}
        />
      </View>
      <DifficultyPicker
        value={draft.difficulty}
        onChange={(difficulty) => onChange({ difficulty })}
      />
    </View>
  );
}
