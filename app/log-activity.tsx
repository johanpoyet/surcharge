import { format, subDays } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import {
  Button,
  ChipGroup,
  Heading,
  IconButton,
  KeyboardScreen,
  Overline,
  TextField,
} from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExercises } from '@/features/exercises/hooks';
import { formatPace, paceSecondsPerKm } from '@/features/exercises/tracking';
import {
  activityTimes,
  isImplausiblePace,
  parseDuration,
  parseKm,
} from '@/features/workout/manualEntry';
import { logActivity } from '@/features/workout/repository';
import { fr } from '@/i18n/fr';

const t = fr.logActivity;
const MAX_DAYS_AGO = 365;

/** Sortie notée après coup : activité, distance, temps, jour (retours des testeurs). */
export default function LogActivityScreen() {
  const userId = useAuth().session?.user.id ?? '';
  const exercises = useExercises();
  // Exercices « distance + temps » : la course d'abord, puis les machines (rameur, vélo…).
  const options = useMemo(
    () =>
      exercises
        .filter((e) => e.trackingType === 'distance_time')
        .sort((a, b) => Number(b.discipline === 'running') - Number(a.discipline === 'running')),
    [exercises],
  );
  const [chosen, setChosen] = useState<string | null>(null);
  const exercise =
    options.find((e) => e.id === chosen) ??
    options.find((e) => e.catalogKey === 'run_easy') ??
    options[0];
  const [distanceText, setDistanceText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [note, setNote] = useState('');
  const [daysAgo, setDaysAgo] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  const distanceM = parseKm(distanceText);
  const durationS = parseDuration(timeText);
  const pace = paceSecondsPerKm(distanceM, durationS);
  const day = subDays(new Date(), daysAgo);
  const dayLabel =
    daysAgo === 0
      ? t.today
      : daysAgo === 1
        ? t.yesterday
        : format(day, 'EEE d MMM', { locale: frLocale });

  const save = () => {
    if (!exercise || !userId) return;
    if (distanceM === null || durationS === null) {
      setShowErrors(true);
      return;
    }
    const write = () => {
      const sessionId = logActivity(db, userId, {
        exerciseId: exercise.id,
        name: exercise.name,
        distanceM,
        durationS,
        ...activityTimes(day, durationS, new Date()),
        note: note.trim() || null,
      });
      router.replace({ pathname: '/workout/summary/[sessionId]', params: { sessionId } });
    };
    if (isImplausiblePace(distanceM, durationS, exercise.discipline)) {
      Alert.alert(fr.workout.paceCheck.title(formatPace(pace ?? 0)), fr.workout.paceCheck.message, [
        { text: fr.workout.paceCheck.fix, style: 'cancel' },
        { text: fr.workout.paceCheck.keep, onPress: write },
      ]);
      return;
    }
    write();
  };

  return (
    <KeyboardScreen contentClassName="gap-5 px-screen">
      <View className="flex-row items-center justify-between">
        <Button
          label={t.cancel}
          variant="ghost"
          tone="muted"
          size="sm"
          onPress={() => router.back()}
        />
      </View>
      <Heading size={40}>{t.title}</Heading>

      {options.length === 0 || !exercise ? (
        <Text className="font-body text-15 text-muted">{t.noExercise}</Text>
      ) : (
        <>
          <View className="gap-2">
            <Overline>{t.exercise}</Overline>
            <ChipGroup
              layout="scroll"
              size="sm"
              options={options.map((e) => ({ value: e.id, label: e.name }))}
              value={exercise.id}
              onChange={setChosen}
              className="-mr-screen"
            />
          </View>

          <View className="flex-row gap-3">
            <TextField
              label={t.distance}
              labelStyle="overline"
              value={distanceText}
              onChangeText={setDistanceText}
              placeholder="10"
              keyboardType="decimal-pad"
              returnKeyType="done"
              error={showErrors && distanceM === null ? t.invalidDistance : undefined}
              className="flex-1"
            />
            <TextField
              label={t.time}
              labelStyle="overline"
              value={timeText}
              onChangeText={setTimeText}
              placeholder={t.timePlaceholder}
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
              error={showErrors && durationS === null ? t.invalidTime : undefined}
              className="flex-1"
            />
          </View>
          <Text className="-mt-3 font-body text-13 text-muted">{t.timeHint}</Text>

          <View className="items-center rounded-card bg-surface p-4">
            {pace !== null ? (
              <Text className="px-2 font-display text-34 text-volt">
                {t.pace(formatPace(pace))}
              </Text>
            ) : (
              <Text className="text-center font-body text-14 text-muted">{t.paceEmpty}</Text>
            )}
          </View>

          <View className="gap-2">
            <Overline>{t.day}</Overline>
            <View className="flex-row items-center gap-3">
              <IconButton
                icon={ChevronLeft}
                accessibilityLabel={t.prevDay}
                onPress={() => setDaysAgo((d) => Math.min(MAX_DAYS_AGO, d + 1))}
              />
              <Text className="flex-1 text-center font-body-bold text-17 text-text">
                {dayLabel}
              </Text>
              <IconButton
                icon={ChevronRight}
                accessibilityLabel={t.nextDay}
                disabled={daysAgo === 0}
                onPress={() => setDaysAgo((d) => Math.max(0, d - 1))}
              />
            </View>
          </View>

          <TextField
            label={t.note}
            labelStyle="overline"
            value={note}
            onChangeText={setNote}
            placeholder={t.notePlaceholder}
            multiline
          />

          <Button label={t.save} onPress={save} className="mt-2" />
        </>
      )}
    </KeyboardScreen>
  );
}
