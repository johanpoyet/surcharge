import * as Notifications from 'expo-notifications';

/**
 * Notification locale de fin de repos (SPEC 10). L'autorisation est demandée au premier chrono
 * de repos, pas au lancement de l'app.
 */
export async function scheduleRestEnd(
  seconds: number,
  title: string,
  body: string,
): Promise<string | null> {
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted' || seconds < 1) return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(seconds),
      },
    });
  } catch {
    // Pas de notification : le chrono reste visible dans l'app.
    return null;
  }
}

// iOS garde au plus 64 notifications programmées par app.
const MAX_SIGNALS = 60;

/**
 * Signaux d'un bloc chronométré (changements d'intervalle EMOM / Tabata, fin d'AMRAP) :
 * notifications locales programmées, qui sonnent même app en arrière-plan (SPEC_V2 §5.3).
 */
export async function scheduleSignals(
  title: string,
  signals: readonly { inSeconds: number; body: string }[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const signal of signals.filter((s) => s.inSeconds >= 1).slice(0, MAX_SIGNALS)) {
    const id = await scheduleRestEnd(signal.inSeconds, title, signal.body);
    if (id) ids.push(id);
  }
  return ids;
}

export function cancelSignals(ids: readonly string[] | undefined): void {
  for (const id of ids ?? []) cancelRestNotification(id);
}

export function cancelRestNotification(id: string | null | undefined): void {
  if (id) void Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

/** Au premier plan, le chrono s'affiche déjà : pas de bannière, seulement le son. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
