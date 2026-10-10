import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { Check, GripVertical, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { KindIcons } from '@/features/templates/components/KindIcons';
import type { SessionKind } from '@/features/templates/kinds';
import { formatEstimate } from '@/features/templates/format';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { toLocalDateString } from '@/lib/format';
import { colors } from '@/theme/tokens';
import { planForDay } from '../calendar';
import type { TemplateInfo } from '../hooks';
import { dayTitle } from '../useDayActions';

const t = fr.planning;

type WeekViewProps = {
  days: readonly Date[];
  weekly: ReadonlyMap<number, string>;
  overrides: ReadonlyMap<string, string | null>;
  templates: ReadonlyMap<string, TemplateInfo>;
  /** Date locale → nom de la séance terminée ce jour-là. */
  doneSessions: ReadonlyMap<string, string>;
  /** Date locale → types des séances terminées ce jour-là (pictogrammes). */
  doneKinds: ReadonlyMap<string, SessionKind[]>;
  onDayPress: (date: Date) => void;
};

/** Vue Semaine : 7 lignes jour + carte séance (ou « Repos » en pointillé). */
export function WeekView({
  days,
  weekly,
  overrides,
  templates,
  doneSessions,
  doneKinds,
  onDayPress,
}: WeekViewProps) {
  const todayKey = toLocalDateString(new Date());
  return (
    <View className="gap-1.5">
      {days.map((date, index) => {
        const plan = planForDay(date, overrides, weekly);
        const info = plan.templateId ? templates.get(plan.templateId) : undefined;
        const isToday = plan.date === todayKey;
        const doneName = doneSessions.get(plan.date);
        const done = doneName !== undefined;
        // Séance faite un jour de repos : on affiche celle réalisée plutôt que « Repos ».
        const title = info?.name ?? doneName;
        // Pictogrammes : ce qui a été fait ce jour-là, sinon ce qui est prévu.
        const kinds = doneKinds.get(plan.date) ?? info?.kinds ?? [];
        const a11yPlan = title ?? t.rest;
        return (
          <View key={plan.date} className="flex-row items-center gap-2.5">
            <View className="w-11 items-center">
              <Text
                className={cn(
                  'font-body-bold text-11 uppercase tracking-wide',
                  isToday ? 'text-volt' : 'text-muted',
                )}
              >
                {fr.weekdays.short[index]?.replace('.', '')}
              </Text>
              <Text className={cn('font-display text-22', isToday ? 'text-volt' : 'text-text')}>
                {format(date, 'd', { locale: frLocale })}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.dayA11y(dayTitle(date), a11yPlan)}
              onPress={() => onDayPress(date)}
              onLongPress={() => onDayPress(date)}
              className={cn(
                'h-[58px] flex-1 flex-row items-center justify-between gap-2.5 rounded-input px-3 active:opacity-80',
                title ? 'bg-surface' : 'border border-dashed border-line',
                info && isToday && 'border-[1.5px] border-volt',
              )}
            >
              {title ? (
                <KindIcons
                  kinds={kinds}
                  size={kinds.length > 1 ? 15 : 18}
                  color={done || isToday ? colors.volt : colors.muted}
                  className="w-9 justify-center"
                />
              ) : null}
              {title ? (
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-display text-20 uppercase text-text">
                    {title}
                  </Text>
                  <Text className="font-body text-13 text-muted">
                    {info
                      ? t.exercisesMinutes(info.exerciseCount, formatEstimate(info.minutes))
                      : t.offPlan}
                    {info && plan.source === 'override' ? ` · ${t.onlyThisDay}` : ''}
                  </Text>
                </View>
              ) : (
                <Text className="flex-1 font-body-semibold text-15 text-muted">
                  {t.rest}
                  {plan.source === 'override' ? ` · ${t.onlyThisDay}` : ''}
                </Text>
              )}
              {done ? (
                <View className="h-6 flex-row items-center gap-1 rounded-tag bg-volt-soft px-2">
                  <Check size={14} color={colors.volt} strokeWidth={3} />
                  <Text className="font-body-bold text-12 text-volt">{t.done}</Text>
                </View>
              ) : info && isToday ? (
                <View className="h-6 justify-center rounded-tag bg-volt px-2">
                  <Text className="font-body-bold text-12 text-onVolt">{t.today}</Text>
                </View>
              ) : info ? (
                <GripVertical size={18} color={colors.faint} strokeWidth={2} />
              ) : (
                <Plus size={20} color={colors.muted} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
