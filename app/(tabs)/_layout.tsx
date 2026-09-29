import { Tabs } from 'expo-router';
import { CalendarDays, Dumbbell, House, UserRound } from 'lucide-react-native';
import { useEffect, type ComponentProps } from 'react';

import { TabBar } from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useReminderSync } from '@/features/planning/useReminderSync';
import { ActiveWorkoutBar } from '@/features/workout/components/ActiveWorkoutBar';
import { getActiveSession } from '@/features/workout/repository';
import { useStartWorkout } from '@/features/workout/useStartWorkout';
import { fr } from '@/i18n/fr';

type RouteName = 'index' | 'sessions/index' | 'exercises/index' | 'profile';

const ITEMS = [
  { key: 'index', label: fr.tabs.home, icon: House },
  { key: 'sessions/index', label: fr.tabs.sessions, icon: CalendarDays },
  { key: 'exercises/index', label: fr.tabs.exercises, icon: Dumbbell },
  { key: 'profile', label: fr.tabs.profile, icon: UserRound },
] as const;

type TabBarRenderProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function AppTabBar({ state, navigation }: TabBarRenderProps) {
  const { startOrChoose, openWorkout } = useStartWorkout();
  const active = state.routes[state.index]?.name as RouteName | undefined;
  return (
    <>
      <ActiveWorkoutBar onOpen={openWorkout} />
      <TabBar
        items={ITEMS}
        activeKey={active ?? 'index'}
        onSelect={(key) => navigation.navigate(key)}
        onCenterPress={startOrChoose}
      />
    </>
  );
}

// Une seule réouverture automatique par lancement de l'app.
let restoreChecked = false;

export default function TabsLayout() {
  const userId = useAuth().session?.user.id;
  const { openWorkout } = useStartWorkout();
  useReminderSync();

  // App tuée pendant une séance : on la rouvre directement sur la séance en cours (SPEC 8.2).
  useEffect(() => {
    if (restoreChecked || !userId) return;
    restoreChecked = true;
    const active = getActiveSession(db, userId);
    if (active) openWorkout(active.id);
  }, [openWorkout, userId]);

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sessions/index" />
      <Tabs.Screen name="exercises/index" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
