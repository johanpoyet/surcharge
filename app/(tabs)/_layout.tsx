import { Tabs } from 'expo-router';
import { CalendarDays, House, UserRound, UsersRound } from 'lucide-react-native';
import { useEffect, type ComponentProps } from 'react';
import { AppState } from 'react-native';

import { TabBar } from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useReminderSync } from '@/features/planning/useReminderSync';
import { refreshFriendsBadge, useFriendsBadge } from '@/features/social/hooks';
import { ActiveWorkoutBar } from '@/features/workout/components/ActiveWorkoutBar';
import { getActiveSession } from '@/features/workout/repository';
import { useStartWorkout } from '@/features/workout/useStartWorkout';
import { fr } from '@/i18n/fr';
import { useSync } from '@/sync/useSync';

type RouteName = 'index' | 'sessions/index' | 'friends' | 'profile';

const ITEMS = [
  { key: 'index', label: fr.tabs.home, icon: House },
  { key: 'sessions/index', label: fr.tabs.training, icon: CalendarDays },
  { key: 'friends', label: fr.tabs.friends, icon: UsersRound },
  { key: 'profile', label: fr.tabs.profile, icon: UserRound },
] as const;

type TabBarRenderProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function AppTabBar({ state, navigation }: TabBarRenderProps) {
  const { startOrChoose, openWorkout } = useStartWorkout();
  const active = state.routes[state.index]?.name as RouteName | undefined;
  const friendsBadge = useFriendsBadge((s) => s.pending + s.kudos);
  return (
    <>
      <ActiveWorkoutBar onOpen={openWorkout} />
      <TabBar
        items={ITEMS}
        activeKey={active ?? 'index'}
        onSelect={(key) => navigation.navigate(key)}
        onCenterPress={startOrChoose}
        badges={{ friends: friendsBadge }}
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
  useSync();

  // Badge Amis : à l'ouverture et à chaque retour au premier plan (pas de push serveur en V2).
  useEffect(() => {
    if (!userId) return;
    void refreshFriendsBadge(userId);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshFriendsBadge(userId);
    });
    return () => subscription.remove();
  }, [userId]);

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
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
