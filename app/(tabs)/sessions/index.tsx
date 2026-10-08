import { router } from 'expo-router';
import { MoreHorizontal, Plus, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Heading, IconButton, Tabs, useToast } from '@/components/ui';
import { db } from '@/db/client';
import type { WorkoutTemplate } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { PlanningPanel } from '@/features/planning/components/PlanningPanel';
import { estimateTemplate } from '@/features/templates/estimate';
import { formatEstimate } from '@/features/templates/format';
import {
  useTemplateBlocks,
  useTemplateItems,
  useTemplates,
  useTemplateWeekdays,
} from '@/features/templates/hooks';
import { deleteTemplate, duplicateTemplate } from '@/features/templates/repository';
import { useStartWorkout } from '@/features/workout/useStartWorkout';
import { fr } from '@/i18n/fr';
import { colors } from '@/theme/tokens';

const t = fr.templates;
type Tab = 'planning' | 'templates';
const TABS = [
  { value: 'planning' as const, label: t.tabs.planning },
  { value: 'templates' as const, label: t.tabs.templates },
];

export default function SessionsScreen() {
  const toast = useToast();
  const { session } = useAuth();
  const templates = useTemplates();
  const { start } = useStartWorkout();
  const items = useTemplateItems();
  const blocks = useTemplateBlocks();
  const weekdays = useTemplateWeekdays();
  const [tab, setTab] = useState<Tab>('planning');

  const open = (template: WorkoutTemplate) =>
    router.push({ pathname: '/templates/[id]', params: { id: template.id } });

  const showActions = (template: WorkoutTemplate) =>
    Alert.alert(template.name, undefined, [
      { text: t.edit, onPress: () => open(template) },
      {
        text: t.duplicate,
        onPress: () => {
          if (!session) return;
          duplicateTemplate(db, session.user.id, template.id, t.copyName(template.name));
          toast.show(t.duplicated);
        },
      },
      { text: t.start, onPress: () => start(template.id) },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () =>
          Alert.alert(t.deleteTitle, t.deleteMessage, [
            { text: t.editor.cancel, style: 'cancel' },
            {
              text: t.delete,
              style: 'destructive',
              onPress: () => {
                deleteTemplate(db, template.id);
                toast.show(t.deleted);
              },
            },
          ]),
      },
      { text: t.editor.cancel, style: 'cancel' },
    ]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <View className="gap-3.5 px-screen pt-3">
        <View className="flex-row items-center justify-between">
          <Heading size={34}>{t.title}</Heading>
          <IconButton
            icon={Plus}
            tone="volt"
            accessibilityLabel={t.create}
            onPress={() => router.push('/templates/new')}
          />
        </View>
        <Tabs options={TABS} value={tab} onChange={setTab} />
      </View>

      {tab === 'planning' ? (
        <PlanningPanel />
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-1.5 px-screen pb-6 pt-4"
          ListHeaderComponent={
            templates.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/templates/presets')}
                className="mb-1.5 flex-row items-center gap-3 rounded-tile border border-dashed border-volt px-4 py-3 active:opacity-80"
              >
                <Sparkles size={20} color={colors.volt} strokeWidth={2} />
                <View className="flex-1">
                  <Text className="font-body-bold text-15 text-volt">{t.presets.open}</Text>
                  <Text className="font-body text-13 text-muted">{t.presets.openHint}</Text>
                </View>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View className="gap-4 pt-4">
              <Text className="font-body text-15 text-muted">{t.empty}</Text>
              <Button label={t.emptyCta} onPress={() => router.push('/templates/new')} />
              <Button
                label={t.presets.open}
                variant="outline"
                onPress={() => router.push('/templates/presets')}
              />
            </View>
          }
          renderItem={({ item }) => {
            const rows = items.get(item.id) ?? [];
            const days = (weekdays.get(item.id) ?? []).map((d) => fr.weekdays.short[d - 1]);
            const muscles = [...new Set(rows.map((r) => fr.exercises.muscles[r.muscle]))];
            const { minutes } = estimateTemplate(blocks.get(item.id) ?? [], rows);
            const summary = [t.summary(rows.length, formatEstimate(minutes)), days.join(', ')]
              .filter(Boolean)
              .join(' · ');
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${summary}`}
                onPress={() => open(item)}
                className="min-h-[72px] flex-row items-center gap-3 rounded-tile bg-surface py-3 pl-4 pr-2 active:opacity-80"
              >
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-display text-22 uppercase text-text">
                    {item.name}
                  </Text>
                  <Text className="font-body text-13 text-muted">{summary}</Text>
                  {muscles.length ? (
                    <Text numberOfLines={1} className="font-body text-13 text-faint">
                      {muscles.join(', ')}
                    </Text>
                  ) : null}
                </View>
                <IconButton
                  icon={MoreHorizontal}
                  tone="ghost"
                  accessibilityLabel={t.actions}
                  onPress={() => showActions(item)}
                />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
