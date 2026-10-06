import { Linking, Platform, Text, View } from 'react-native';

import { BrandWatermark, Button, FullScreen, Logo, StackedTitle } from '@/components/ui';
import { config } from '@/config';
import { fr } from '@/i18n/fr';

const t = fr.forceUpdate;

/**
 * Écran bloquant quand la version de l'app est sous `min_supported_version`. Pas de Play Store
 * (APK distribué à la main) : sur Android, seulement la consigne.
 */
export function UpdateRequiredScreen() {
  return (
    <FullScreen className="overflow-hidden">
      <BrandWatermark className="-right-[120px] top-24" />
      <View className="flex-1 justify-center gap-6 px-screen">
        <Logo size={48} />
        <StackedTitle
          size={48}
          lines={[{ text: t.title[0] }, { text: t.title[1], accent: true }]}
        />
        <Text className="font-body text-16 leading-[24px] text-muted">
          {Platform.OS === 'ios' ? t.body : `${t.body} ${t.androidHint}`}
        </Text>
      </View>
      {Platform.OS === 'ios' && (
        <View className="px-screen pb-5">
          <Button
            label={t.button}
            withArrow
            onPress={() => void Linking.openURL(config.appStoreUrl)}
          />
        </View>
      )}
    </FullScreen>
  );
}
