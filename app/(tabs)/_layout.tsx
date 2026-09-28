import { Tabs } from 'expo-router';
import { CalendarDays, Dumbbell, House, UserRound } from 'lucide-react-native';
import type { ComponentProps } from 'react';

import { TabBar, useToast } from '@/components/ui';
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
  const toast = useToast();
  const active = state.routes[state.index]?.name as RouteName | undefined;
  return (
    <TabBar
      items={ITEMS}
      activeKey={active ?? 'index'}
      onSelect={(key) => navigation.navigate(key)}
      // Démarrer une séance : Phase 6.
      onCenterPress={() => toast.show(fr.placeholders.workout)}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sessions/index" />
      <Tabs.Screen name="exercises/index" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
