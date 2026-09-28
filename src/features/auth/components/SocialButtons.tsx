import { View } from 'react-native';

import { Button, useToast } from '@/components/ui';
import { fr } from '@/i18n/fr';

/**
 * Apple et Google (SPEC section 11 : Apple obligatoire dès qu'on propose Google).
 * En attente du compte Apple Developer et des identifiants OAuth Google.
 */
export function SocialButtons({ prefixed = false }: { prefixed?: boolean }) {
  const toast = useToast();
  const soon = () => toast.show(fr.auth.social.soon);
  const s = fr.auth.social;
  return (
    <View className="flex-row gap-2.5">
      <Button
        label={prefixed ? s.withApple : s.apple}
        variant="secondary"
        className="flex-1"
        onPress={soon}
      />
      <Button
        label={prefixed ? s.withGoogle : s.google}
        variant="secondary"
        className="flex-1"
        onPress={soon}
      />
    </View>
  );
}
