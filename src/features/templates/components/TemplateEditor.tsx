import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Button, KeyboardScreen, Overline, ReorderableList, useToast } from '@/components/ui';
import { db } from '@/db/client';
import type { BlockType } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExercises } from '@/features/exercises/hooks';
import { useProfile } from '@/features/profile/hooks';
import { fr } from '@/i18n/fr';
import { formatNumber } from '@/lib/format';
import { colors } from '@/theme/tokens';
import { blocksFromDraft } from '../draftConvert';
import { useTemplateDraft } from '../draftStore';
import { estimateTemplateMinutes, runningKm } from '../estimate';
import { formatEstimate, parseRest } from '../format';
import { saveTemplate } from '../repository';
import { AddBlockSheet } from './AddBlockSheet';
import { BlockCard } from './BlockCard';
import { WeekdayPicker } from './WeekdayPicker';

const t = fr.templates.editor;
const tb = fr.templates.blocks;
const NAME_MAX = 40;

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-body-bold text-12 uppercase tracking-wide text-muted">{children}</Text>
  );
}

/**
 * Création / modification d'une séance type en blocs (maquettes seance-multi-blocs et
 * ajouter-bloc). Lit l'état dans useTemplateDraft.
 */
export function TemplateEditor({ mode }: { mode: 'create' | 'edit' }) {
  const toast = useToast();
  const { session } = useAuth();
  const draft = useTemplateDraft();
  const exercises = useExercises();
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [adding, setAdding] = useState(false);

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const estimateBlocks = draft.blocks.map((block) => ({
    type: block.type,
    config: block.config,
    items: block.items.map((item) => ({
      targetSets: item.targetSets,
      restSeconds: parseRest(item.restText) ?? 0,
      targetDistanceM: item.targetDistanceM,
      targetDurationS: item.targetDurationS,
      running: byId.get(item.exerciseId)?.discipline === 'running',
    })),
  }));
  const minutes = estimateTemplateMinutes(estimateBlocks);
  const km = runningKm(estimateBlocks);

  const save = () => {
    if (!session) return;
    const name = draft.name.trim();
    if (!name || name.length > NAME_MAX) return setError(t.nameRequired);
    const result = blocksFromDraft(draft.blocks);
    if ('error' in result) {
      return setError(result.error === 'invalidItems' ? t.invalidItems : tb.errors[result.error]);
    }
    saveTemplate(db, session.user.id, {
      id: draft.templateId,
      name,
      weekdays: draft.weekdays,
      blocks: result.blocks,
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

  const addBlock = (type: BlockType) => {
    setAdding(false);
    setError(null);
    const key = draft.addBlock(type);
    // Musculation : on choisit tout de suite les exercices ; les autres blocs ont leur éditeur.
    if (type === 'strength') {
      draft.setPickTarget(key);
      router.push('/templates/pick-exercises');
    } else {
      router.push({ pathname: '/templates/block', params: { key } });
    }
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
          className="h-14 border-b-2 border-volt font-display text-40 uppercase text-text"
        />
      </View>

      <View className="gap-2">
        <SectionLabel>{t.days}</SectionLabel>
        <WeekdayPicker value={draft.weekdays} onToggle={draft.toggleWeekday} />
      </View>

      <View className="mt-1 flex-row items-baseline justify-between">
        <Text className="font-display text-22 uppercase text-text">
          {tb.count(draft.blocks.length)}
        </Text>
        <Text className="font-body text-13 text-muted">
          {tb.totals(formatEstimate(minutes), km > 0 ? formatNumber(km, 1) : null)}
        </Text>
      </View>

      <View className="gap-2">
        <ReorderableList
          items={draft.blocks}
          keyOf={(block) => block.key}
          onMove={draft.moveBlock}
          onDragChange={setDragging}
          renderItem={(block, index, gesture) => (
            <BlockCard
              block={block}
              index={index}
              count={draft.blocks.length}
              exercises={byId}
              unit={unit}
              onDragChange={setDragging}
              handleGesture={gesture}
            />
          )}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setAdding(true)}
          className="h-[52px] flex-row items-center justify-center gap-2 rounded-cta border-[1.5px] border-dashed border-volt active:opacity-80"
        >
          <Plus size={18} color={colors.volt} strokeWidth={2.6} />
          <Text className="font-body-bold text-15 text-volt">{tb.add}</Text>
        </Pressable>
      </View>

      <View className="min-h-4 flex-1" />
      {error ? (
        <Text className="font-body-semibold text-14 text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label={t.submit} onPress={save} />

      <AddBlockSheet visible={adding} onClose={() => setAdding(false)} onAdd={addBlock} />
    </KeyboardScreen>
  );
}
