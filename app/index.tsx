import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fr } from '@/i18n/fr';

// Écran de test de la Phase 0 : remplacé par la garde d'auth en Phase 2.
export default function SetupScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 justify-center px-auth">
        <Text className="font-display text-60 uppercase leading-[55px] text-text">
          {fr.dev.setupTitle}
        </Text>
        <Text className="mt-4 font-body text-16 text-muted">{fr.dev.setupSubtitle}</Text>
      </View>
    </SafeAreaView>
  );
}
