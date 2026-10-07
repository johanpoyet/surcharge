import { format, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { router } from 'expo-router';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Heading, Overline, StatTile, useToast } from '@/components/ui';
import { db, liveDb } from '@/db/client';
import type { Discipline } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExercises } from '@/features/exercises/hooks';
import { BodyWeightCard } from '@/features/home/components/BodyWeightCard';
import { HyroxBestCard } from '@/features/home/components/HyroxBestCard';
import { DayCard, type DayCardState } from '@/features/home/components/DayCard';
import { ProgressionCard } from '@/features/home/components/ProgressionCard';
import { RegularityCalendar } from '@/features/home/components/RegularityCalendar';
import {
  bodyWeightSummary,
  hyroxHistory,
  kmInMonth,
  monthCounts,
  progressionOf,
} from '@/features/home/summary';
import { planForDay } from '@/features/planning/calendar';
import { usePlanning } from '@/features/planning/hooks';
import { DisciplinesSheet } from '@/features/profile/components/DisciplinesSheet';
import {
  disciplinesAsked,
  markDisciplinesAsked,
  saveDisciplines,
} from '@/features/profile/disciplines';
import { useBodyWeights, useProfile } from '@/features/profile/hooks';
import { recordSets, regularityWeeks } from '@/features/stats/regularity';
import { useActiveSession, useAllSets, useCompletedSessions } from '@/features/workout/hooks';
import { hyroxBlocksQuery } from '@/features/workout/repository';
import { useStartWorkout } from '@/features/workout/useStartWorkout';
import { formatEstimate } from '@/features/templates/format';
import { fr } from '@/i18n/fr';
import { formatNumber, toLocalDateString } from '@/lib/format';
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
  const userId = useAuth().session?.user.id ?? '';
  const toast = useToast();
  const disciplines: Discipline[] = profile?.disciplines ?? ['strength'];
  const { data: hyroxBlocks } = useLiveQuery(hyroxBlocksQuery(liveDb, userId), [userId]);
  const hyroxRuns = useMemo(() => hyroxHistory(hyroxBlocks), [hyroxBlocks]);

  // Comptes V1 : une seule fois, la question « Tes disciplines » (SPEC_V2 §5.5).
  const [askDisciplines, setAskDisciplines] = useState(false);
  const profileId = profile?.id;
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    void disciplinesAsked(profileId).then((asked) => {
      if (!cancelled && !asked) setAskDisciplines(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);
  const closeDisciplines = (chosen?: Discipline[]) => {
    setAskDisciplines(false);
    if (!profileId) return;
    void markDisciplinesAsked(profileId);
    if (chosen) {
      saveDisciplines(db, profileId, chosen);
      toast.show(fr.disciplines.saved);
    }
  };
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
  const km = useMemo(() => kmInMonth(sets, today), [sets, today]);
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
              meta: planned.summary
                ? t.day.metaBlocks(planned.summary, formatEstimate(planned.minutes))
                : t.day.meta(
                    planned.exerciseCount,
                    formatEstimate(planned.minutes),
                    planned.muscles.join(', '),
                  ),
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

        {disciplines.includes('running') ? (
          // Course : tuile « km courus ce mois » en plus (grille 2 × 2).
          <View className="gap-2">
            <View className="flex-row gap-2">
              <StatTile
                value={String(counts.sessions)}
                caption={t.stats.sessions(counts.sessions, monthShort)}
              />
              <StatTile value={String(counts.records)} caption={t.stats.records(counts.records)} />
            </View>
            <View className="flex-row gap-2">
              <StatTile value={String(streak)} unit={t.stats.streakUnit} caption={t.stats.streak} />
              <StatTile
                value={formatNumber(km, 1)}
                unit={fr.units.km}
                caption={t.kmMonth(monthShort)}
              />
            </View>
          </View>
        ) : (
          <View className="flex-row gap-2">
            <StatTile
              value={String(counts.sessions)}
              caption={t.stats.sessions(counts.sessions, monthShort)}
            />
            <StatTile value={String(counts.records)} caption={t.stats.records(counts.records)} />
            <StatTile value={String(streak)} unit={t.stats.streakUnit} caption={t.stats.streak} />
          </View>
        )}

        <RegularityCalendar
          today={today}
          doneDates={doneDates}
          recordDates={recordDates}
          weekly={weekly}
          overrides={overrides}
        />

        {disciplines.includes('hyrox') ? <HyroxBestCard runs={hyroxRuns} /> : null}

        {progression ? (
          <ProgressionCard progression={progression} exerciseName={progressionName} unit={unit} />
        ) : null}
        {weight ? <BodyWeightCard summary={weight} unit={unit} /> : null}
      </ScrollView>
      <DisciplinesSheet
        visible={askDisciplines}
        initial={disciplines}
        onSave={(chosen) => closeDisciplines(chosen)}
        onClose={() => closeDisciplines()}
      />
    </SafeAreaView>
  );
}
