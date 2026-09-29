import { router } from 'expo-router';
import { Alert } from 'react-native';

import { useToast } from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { listTemplates } from '@/features/templates/repository';
import { fr } from '@/i18n/fr';
import { getActiveSession } from './repository';
import { startFromTemplate } from './start';

const t = fr.workout;

const openWorkout = (sessionId: string) =>
  router.push({ pathname: '/workout/[sessionId]', params: { sessionId } });

/** Démarrer une séance type, ou reprendre celle en cours. */
export function useStartWorkout() {
  const toast = useToast();
  const userId = useAuth().session?.user.id ?? '';

  const start = (templateId: string) => {
    if (!userId) return;
    const { sessionId, resumed } = startFromTemplate(db, userId, templateId);
    if (resumed) toast.show(t.resumed);
    openWorkout(sessionId);
  };

  /** Bouton + central : reprend la séance en cours, sinon propose les séances types. */
  const startOrChoose = () => {
    if (!userId) return;
    const active = getActiveSession(db, userId);
    if (active) return openWorkout(active.id);
    const templates = listTemplates(db, userId);
    if (templates.length === 0) {
      toast.show(t.noTemplates);
      return router.push('/templates/new');
    }
    Alert.alert(t.chooseTemplate, undefined, [
      ...templates.map((template) => ({ text: template.name, onPress: () => start(template.id) })),
      { text: t.cancel, style: 'cancel' as const },
    ]);
  };

  return { start, startOrChoose, openWorkout };
}
