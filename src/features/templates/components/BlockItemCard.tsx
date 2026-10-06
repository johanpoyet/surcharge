import { Trash2 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { IconButton, Stepper } from '@/components/ui';
import type { Exercise } from '@/db/schema';
import { ExerciseThumb } from '@/features/exercises/components/ExerciseThumb';
import { formatDistance } from '@/features/exercises/tracking';
import { formatClock } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { formatNumber } from '@/lib/format';
import { fromKg, toKg } from '@/lib/units';
import type { DraftItem } from '../draftStore';
import { formatRest, parseRepsTarget, parseRest } from '../format';

const t = fr.templates.blocks.editor.target;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-w-[46%] flex-1 gap-1">
      <Text className="font-body-bold text-11 uppercase tracking-wide text-muted">{label}</Text>
      {children}
    </View>
  );
}

/** Pas de la distance : 50 m sous 400 m, 100 m au-delà (SPEC_V2 §4.1). */
const distanceStep = (meters: number) => (meters < 400 ? 50 : 100);

type BlockItemCardProps = {
  item: DraftItem;
  exercise: Exercise | undefined;
  /** Cardio : séries et récup ; circuit : la cible d'un tour seulement. */
  kind: 'cardio' | 'circuit';
  unit: WeightUnit;
  onChange: (patch: Partial<Omit<DraftItem, 'key'>>) => void;
  onRemove: () => void;
};

/** Exercice d'un bloc Course / cardio ou Circuit : cibles selon son type de suivi. */
export function BlockItemCard({
  item,
  exercise,
  kind,
  unit,
  onChange,
  onRemove,
}: BlockItemCardProps) {
  const name = exercise?.name ?? '—';
  const tracking = exercise?.trackingType ?? 'reps';
  const reps = parseRepsTarget(item.repsText)?.max ?? 10;
  const rest = parseRest(item.restText) ?? 0;
  const distance = item.targetDistanceM ?? 0;

  const distanceField = (
    <Field label={t.distance}>
      <Stepper
        size="sm"
        value={distance}
        onChange={(targetDistanceM) => onChange({ targetDistanceM })}
        step={distanceStep(distance)}
        min={50}
        max={42_200}
        format={formatDistance}
      />
    </Field>
  );

  return (
    <View className="gap-3 rounded-cardSm bg-surface p-3">
      <View className="flex-row items-center gap-2.5">
        <ExerciseThumb
          uri={exercise?.photoLocalUri ?? null}
          className="h-[46px] w-[46px] rounded-button"
        />
        <Text className="flex-1 font-body-bold text-17 text-text">{name}</Text>
        <IconButton
          icon={Trash2}
          tone="ghost"
          accessibilityLabel={fr.templates.editor.remove(name)}
          onPress={onRemove}
        />
      </View>

      <View className="flex-row flex-wrap gap-2">
        {kind === 'cardio' ? (
          <Field label={t.sets}>
            <Stepper
              size="sm"
              value={item.targetSets}
              onChange={(targetSets) => onChange({ targetSets })}
              step={1}
              min={1}
              max={30}
              format={String}
            />
          </Field>
        ) : null}

        {tracking === 'distance_time' || tracking === 'weight_distance' ? distanceField : null}

        {tracking === 'weight_distance' ? (
          <Field label={t.weight}>
            <Stepper
              size="sm"
              value={Math.round(fromKg(item.targetWeightKg ?? 0, unit) * 2) / 2}
              onChange={(value) =>
                onChange({
                  targetWeightKg: value > 0 ? Math.round(toKg(value, unit) * 100) / 100 : null,
                })
              }
              step={unit === 'lb' ? 5 : 2}
              min={0}
              max={unit === 'lb' ? 600 : 300}
              format={(v) => `${formatNumber(v, 1)} ${fr.units[unit]}`}
            />
          </Field>
        ) : null}

        {tracking === 'time' ? (
          <Field label={t.duration}>
            <Stepper
              size="sm"
              value={item.targetDurationS ?? 30}
              onChange={(targetDurationS) => onChange({ targetDurationS })}
              step={15}
              min={15}
              max={3 * 3600}
              format={formatClock}
            />
          </Field>
        ) : null}

        {tracking === 'calories' ? (
          <Field label={t.calories}>
            <Stepper
              size="sm"
              value={item.targetCalories ?? 10}
              onChange={(targetCalories) => onChange({ targetCalories })}
              step={1}
              min={1}
              max={500}
              format={(v) => `${v} ${fr.units.cal}`}
            />
          </Field>
        ) : null}

        {tracking === 'reps' || tracking === 'weight_reps' ? (
          <Field label={t.reps}>
            <Stepper
              size="sm"
              value={reps}
              onChange={(value) => onChange({ repsText: String(value) })}
              step={1}
              min={1}
              max={100}
              format={String}
            />
          </Field>
        ) : null}

        {kind === 'cardio' ? (
          <Field label={t.rest}>
            <Stepper
              size="sm"
              value={rest}
              onChange={(value) => onChange({ restText: formatRest(value) })}
              step={15}
              min={0}
              max={600}
              format={formatClock}
            />
          </Field>
        ) : null}
      </View>
    </View>
  );
}
