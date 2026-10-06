import { useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Text, View } from 'react-native';

import {
  Button,
  ChipGroup,
  KeyboardScreen,
  Overline,
  PhotoSlot,
  Stepper,
  TextField,
} from '@/components/ui';
import type { Discipline, Equipment, Exercise, MuscleGroup, TrackingType } from '@/db/schema';
import { defaultWeightStep } from '@/db/seed';
import { fr } from '@/i18n/fr';
import type { WeightUnit } from '@/lib/database.types';
import { formatNumber } from '@/lib/format';
import { fromKg, toKg } from '@/lib/units';
import { zodResolver } from '@/lib/zodResolver';
import { deleteLocalPhoto } from '../photos';
import { disciplineOptions, equipmentOptions, muscleOptions } from '../labels';
import { exerciseFormSchema, type ExerciseFormValues } from '../schema';
import { usesWeight } from '../tracking';
import { usePhotoPicker } from '../usePhotoPicker';
import { TrackingPreview, TrackingTypePicker } from './TrackingTypePicker';

const t = fr.exercises.form;
const tt = fr.exercises.tracking;

export type ExerciseFormResult = {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  weightStepKg: number;
  note: string | null;
  photoLocalUri: string | null;
  trackingType: TrackingType;
  discipline: Discipline;
};

type ExerciseFormProps = {
  mode: 'create' | 'edit';
  initial?: Exercise;
  unit: WeightUnit;
  onSubmit: (values: ExerciseFormResult) => void;
  onCancel: () => void;
  onDelete?: () => void;
  /** L'exercice a des séries enregistrées : son type de suivi ne peut plus changer. */
  trackingLocked?: boolean;
};

/** Pas des boutons dans l'unité affichée, arrondi au demi. */
const stepInUnit = (kg: number, unit: WeightUnit) => Math.round(fromKg(kg, unit) * 2) / 2;

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-body-bold text-12 uppercase tracking-wide text-muted">{children}</Text>
  );
}

