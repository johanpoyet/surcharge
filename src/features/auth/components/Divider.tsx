import { Text, View } from 'react-native';

import { fr } from '@/i18n/fr';

/** Séparateur « ou ». */
export function OrDivider() {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-line" />
      <Text className="font-body text-13 text-muted">{fr.common.or}</Text>
      <View className="h-px flex-1 bg-line" />
    </View>
  );
}
