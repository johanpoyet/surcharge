import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Heading, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { signOut } from '@/features/auth/api';
import { authErrorMessage } from '@/features/auth/errors';
import { useProfile } from '@/features/profile/hooks';
import { usePendingChanges } from '@/sync/hooks';
import { fr } from '@/i18n/fr';

export default function ProfileScreen() {
  const toast = useToast();
  const { session } = useAuth();
  const { firstName } = useProfile();
  const pending = usePendingChanges();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      toast.show(authErrorMessage(error));
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-4 px-screen pt-3">
        <Heading size={34}>{fr.profile.title}</Heading>
        <Card className="flex-row items-center gap-3.5">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-card bg-volt">
            <Text className="font-display text-40 text-onVolt">
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-body-bold text-22 text-text">{firstName}</Text>
            <Text className="font-body text-14 text-muted">{session?.user.email}</Text>
          </View>
        </Card>
        <Text className="font-body text-13 text-muted">
          {pending === 0 ? fr.profile.synced : fr.profile.pending(pending)}
        </Text>
        <Card className="p-0">
          <Button
            label={fr.profile.signOut}
            variant="ghost"
            tone="danger"
            loading={signingOut}
            onPress={onSignOut}
            className="h-[54px] justify-start px-4"
          />
        </Card>
        {__DEV__ ? (
          <Button
            label={fr.dev.openComponents}
            variant="secondary"
            onPress={() => router.push('/_dev/components')}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
