import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { monthGrid, planForDay } from '@/features/planning/calendar';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { toLocalDateString } from '@/lib/format';

const t = fr.home.regularity;

type RegularityCalendarProps = {
  today: Date;
  doneDates: ReadonlySet<string>;
  recordDates: ReadonlySet<string>;
  weekly: ReadonlyMap<number, string>;
  overrides: ReadonlyMap<string, string | null>;
};

/** Calendrier du mois : fait (volt), prévu (pointillé), aujourd'hui (bordure), record (point). */
export function RegularityCalendar({
  today,
  doneDates,
  recordDates,
  weekly,
  overrides,
}: RegularityCalendarProps) {
  const month = today.getMonth();
  const todayKey = toLocalDateString(today);
  const weeks = monthGrid(today.getFullYear(), month);

  return (
    <Card>
      <View className="flex-row items-baseline justify-between">
        <Text className="font-body-bold text-18 text-text">{t.title}</Text>
        <Text className="font-body-semibold text-13 uppercase tracking-wide text-muted">
          {format(today, 'MMM yyyy', { locale: frLocale })}
        </Text>
      </View>
      <View className="mt-3 flex-row gap-1.5">
        {fr.weekdays.letters.map((letter, i) => (
          <Text key={i} className="flex-1 text-center font-body-bold text-11 text-muted">
            {letter}
          </Text>
        ))}
      </View>
      <View className="mt-1.5 gap-1.5">
        {weeks.map((week) => (
          <View key={toLocalDateString(week[0]!)} className="flex-row gap-1.5">
            {week.map((date) => {
              const key = toLocalDateString(date);
              if (date.getMonth() !== month)
                return <View key={key} className="aspect-square flex-1" />;
              const done = doneDates.has(key);
              const isToday = key === todayKey;
              const planned =
                !done && key > todayKey && planForDay(date, overrides, weekly).templateId !== null;
              return (
                <View
                  key={key}
                  className={cn(
                    'aspect-square flex-1 items-center justify-center rounded-sm',
                    done && 'bg-volt',
                    !done && isToday && 'border-2 border-volt bg-volt-soft',
                    !done && !isToday && planned && 'border-[1.5px] border-dashed border-volt',
                    !done && !isToday && !planned && 'bg-surface2',
                  )}
                >
                  <Text
                    className={cn(
                      'text-12',
                      done
                        ? 'font-body-bold text-onVolt'
                        : isToday || planned
                          ? 'font-body-bold text-volt'
                          : 'font-body text-faint',
                    )}
                  >
                    {date.getDate()}
                  </Text>
                  {recordDates.has(key) ? (
                    <View
                      className={cn(
                        'absolute right-1 top-1 h-1.5 w-1.5 rounded-full',
                        done ? 'bg-onVolt' : 'bg-volt',
                      )}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View className="mt-3 flex-row gap-4">
        <Legend label={t.done} swatch="bg-volt" />
        <Legend label={t.planned} swatch="border-[1.5px] border-dashed border-volt" />
        <Legend label={t.record} swatch="bg-volt" dot />
      </View>
    </Card>
  );
}

function Legend({ label, swatch, dot = false }: { label: string; swatch: string; dot?: boolean }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={cn('h-3 w-3 rounded-[4px]', swatch)}>
        {dot ? (
          <View className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-onVolt" />
        ) : null}
      </View>
      <Text className="font-body text-12 text-muted">{label}</Text>
    </View>
  );
}
