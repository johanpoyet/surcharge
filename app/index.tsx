import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandWatermark, Button, Logo, StackedTitle } from '@/components/ui';
import { fr } from '@/i18n/fr';

// Écran temporaire : remplacé par la garde d'auth en Phase 2.
export default function SetupScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <BrandWatermark className="-right-[120px] top-10" />
      <View className="flex-1 justify-center gap-6 px-auth">
        <View className="flex-row items-center gap-2.5">
          <Logo />
          <Text className="font-display text-24 text-text">{fr.app.name.toUpperCase()}</Text>
        </View>
        <StackedTitle
          lines={fr.app.tagline.map((text, index) => ({
            text,
            accent: index === fr.app.tagline.length - 1,
          }))}
        />
        <Text className="font-body text-16 text-muted">{fr.dev.setupSubtitle}</Text>
        {__DEV__ ? (
          <Button
            label={fr.dev.openComponents}
            withArrow
            onPress={() => router.push('/_dev/components')}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
