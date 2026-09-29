import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Button, KeyboardScreen, Overline, ReorderableList, useToast } from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExercises } from '@/features/exercises/hooks';
import { fr } from '@/i18n/fr';
import { colors } from '@/theme/tokens';
import { useTemplateDraft } from '../draftStore';
import { estimateMinutes, parseRepsTarget, parseRest } from '../format';
import { saveTemplate } from '../repository';
import { TemplateItemCard } from './TemplateItemCard';
import { WeekdayPicker } from './WeekdayPicker';

const t = fr.templates.editor;
const NAME_MAX = 40;

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-body-bold text-12 uppercase tracking-wide text-muted">{children}</Text>
  );
}

/** Création / modification d'une séance type (maquette creer-seance). Lit l'état dans useTemplateDraft. */
export function TemplateEditor({ mode }: { mode: 'create' | 'edit' }) {
  const toast = useToast();
  const { session } = useAuth();
  const draft = useTemplateDraft();
  const exercises = useExercises();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const parsed = draft.items.map((item) => ({
    item,
    reps: parseRepsTarget(item.repsText),
    rest: parseRest(item.restText),
  }));
  const totalSets = draft.items.reduce((sum, i) => sum + i.targetSets, 0);
  const minutes = estimateMinutes(
    parsed.map((p) => ({ targetSets: p.item.targetSets, restSeconds: p.rest ?? 0 })),
  );

  const save = () => {
    if (!session) return;
    const name = draft.name.trim();
    if (!name || name.length > NAME_MAX) return setError(t.nameRequired);
    if (draft.items.length === 0) return setError(t.noExercises);
    if (parsed.some((p) => p.reps === null || p.rest === null)) return setError(t.invalidItems);
    saveTemplate(db, session.user.id, {
      id: draft.templateId,
      name,
      weekdays: draft.weekdays,
      items: parsed.map(({ item, reps, rest }) => ({
        id: item.id,
        exerciseId: item.exerciseId,
        targetSets: item.targetSets,
        targetRepsMin: reps?.min ?? null,
        targetRepsMax: reps?.max ?? null,
        restSeconds: rest ?? 0,
      })),
    });
    toast.show(t.saved);
    router.back();
  };

  const cancel = () => {
    if (!draft.dirty) return router.back();
    Alert.alert(t.discardTitle, undefined, [
      { text: t.keepEditing, style: 'cancel' },
      { text: t.discardConfirm, style: 'destructive', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardScreen contentClassName="gap-4 px-screen" scrollEnabled={!dragging}>
      <View className="flex-row items-center justify-between">
        <Button label={t.cancel} variant="ghost" tone="muted" size="sm" onPress={cancel} />
        <Overline className="text-13">{mode === 'create' ? t.newTitle : t.editTitle}</Overline>
        <Button label={t.save} variant="ghost" size="sm" onPress={save} />
      </View>

      <View className="gap-1">
        <SectionLabel>{t.name}</SectionLabel>
        <TextInput
          value={draft.name}
          onChangeText={(name) => {
            draft.setName(name);
            setError(null);
          }}
          placeholder={t.namePlaceholder}
          placeholderTextColor={colors.faint}
          accessibilityLabel={t.name}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          keyboardAppearance="dark"
          selectionColor={colors.volt}
          returnKeyType="done"
          className="h-14 border-b-2 border-volt font-display text-40 text-text"
        />
      </View>

      <View className="gap-2">
        <SectionLabel>{t.days}</SectionLabel>
        <WeekdayPicker value={draft.weekdays} onToggle={draft.toggleWeekday} />
      </View>

      <View className="mt-1 flex-row items-baseline justify-between">
        <Text className="font-display text-22 uppercase text-text">
          {t.exercises(draft.items.length)}
        </Text>
        <Text className="font-body text-13 text-muted">{t.totals(totalSets, minutes)}</Text>
      </View>

      <ReorderableList
        items={draft.items}
        keyOf={(item) => item.key}
        onMove={draft.moveItem}
        onDragChange={setDragging}
        renderItem={(item, index, gesture) => (
          <TemplateItemCard
            item={item}
            exercise={byId.get(item.exerciseId)}
            handleGesture={gesture}
            index={index}
            count={draft.items.length}
            onChange={(patch) => {
              draft.updateItem(item.key, patch);
              setError(null);
            }}
            onRemove={() => draft.removeItem(item.key)}
            onMove={(to) => draft.moveItem(index, to)}
          />
        )}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/templates/pick-exercises')}
        className="h-[52px] flex-row items-center justify-center gap-2 rounded-input border-[1.5px] border-dashed border-volt active:opacity-80"
      >
        <Plus size={18} color={colors.volt} strokeWidth={2.5} />
        <Text className="font-body-bold text-15 text-volt">{t.add}</Text>
      </Pressable>

      <View className="min-h-4 flex-1" />
      {error ? (
        <Text className="font-body-semibold text-14 text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label={t.submit} onPress={save} />
    </KeyboardScreen>
  );
}
