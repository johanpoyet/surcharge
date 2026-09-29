import '../global.css';

import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import { BarlowCondensed_800ExtraBold_Italic } from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/ui';
import { liveDb } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { configureNotifications } from '@/features/workout/restNotifications';
import { fr } from '@/i18n/fr';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
configureNotifications();

/** Garde de navigation : non connecté → (auth) ; connecté → onglets (sauf onboarding en cours). */
function RootNavigator() {
  const { session, initializing, onboardingPending } = useAuth();
  // Base locale : migrations Drizzle appliquées avant tout écran (SQLite = source de vérité).
  const migration = useMigrations(liveDb, migrations);
  const ready = !initializing && (migration.success || migration.error !== undefined);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  if (migration.error) {
    return (
      <View className="flex-1 justify-center bg-bg px-screen">
        <Text className="font-body-semibold text-16 text-text">{fr.errors.database}</Text>
      </View>
    );
  }

  const signedIn = session !== null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={signedIn && !onboardingPending}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercises/new" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="exercises/[id]" />
        <Stack.Screen name="exercises/[id]/edit" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="templates/new" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="templates/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="templates/pick-exercises" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="workout/[sessionId]"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="workout/summary/[sessionId]"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen name="body-weight" options={{ presentation: 'modal' }} />
        <Stack.Screen name="_dev/components" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn || onboardingPending}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_800ExtraBold_Italic,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
  });

  if (!fontsLoaded && fontError === null) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
