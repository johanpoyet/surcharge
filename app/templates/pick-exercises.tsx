import { router } from 'expo-router';
import { Check, Plus, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ChipGroup, Heading, IconButton, SearchField } from '@/components/ui';
import type { MuscleGroup } from '@/db/schema';
import { ExerciseThumb } from '@/features/exercises/components/ExerciseThumb';
import { useExercises } from '@/features/exercises/hooks';
import { muscleOptions } from '@/features/exercises/labels';
import { normalizeSearch } from '@/features/exercises/summary';
import { useProfile } from '@/features/profile/hooks';
import { useTemplateDraft } from '@/features/templates/draftStore';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

const t = fr.templates.picker;
type Filter = MuscleGroup | 'all';
const FILTERS = [{ value: 'all' as const, label: fr.exercises.all }, ...muscleOptions];

export default function PickExercisesScreen() {
  const exercises = useExercises();
  const inDraft = useTemplateDraft((state) => state.items);
  const addExercises = useTemplateDraft((state) => state.addExercises);
  const restSeconds = useProfile().profile?.defaultRestSeconds ?? 120;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string[]>([]);

  const already = useMemo(() => new Set(inDraft.map((i) => i.exerciseId)), [inDraft]);
  const visible = useMemo(() => {
    const search = normalizeSearch(query);
    return exercises.filter(
      (e) =>
        (filter === 'all' || e.muscle === filter) &&
        (!search || normalizeSearch(e.name).includes(search)),
    );
  }, [exercises, filter, query]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const submit = () => {
    addExercises(selected, restSeconds);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="gap-3.5 px-screen pt-2">
        <View className="flex-row items-center gap-3">
          <IconButton icon={X} accessibilityLabel={t.close} onPress={() => router.back()} />
          <Heading size={30} className="flex-1">
            {t.title}
          </Heading>
        </View>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={fr.exercises.search}
          clearLabel={fr.common.clear}
        />
        <ChipGroup
          layout="scroll"
          size="sm"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          className="-mr-screen"
        />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="gap-1.5 px-screen pb-4 pt-3"
        ListHeaderComponent={
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/exercises/new')}
            className="mb-1.5 flex-row items-center gap-3 rounded-tile border-[1.5px] border-dashed border-volt bg-volt-subtle p-3 active:opacity-80"
          >
            <View className="h-[46px] w-[46px] items-center justify-center rounded-input bg-volt">
              <Plus size={24} color={colors.onVolt} strokeWidth={2.5} />
            </View>
            <View>
              <Text className="font-body-bold text-16 text-text">{t.createTitle}</Text>
              <Text className="font-body text-13 text-muted">{t.createHint}</Text>
            </View>
          </Pressable>
        }
        renderItem={({ item }) => {
          const disabled = already.has(item.id);
          const checked = disabled || selected.includes(item.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={item.name}
              accessibilityHint={disabled ? t.alreadyAdded : undefined}
              accessibilityState={{ checked, disabled }}
              disabled={disabled}
              onPress={() => toggle(item.id)}
              className={cn(
                'flex-row items-center gap-3 rounded-tile bg-surface p-2.5 pr-3.5 active:opacity-80',
                checked && !disabled && 'border border-volt',
                disabled && 'opacity-50',
              )}
            >
              <ExerciseThumb uri={item.photoLocalUri} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-body-bold text-16 text-text">
                  {item.name}
                </Text>
                <Text className="font-body text-13 text-muted">
                  {disabled
                    ? t.alreadyAdded
                    : `${fr.exercises.muscles[item.muscle]} · ${fr.exercises.equipment[item.equipment].toLowerCase()}`}
                </Text>
              </View>
              <View
                className={cn(
                  'h-7 w-7 items-center justify-center rounded-sm',
                  checked ? 'bg-volt' : 'border-[1.5px] border-lineStrong',
                )}
              >
                {checked ? <Check size={16} color={colors.onVolt} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        }}
      />
      <View className="px-screen pb-2 pt-2">
        <Button
          label={t.submit(selected.length)}
          disabled={selected.length === 0}
          onPress={submit}
        />
      </View>
    </SafeAreaView>
  );
}