/** Création et modification d'un exercice (maquette creer-exercice). */
export function ExerciseForm({
  mode,
  initial,
  unit,
  onSubmit,
  onCancel,
  onDelete,
  trackingLocked = false,
}: ExerciseFormProps) {
  const photos = usePhotoPicker();
  // Photos prises pendant ce formulaire : supprimées si elles ne sont pas gardées.
  const picked = useRef<string[]>([]);
  // Tant que le pas n'a pas été touché, il suit l'équipement (5 kg machine, 2,5 kg sinon).
  const stepTouched = useRef(mode === 'edit');

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: initial?.name ?? '',
      muscle: initial?.muscle ?? '',
      equipment: initial?.equipment ?? '',
      weightStep: stepInUnit(initial?.weightStep ?? defaultWeightStep('barbell'), unit),
      note: initial?.note ?? '',
      photoLocalUri: initial?.photoLocalUri ?? null,
      trackingType: initial?.trackingType ?? 'weight_reps',
      discipline: initial?.discipline ?? 'strength',
    },
  });
  const trackingType = useWatch({ control, name: 'trackingType' });

  const save = (values: ExerciseFormValues) => {
    const keep = values.photoLocalUri;
    picked.current.filter((uri) => uri !== keep).forEach(deleteLocalPhoto);
    if (initial?.photoLocalUri && initial.photoLocalUri !== keep) {
      deleteLocalPhoto(initial.photoLocalUri);
    }
    onSubmit({
      name: values.name,
      muscle: values.muscle as MuscleGroup,
      equipment: values.equipment as Equipment,
      weightStepKg: Math.round(toKg(values.weightStep, unit) * 100) / 100,
      note: values.note || null,
      photoLocalUri: keep,
      trackingType: values.trackingType,
      discipline: values.discipline,
    });
  };

  const submit = () => void handleSubmit(save)();

  const cancel = () => {
    picked.current.forEach(deleteLocalPhoto);
    onCancel();
  };

  const setPhoto = (uri: string) => {
    picked.current.push(uri);
    setValue('photoLocalUri', uri);
  };

  return (
    <KeyboardScreen contentClassName="gap-4 px-screen">
      <View className="flex-row items-center justify-between">
        <Button label={t.cancel} variant="ghost" tone="muted" size="sm" onPress={cancel} />
        <Overline className="text-13">{mode === 'create' ? t.newTitle : t.editTitle}</Overline>
        <Button label={t.save} variant="ghost" size="sm" onPress={submit} />
      </View>

      <Controller
        control={control}
        name="photoLocalUri"
        render={({ field: { value } }) => (
          <PhotoSlot
            uri={value}
            onCamera={() => void photos.pick('camera').then((uri) => uri && setPhoto(uri))}
            onGallery={() => void photos.pick('library').then((uri) => uri && setPhoto(uri))}
          />
        )}
      />

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t.name}
            labelStyle="overline"
            placeholder={t.namePlaceholder}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        )}
      />

      <View className="gap-2">
        <SectionLabel>{tt.section}</SectionLabel>
        <Controller
          control={control}
          name="trackingType"
          render={({ field: { onChange, value } }) => (
            <TrackingTypePicker value={value} onChange={onChange} locked={trackingLocked} />
          )}
        />
      </View>

      <TrackingPreview type={trackingType} unit={unit} />

      <View className="gap-2">
        <SectionLabel>{tt.discipline}</SectionLabel>
        <Controller
          control={control}
          name="discipline"
          render={({ field: { onChange, value } }) => (
            <ChipGroup
              options={disciplineOptions}
              value={value}
              onChange={(next) => {
                onChange(next);
                // Course, cross-training, Hyrox : « Autre » par défaut si rien n'est choisi.
                if (next !== 'strength') {
                  if (!getValues('muscle')) setValue('muscle', 'other');
                  if (!getValues('equipment')) setValue('equipment', 'other');
                }
              }}
            />
          )}
        />
      </View>

      <View className="gap-2">
        <SectionLabel>{t.muscle}</SectionLabel>
        <Controller
          control={control}
          name="muscle"
          render={({ field: { onChange, value } }) => (
            <ChipGroup
              options={muscleOptions}
              value={(value || null) as MuscleGroup | null}
              onChange={onChange}
            />
          )}
        />
        {errors.muscle ? (
          <Text className="font-body-semibold text-13 text-danger">{errors.muscle.message}</Text>
        ) : null}
      </View>

      <View className="gap-2">
        <SectionLabel>{t.equipment}</SectionLabel>
        <Controller
          control={control}
          name="equipment"
          render={({ field: { onChange, value } }) => (
            <ChipGroup
              options={equipmentOptions}
              value={(value || null) as Equipment | null}
              onChange={(next) => {
                onChange(next);
                if (!stepTouched.current) {
                  setValue('weightStep', stepInUnit(defaultWeightStep(next), unit));
                }
              }}
            />
          )}
        />
        {errors.equipment ? (
          <Text className="font-body-semibold text-13 text-danger">{errors.equipment.message}</Text>
        ) : null}
      </View>

      {usesWeight(trackingType) ? (
        <View className="gap-2">
          <SectionLabel>{t.step}</SectionLabel>
          <View className="flex-row items-center gap-3">
            <Controller
              control={control}
              name="weightStep"
              render={({ field: { onChange, value } }) => (
                <Stepper
                  size="md"
                  value={value}
                  onChange={(next) => {
                    stepTouched.current = true;
                    onChange(next);
                  }}
                  step={0.5}
                  min={0.5}
                  max={unit === 'lb' ? 50 : 25}
                  unit={fr.units[unit]}
                  format={(v) => formatNumber(v, 1)}
                />
              )}
            />
            <Text className="flex-1 font-body text-13 leading-[18px] text-muted">{t.stepHint}</Text>
          </View>
        </View>
      ) : null}

      <Controller
        control={control}
        name="note"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t.note}
            labelStyle="overline"
            placeholder={t.notePlaceholder}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
          />
        )}
      />

      <View className="min-h-4 flex-1" />
      <Button label={mode === 'create' ? t.create : t.save} onPress={submit} />
      {onDelete ? (
        <Button label={t.delete} variant="ghost" tone="danger" size="sm" onPress={onDelete} />
      ) : null}
    </KeyboardScreen>
  );
}
