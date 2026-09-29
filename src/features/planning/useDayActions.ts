import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { Alert } from 'react-native';

import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { fr } from '@/i18n/fr';
import { toLocalDateString } from '@/lib/format';
import type { DayPlan } from './calendar';
import type { TemplateInfo } from './hooks';
import { assignDay, clearOverride, moveDay } from './repository';

const t = fr.planning;
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export const dayTitle = (date: Date) =>
  capitalize(format(date, 'EEEE d MMMM', { locale: frLocale }));

/** Menu d'un jour du planning : choisir une séance ou le repos, revenir au modèle, déplacer. */
export function useDayActions(templates: ReadonlyMap<string, TemplateInfo>, repeat: boolean) {
  const userId = useAuth().session?.user.id ?? '';

  const move = (date: Date, plan: DayPlan, targets: readonly Date[]) => {
    const templateId = plan.templateId;
    if (!templateId) return;
    const name = templates.get(templateId)?.name ?? '';
    Alert.alert(t.moveTitle(name), undefined, [
      ...targets
        .filter((target) => toLocalDateString(target) !== plan.date)
        .map((target) => ({
          text: capitalize(format(target, 'EEE d MMM', { locale: frLocale })),
          onPress: () => moveDay(db, userId, date, target, templateId),
        })),
      { text: t.cancel, style: 'cancel' as const },
    ]);
  };

  /** `moveTargets` : jours proposés pour « Déplacer vers… » (la semaine affichée). */
  const open = (date: Date, plan: DayPlan, moveTargets: readonly Date[]) => {
    if (!userId) return;
    if (templates.size === 0) {
      Alert.alert(dayTitle(date), t.noTemplates);
      return;
    }
    Alert.alert(dayTitle(date), repeat ? t.repeatOn : t.repeatOff, [
      ...[...templates.values()]
        .filter((info) => info.id !== plan.templateId)
        .map((info) => ({
          text: info.name,
          onPress: () => assignDay(db, userId, date, info.id, repeat),
        })),
      ...(plan.templateId
        ? [{ text: t.restOption, onPress: () => assignDay(db, userId, date, null, repeat) }]
        : []),
      ...(plan.templateId && moveTargets.length
        ? [{ text: t.moveOption, onPress: () => move(date, plan, moveTargets) }]
        : []),
      ...(plan.source === 'override'
        ? [{ text: t.resetOption, onPress: () => clearOverride(db, userId, plan.date) }]
        : []),
      { text: t.cancel, style: 'cancel' as const },
    ]);
  };

  return { open };
}
