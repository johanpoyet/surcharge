import { GripVertical, Trash2 } from 'lucide-react-native';
import { Text, TextInput, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';

import { IconButton, Stepper } from '@/components/ui';
import type { Exercise } from '@/db/schema';
import { ExerciseThumb } from '@/features/exercises/components/ExerciseThumb';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';
import type { DraftItem } from '../draftStore';
import { formatRepsTarget, formatRest, parseRepsTarget, parseRest } from '../format';

const t = fr.templates.editor;

function Label({ children }: { children: string }) {
  return (
    <Text className="font-body-bold text-11 uppercase tracking-wide text-muted">{children}</Text>
  );
}

function CellInput({
  label,
  value,
  invalid,
  onChangeText,
  onBlur,
  placeholder,
}: {
  label: string;
  value: string;
  invalid: boolean;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
}) {
  return (
    <View className="flex-1 gap-1">
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        accessibilityLabel={label}
        keyboardType="numbers-and-punctuation"
        keyboardAppearance="dark"
        selectionColor={colors.volt}
        returnKeyType="done"
        className={cn(
          'h-12 rounded-button bg-bg text-center font-body-bold text-16 text-text',
          invalid ? 'border-[1.5px] border-danger' : 'border border-line',
        )}
      />
    </View>
  );
}

type TemplateItemCardProps = {
  item: DraftItem;
  exercise: Exercise | undefined;
  handleGesture: GestureType;
  index: number;
  count: number;
  onChange: (patch: Partial<Omit<DraftItem, 'key'>>) => void;
  onRemove: () => void;
  onMove: (to: number) => void;
};

/** Exercice d'une séance type : poignée, séries, reps cibles, repos, suppression. */
export function TemplateItemCard({
  item,
  exercise,
  handleGesture,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: TemplateItemCardProps) {
  const name = exercise?.name ?? '—';
  const repsInvalid = parseRepsTarget(item.repsText) === null;
  const restInvalid = parseRest(item.restText) === null;

  return (
    <View className="gap-3 rounded-cardSm bg-surface p-3">
      <View className="flex-row items-center gap-2.5">
        <GestureDetector gesture={handleGesture}>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t.move(name)}
            accessibilityActions={[
              ...(index > 0 ? [{ name: 'moveUp', label: t.moveUp }] : []),
              ...(index < count - 1 ? [{ name: 'moveDown', label: t.moveDown }] : []),
            ]}
            onAccessibilityAction={(event) =>
              onMove(event.nativeEvent.actionName === 'moveUp' ? index - 1 : index + 1)
            }
            className="h-11 w-6 items-center justify-center"
          >
            <GripVertical size={18} color={colors.faint} strokeWidth={2} />
          </View>
        </GestureDetector>
        <ExerciseThumb
          uri={exercise?.photoLocalUri ?? null}
          className="h-[46px] w-[46px] rounded-button"
        />
        <View className="flex-1">
          <Text className="font-body-bold text-17 text-text">{name}</Text>
          {exercise ? (
            <Text className="font-body text-13 text-muted">
              {fr.exercises.muscles[exercise.muscle]}
            </Text>
          ) : null}
        </View>
        <IconButton
          icon={Trash2}
          tone="ghost"
          accessibilityLabel={t.remove(name)}
          onPress={onRemove}
        />
      </View>

      <View className="flex-row gap-2">
        <View className="flex-[1.3] gap-1">
          <Label>{t.sets}</Label>
          <Stepper
            size="sm"
            value={item.targetSets}
            onChange={(targetSets) => onChange({ targetSets })}
            step={1}
            min={1}
            max={20}
            format={(v) => String(v)}
          />
        </View>
        <CellInput
          label={t.reps}
          value={item.repsText}
          invalid={repsInvalid}
          placeholder="8–12"
          onChangeText={(repsText) => onChange({ repsText })}
          onBlur={() => {
            const parsed = parseRepsTarget(item.repsText);
            if (parsed) onChange({ repsText: formatRepsTarget(parsed) });
          }}
        />
        <CellInput
          label={t.rest}
          value={item.restText}
          invalid={restInvalid}
          placeholder="2:00"
          onChangeText={(restText) => onChange({ restText })}
          onBlur={() => {
            const parsed = parseRest(item.restText);
            if (parsed !== null) onChange({ restText: formatRest(parsed) });
          }}
        />
      </View>
    </View>
  );
}
