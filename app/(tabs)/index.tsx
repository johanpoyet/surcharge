import { format, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Heading, Overline, StatTile } from '@/components/ui';
import { useExercises } from '@/features/exercises/hooks';
import { BodyWeightCard } from '@/features/home/components/BodyWeightCard';
import { DayCard, type DayCardState } from '@/features/home/components/DayCard';
import { ProgressionCard } from '@/features/home/components/ProgressionCard';
import { RegularityCalendar } from '@/features/home/components/RegularityCalendar';
import { bodyWeightSummary, monthCounts, progressionOf } from '@/features/home/summary';
import { planForDay } from '@/features/planning/calendar';
import { usePlanning } from '@/features/planning/hooks';
import { useBodyWeights, useProfile } from '@/features/profile/hooks';
import { recordSets, regularityWeeks } from '@/features/stats/regularity';
import { useActiveSession, useAllSets, useCompletedSessions } from '@/features/workout/hooks';
import { useStartWorkout } from '@/features/workout/useStartWorkout';
import { fr } from '@/i18n/fr';
import { toLocalDateString } from '@/lib/format';
import { useNow } from '@/lib/useNow';

const t = fr.home;

export default function HomeScreen() {
  const { profile, firstName } = useProfile();
  const unit = profile?.weightUnit ?? 'kg';
  const { weekly, overrides, templates, templateList } = usePlanning();
  const sessions = useCompletedSessions();
  const sets = useAllSets();
  const weights = useBodyWeights();
  const exercises = useExercises();
  const { start, openWorkout } = useStartWorkout();
  // Rafraîchi chaque minute : l'accueil change de jour à minuit.
  const now = useNow(60_000);
  const today = useMemo(() => new Date(now), [now]);
  const todayKey = toLocalDateString(today);

  const doneDates = useMemo(
    () => new Set(sessions.map((s) => toLocalDateString(parseISO(s.startedAt)))),
    [sessions],
  );
  const recordDates = useMemo(
    () => new Set(recordSets(sets).map((s) => toLocalDateString(parseISO(s.completedAt)))),
    [sets],
  );
  const counts = useMemo(
    () =>
      monthCounts(
        sessions.map((s) => s.startedAt),
        sets,
        today,
      ),
    [sessions, sets, today],
  );
  const streak = useMemo(
    () =>
      regularityWeeks(
        sessions.map((s) => parseISO(s.startedAt)),
        profile?.sessionsPerWeek ?? null,
        today,
      ),
    [profile?.sessionsPerWeek, sessions, today],
  );
  const progression = useMemo(() => progressionOf(sets), [sets]);
  const weight = useMemo(() => bodyWeightSummary(weights), [weights]);

  const active = useActiveSession();
  const doneToday = sessions.find((s) => toLocalDateString(parseISO(s.startedAt)) === todayKey);
  const plan = planForDay(today, overrides, weekly);
  const planned = plan.templateId ? templates.get(plan.templateId) : undefined;

  const dayState: DayCardState = active
    ? { kind: 'active', name: active.name }
    : doneToday
      ? { kind: 'done', name: doneToday.name }
      : templateList.length === 0
        ? { kind: 'empty' }
        : planned
          ? {
              kind: 'planned',
              name: planned.name,
              meta: t.day.meta(planned.exerciseCount, planned.minutes, planned.muscles.join(', ')),
              changed: plan.source === 'override',
            }
          : { kind: 'rest' };

  const chooseTemplate = () =>
    Alert.alert(t.day.changeTitle, undefined, [
      ...templateList
        .filter((template) => template.id !== planned?.id)
        .map((template) => ({ text: template.name, onPress: () => start(template.id) })),
      { text: fr.workout.cancel, style: 'cancel' as const },
    ]);

  const monthShort = format(today, 'MMM', { locale: frLocale });
  const progressionName = progression
    ? (exercises.find((e) => e.id === progression.exerciseId)?.name ?? '')
    : '';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-4 px-screen pb-6 pt-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Overline className="text-13">
              {format(today, 'EEE d MMM', { locale: frLocale })}
            </Overline>
            <Heading size={34}>{t.greeting(firstName)}</Heading>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.profile}
            onPress={() => router.navigate('/profile')}
            className="h-11 w-11 items-center justify-center rounded-input bg-line active:opacity-80"
          >
            <Text className="font-body-bold text-18 text-volt">
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        <DayCard
          state={dayState}
          onStart={() => planned && start(planned.id)}
          onChange={chooseTemplate}
          onResume={() => active && openWorkout(active.id)}
          onRecap={() =>
            doneToday &&
            router.push({
              pathname: '/workout/summary/[sessionId]',
              params: { sessionId: doneToday.id },
            })
          }
          onCreate={() => router.push('/templates/new')}
        />

        <View className="flex-row gap-2">
          <StatTile value={String(counts.sessions)} caption={t.stats.sessions(monthShort)} />
          <StatTile value={String(counts.records)} caption={t.stats.records} />
          <StatTile value={String(streak)} unit={t.stats.streakUnit} caption={t.stats.streak} />
        </View>

        <RegularityCalendar
          today={today}
          doneDates={doneDates}
          recordDates={recordDates}
          weekly={weekly}
          overrides={overrides}
        />

        {progression ? (
          <ProgressionCard progression={progression} exerciseName={progressionName} unit={unit} />
        ) : null}
        {weight ? <BodyWeightCard summary={weight} unit={unit} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
