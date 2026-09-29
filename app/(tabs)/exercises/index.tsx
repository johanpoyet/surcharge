import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipGroup, Heading, IconButton, SearchField } from '@/components/ui';
import type { MuscleGroup } from '@/db/schema';
import { ExerciseRow } from '@/features/exercises/components/ExerciseRow';
import { useExercises, useExerciseSummaries } from '@/features/exercises/hooks';
import { muscleOptions } from '@/features/exercises/labels';
import { normalizeSearch, sortByLastUse } from '@/features/exercises/summary';
import { useProfile } from '@/features/profile/hooks';
import { fr } from '@/i18n/fr';

const t = fr.exercises;

type Filter = MuscleGroup | 'all';
const FILTERS = [{ value: 'all' as const, label: t.all }, ...muscleOptions];

export default function ExercisesScreen() {
  const exercises = useExercises();
  const summaries = useExerciseSummaries();
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const search = normalizeSearch(query);
    const filtered = exercises.filter(
      (e) =>
        (filter === 'all' || e.muscle === filter) &&
        (!search || normalizeSearch(e.name).includes(search)),
    );
    return sortByLastUse(filtered, summaries);
  }, [exercises, summaries, query, filter]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="gap-3.5 px-screen pt-3">
        <View className="flex-row items-center justify-between">
          <Heading size={34}>{t.title}</Heading>
          <IconButton
            icon={Plus}
            tone="volt"
            accessibilityLabel={t.create}
            onPress={() => router.push('/exercises/new')}
          />
        </View>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t.search}
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
        <View className="flex-row justify-between">
          <Text className="font-body text-13 text-muted">{t.count(visible.length)}</Text>
          <Text className="font-body text-13 text-muted">{t.sort}</Text>
        </View>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="gap-1.5 px-screen pb-6 pt-3"
        renderItem={({ item }) => (
          <ExerciseRow
            exercise={item}
            summary={summaries.get(item.id)}
            unit={unit}
            onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <Text className="pt-6 text-center font-body text-15 text-muted">
            {exercises.length === 0 ? t.emptyLibrary : t.empty}
          </Text>
        }
      />
    </SafeAreaView>
  );
}
