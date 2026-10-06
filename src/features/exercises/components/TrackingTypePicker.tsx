import { Timer } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { TrackingType } from '@/db/schema';
import { formatClock } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import type { WeightUnit } from '@/lib/database.types';
import { formatNumber } from '@/lib/format';
import { fromKg } from '@/lib/units';
import { colors, iconSizes } from '@/theme/tokens';
import { formatPace, paceSecondsPerKm, TRACKING_TYPES } from '../tracking';

const t = fr.exercises.tracking;

type PickerProps = {
  value: TrackingType;
  onChange: (value: TrackingType) => void;
  /** Exercice avec un historique : le type ne peut plus changer (SPEC_V2 §5.2). */
  locked?: boolean;
};

/** Grille 2 × 3 des types de suivi (maquette exercice-type-suivi). */
export function TrackingTypePicker({ value, onChange, locked = false }: PickerProps) {
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap justify-between gap-y-2">
        {TRACKING_TYPES.map((type) => {
          const selected = type === value;
          return (
            <Pressable
              key={type}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: locked }}
              accessibilityLabel={`${t.types[type].title}, ${t.types[type].example}`}
              disabled={locked}
              onPress={() => onChange(type)}
              className={cn(
                'h-[72px] w-[48.8%] justify-center rounded-tile px-3 active:opacity-80',
                selected
                  ? 'border-[1.5px] border-volt bg-volt-selected'
                  : 'border border-line bg-surface',
                locked && !selected && 'opacity-40',
              )}
            >
              <Text className="font-body-bold text-15 text-text">{t.types[type].title}</Text>
              <Text
                numberOfLines={1}
                className={cn('font-body text-12', selected ? 'text-volt' : 'text-muted')}
              >
                {t.types[type].example}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {locked ? (
        <Text className="font-body text-13 leading-[18px] text-muted">{t.locked}</Text>
      ) : null}
    </View>
  );
}

/** Faux Stepper (aperçu non interactif) : « − 400 MÈTRES + ». */
function PreviewStepper({ value, label }: { value: string; label: string }) {
  return (
    <View className="h-14 flex-1 flex-row items-center justify-between rounded-input border border-line bg-bg px-[5px]">
      <View className="h-10 w-10 items-center justify-center rounded-button bg-surface2">
        <Text className="font-body text-20 text-text">−</Text>
      </View>
      <View className="items-center">
        <Text className="font-display text-24 text-text">{value}</Text>
        <Text className="font-body-bold text-10 uppercase tracking-wide text-muted">{label}</Text>
      </View>
      <View className="h-10 w-10 items-center justify-center rounded-button bg-volt">
        <Text className="font-body-bold text-20 text-onVolt">+</Text>
      </View>
    </View>
  );
}

/** Faux chrono : icône et temps. */
function PreviewClock({ seconds }: { seconds: number }) {
  return (
    <View className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-input border border-line bg-bg">
      <Timer size={iconSizes.sm} color={colors.volt} />
      <Text className="font-display text-24 text-text">{formatClock(seconds)}</Text>
    </View>
  );
}

// Valeurs d'exemple de l'aperçu (celles de la maquette).
const SAMPLE = {
  weightKg: 82.5,
  reps: 8,
  distanceM: 400,
  durationS: 92,
  calories: 20,
  carryKg: 24,
};

/** Carte « Aperçu en séance » : les contrôles tels qu'ils apparaîtront pendant la séance. */
export function TrackingPreview({ type, unit }: { type: TrackingType; unit: WeightUnit }) {
  const weight = (kg: number) => formatNumber(fromKg(kg, unit), 1);
  const caption =
    type === 'distance_time'
      ? t.previewCaption.distance_time(
          formatPace(paceSecondsPerKm(SAMPLE.distanceM, SAMPLE.durationS) ?? 0),
        )
      : t.previewCaption[type];

  return (
    <View className="gap-2.5 rounded-cardSm bg-surface p-3.5">
      <Text className="font-body-bold text-12 uppercase tracking-wide text-muted">{t.preview}</Text>
      <View className="flex-row gap-2">
        {type === 'weight_reps' ? (
          <>
            <PreviewStepper value={weight(SAMPLE.weightKg)} label={fr.units[unit]} />
            <PreviewStepper value={String(SAMPLE.reps)} label={t.previewUnits.reps} />
          </>
        ) : null}
        {type === 'distance_time' ? (
          <>
            <PreviewStepper value={String(SAMPLE.distanceM)} label={t.previewUnits.meters} />
            <PreviewClock seconds={SAMPLE.durationS} />
          </>
        ) : null}
        {type === 'time' ? <PreviewClock seconds={90} /> : null}
        {type === 'reps' ? <PreviewStepper value="12" label={t.previewUnits.reps} /> : null}
        {type === 'calories' ? (
          <PreviewStepper value={String(SAMPLE.calories)} label={t.previewUnits.cal} />
        ) : null}
        {type === 'weight_distance' ? (
          <>
            <PreviewStepper value={weight(SAMPLE.carryKg)} label={fr.units[unit]} />
            <PreviewStepper value="200" label={t.previewUnits.meters} />
          </>
        ) : null}
      </View>
      <Text className="font-body text-13 leading-[18px] text-muted">{caption}</Text>
    </View>
  );
}
