import * as Notifications from 'expo-notifications';

import { fr } from '@/i18n/fr';

const KIND = 'reminder';
const REMINDER_HOUR = 9;

export type ReminderDay = { date: Date; name: string };

/**
 * Rappels des jours de séance (SPEC 10) : « Aujourd'hui : Push A » à 9 h 00. Tous les rappels
 * sont reprogrammés à chaque modification du planning. L'autorisation n'est jamais demandée ici
 * (elle l'est au premier chrono de repos) : sans elle, pas de rappel.
 */
export async function rescheduleReminders(days: readonly ReminderDay[], enabled: boolean) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.content.data?.kind === KIND)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    if (!enabled) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const now = Date.now();
    for (const day of days) {
      const at = new Date(
        day.date.getFullYear(),
        day.date.getMonth(),
        day.date.getDate(),
        REMINDER_HOUR,
      );
      if (at.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: fr.app.name, body: fr.reminders.body(day.name), data: { kind: KIND } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  } catch {
    // Les rappels sont un confort : un échec ne doit jamais bloquer l'app.
  }
}
