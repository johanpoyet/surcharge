import { Pressable, Text, View } from 'react-native';

import { KindIcons } from '@/features/templates/components/KindIcons';
import type { SessionKind } from '@/features/templates/kinds';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { toLocalDateString } from '@/lib/format';
import { colors } from '@/theme/tokens';
import { countPlanned, monthLabel, planForDay } from '../calendar';
import type { TemplateInfo } from '../hooks';
import { dayTitle } from '../useDayActions';

const t = fr.planning;

type MonthViewProps = {
  weeks: readonly (readonly Date[])[];
  month: number;
  monthName: string;
  weekly: ReadonlyMap<number, string>;
  overrides: ReadonlyMap<string, string | null>;
  templates: ReadonlyMap<string, TemplateInfo>;
  /** Date locale → nom de la séance terminée ce jour-là. */
  doneSessions: ReadonlyMap<string, string>;
  /** Date locale → types des séances terminées ce jour-là (pictogrammes). */
  doneKinds: ReadonlyMap<string, SessionKind[]>;
  onDayPress: (date: Date) => void;
};

/** Vue Mois : grille avec étiquettes, jours hors mois grisés, total et répartition. */
export function MonthView({
  weeks,
  month,
  monthName,
  weekly,
  overrides,
  templates,
  doneSessions,
  doneKinds,
  onDayPress,
}: MonthViewProps) {
  const todayKey = toLocalDateString(new Date());
  const inMonthPlans = weeks
    .flat()
    .filter((date) => date.getMonth() === month)
    .map((date) => planForDay(date, overrides, weekly));
  const counts = countPlanned(inMonthPlans);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);

  return (
    <View className="gap-3">
      <View>
        <View className="mb-1.5 flex-row gap-[5px]">
          {fr.weekdays.letters.map((letter, i) => (
            <Text key={i} className="flex-1 text-center font-body-bold text-11 text-muted">
              {letter}
            </Text>
          ))}
        </View>
        <View className="gap-[5px]">
          {weeks.map((week) => (
            <View key={toLocalDateString(week[0]!)} className="flex-row gap-[5px]">
              {week.map((date) => {
                const plan = planForDay(date, overrides, weekly);
                const info = plan.templateId ? templates.get(plan.templateId) : undefined;
                const inMonth = date.getMonth() === month;
                const isToday = plan.date === todayKey;
                const doneName = doneSessions.get(plan.date);
                const done = doneName !== undefined;
                const label = info?.name ?? doneName;
                const kinds = doneKinds.get(plan.date) ?? info?.kinds ?? [];
                return (
                  <Pressable
                    key={plan.date}
                    accessibilityRole="button"
                    accessibilityLabel={t.dayA11y(dayTitle(date), label ?? t.rest)}
                    onPress={() => onDayPress(date)}
                    className={cn(
                      'h-[60px] flex-1 justify-between rounded-button p-[5px] active:opacity-80',
                      isToday ? 'border-2 border-volt bg-volt-subtle' : 'bg-surface',
                      !inMonth && 'opacity-40',
                    )}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={cn(
                          'text-12',
                          isToday ? 'font-body-bold text-volt' : 'font-body-semibold text-text',
                          !inMonth && 'text-faint',
                        )}
                      >
                        {date.getDate()}
                      </Text>
                      {label ? (
                        <KindIcons
                          kinds={kinds}
                          size={kinds.length > 1 ? 10 : 12}
                          color={done || isToday ? colors.volt : colors.muted}
                        />
                      ) : null}
                    </View>
                    {label ? (
                      <View
                        className={cn(
                          'h-[18px] items-center justify-center rounded-[5px]',
                          done || isToday ? 'bg-volt' : 'border border-volt',
                        )}
                      >
                        <Text
                          numberOfLines={1}
                          className={cn(
                            'font-body-bold text-10',
                            done || isToday ? 'text-onVolt' : 'text-volt',
                          )}
                        >
                          {monthLabel(label)}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-3 rounded-cardSm bg-surface p-4">
        <View>
          <Text className="font-display text-26 text-text">{t.monthTotal(total)}</Text>
          <Text className="font-body text-13 text-muted">{t.monthCaption(monthName)}</Text>
        </View>
        <View className="flex-1 flex-row flex-wrap justify-end gap-1.5">
          {[...counts.entries()].map(([templateId, count]) => (
            <View key={templateId} className="h-7 justify-center rounded-sm bg-surface2 px-2.5">
              <Text className="font-body-bold text-13 text-text">
                {`${templates.get(templateId)?.name ?? ''} ${count}`}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
