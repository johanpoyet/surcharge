import { useEffect, useMemo } from 'react';

import { useProfile } from '@/features/profile/hooks';
import { addDays, planForDay } from './calendar';
import { usePlanning } from './hooks';
import { rescheduleReminders } from './reminders';

const DAYS_AHEAD = 14;

/** Reprogramme les rappels des 14 prochains jours quand le planning ou le réglage change. */
export function useReminderSync(): void {
  const { weekly, overrides, templates } = usePlanning();
  const enabled = useProfile().profile?.remindersEnabled ?? true;
  const todayKey = new Date().toDateString();

  const days = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(start, i)).flatMap((date) => {
      const plan = planForDay(date, overrides, weekly);
      const name = plan.templateId ? templates.get(plan.templateId)?.name : undefined;
      return name ? [{ date, name }] : [];
    });
    // Recalcul chaque jour (todayKey) et à chaque changement de planning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, templates, weekly, todayKey]);

  const signature = JSON.stringify([enabled, days.map((d) => [d.date.getTime(), d.name])]);
  useEffect(() => {
    void rescheduleReminders(days, enabled);
    // La signature résume `days` et `enabled`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}
