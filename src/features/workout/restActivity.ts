import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { fr } from '@/i18n/fr';
import { colors } from '@/theme/tokens';
import RestActivity from './RestActivityWidget';

/**
 * Chrono de repos en Live Activity (Dynamic Island, écran verrouillé) : il reste visible quand
 * on quitte l'app, et un appui rouvre la séance. iOS seulement ; en cas d'échec (iOS ancien,
 * Live Activities désactivées dans les réglages), le chrono reste dans l'app et la notification
 * de fin de repos est inchangée.
 */
export function startRestActivity(params: {
  sessionId: string;
  startedAt: number;
  endsAt: number;
  nextSetNumber: number;
  exerciseName: string;
}): void {
  if (Platform.OS !== 'ios') return;
  endRestActivities();
  try {
    RestActivity.start(
      {
        startedAt: params.startedAt,
        endsAt: params.endsAt,
        title: fr.workout.rest.activityTitle,
        next: fr.workout.rest.activityNext(params.nextSetNumber, params.exerciseName),
        volt: colors.volt,
        text: colors.text,
        muted: colors.muted,
        bg: colors.bg,
      },
      Linking.createURL(`/workout/${params.sessionId}`),
      // Après la fin du repos, iOS signale le contenu comme périmé.
      new Date(params.endsAt),
    );
  } catch {
    // Live Activity indisponible : rien d'autre à faire.
  }
}

/** Retire le chrono (repos passé, série validée, séance terminée). */
export function endRestActivities(): void {
  if (Platform.OS !== 'ios') return;
  try {
    for (const activity of RestActivity.getInstances()) {
      void activity.end('immediate').catch(() => undefined);
    }
  } catch {
    // Module natif absent (build sans Live Activities) : rien à retirer.
  }
}
