import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { IconButton, SegmentedControl, Switch } from '@/components/ui';
import { useDoneDates } from '@/features/workout/hooks';
import { fr } from '@/i18n/fr';
import { addDays, monthGrid, planForDay, startOfWeek, weekDays } from '../calendar';
import { usePlanning } from '../hooks';
import { useDayActions } from '../useDayActions';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';

const t = fr.planning;
const REPEAT_KEY = 'planning.repeat';
type Mode = 'week' | 'month';
const MODES = [
  { value: 'week' as const, label: t.week },
  { value: 'month' as const, label: t.month },
];
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Onglet Planning : semaine / mois, choix par jour, « Répéter chaque semaine » (SPEC 8.3). */
export function PlanningPanel() {
  const { weekly, overrides, templates } = usePlanning();
  const doneDates = useDoneDates();
  const [mode, setMode] = useState<Mode>('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthDate, setMonthDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [repeat, setRepeat] = useState(true);

  // Préférence de l'appareil (confort) : relue au montage, enregistrée à chaque changement.
  useEffect(() => {
    AsyncStorage.getItem(REPEAT_KEY)
      .then((value) => {
        if (value !== null) setRepeat(value === '1');
      })
      .catch(() => undefined);
  }, []);
  const changeRepeat = (value: boolean) => {
    setRepeat(value);
    void AsyncStorage.setItem(REPEAT_KEY, value ? '1' : '0').catch(() => undefined);
  };

  const days = weekDays(weekStart);
  const { open } = useDayActions(templates, repeat);
  const weekLabel = `${format(days[0]!, 'd MMM', { locale: frLocale })} – ${format(days[6]!, 'd MMM', { locale: frLocale })}`;
  const monthLabel = capitalize(format(monthDate, 'MMMM yyyy', { locale: frLocale }));
  const weeks = monthGrid(monthDate.getFullYear(), monthDate.getMonth());

  const shift = (delta: number) =>
    mode === 'week'
      ? setWeekStart((d) => addDays(d, 7 * delta))
      : setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));

  return (
    <ScrollView contentContainerClassName="gap-3.5 px-screen pb-6 pt-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <IconButton
            icon={ChevronLeft}
            size="sm"
            accessibilityLabel={mode === 'week' ? t.prevWeek : t.prevMonth}
            onPress={() => shift(-1)}
          />
          <Text className="px-1.5 font-body-bold text-15 text-text">
            {mode === 'week' ? weekLabel : monthLabel}
          </Text>
          <IconButton
            icon={ChevronRight}
            size="sm"
            accessibilityLabel={mode === 'week' ? t.nextWeek : t.nextMonth}
            onPress={() => shift(1)}
          />
        </View>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} />
      </View>

      {mode === 'week' ? (
        <WeekView
          days={days}
          weekly={weekly}
          overrides={overrides}
          templates={templates}
          doneDates={doneDates}
          onDayPress={(date) => open(date, planForDay(date, overrides, weekly), days)}
        />
      ) : (
        <MonthView
          weeks={weeks}
          month={monthDate.getMonth()}
          monthName={format(monthDate, 'MMMM', { locale: frLocale })}
          weekly={weekly}
          overrides={overrides}
          templates={templates}
          doneDates={doneDates}
          onDayPress={(date) =>
            open(date, planForDay(date, overrides, weekly), weekDays(startOfWeek(date)))
          }
        />
      )}

      <View className="min-h-[52px] flex-row items-center justify-between gap-3 rounded-input bg-surface py-2 pl-3.5 pr-3">
        <View className="flex-1">
          <Text className="font-body-semibold text-15 text-text">{t.repeat}</Text>
          <Text className="font-body-medium text-12 text-muted">
            {repeat ? t.repeatOn : t.repeatOff}
          </Text>
        </View>
        <Switch value={repeat} onValueChange={changeRepeat} accessibilityLabel={t.repeat} />
      </View>
    </ScrollView>
  );
}
