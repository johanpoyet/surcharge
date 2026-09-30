import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { fr } from '@/i18n/fr';
import { radii } from '@/theme/tokens';
import { authErrorMessage } from '../errors';
import { appleSignInAvailable, SignInCanceledError, signInWithApple } from '../social';

const BUTTON_HEIGHT = 50;

/**
 * Apple et Google (SPEC 11 : Apple obligatoire dès qu'on propose Google). Le bouton Apple est
 * le bouton officiel (règles de validation d'Apple) ; Google arrive avec ses identifiants OAuth.
 */
export function SocialButtons({ prefixed = false }: { prefixed?: boolean }) {
  const toast = useToast();
  const { setOnboardingPending } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const s = fr.auth.social;

  useEffect(() => {
    appleSignInAvailable()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const onApple = async () => {
    // Avant l'appel : un nouveau compte doit arriver sur l'onboarding, pas sur l'accueil.
    setOnboardingPending(true);
    try {
      const { isNew } = await signInWithApple();
      if (!isNew) setOnboardingPending(false);
    } catch (error) {
      setOnboardingPending(false);
      if (!(error instanceof SignInCanceledError)) toast.show(authErrorMessage(error));
    }
  };

  const soon = () => toast.show(s.googleSoon);

  return (
    <View className="flex-row gap-2.5">
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            prefixed
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={radii.input}
          style={{ flex: 1, height: BUTTON_HEIGHT }}
          onPress={() => void onApple()}
        />
      ) : null}
      <Button
        label={prefixed ? s.withGoogle : s.google}
        variant="secondary"
        className="flex-1"
        onPress={soon}
      />
    </View>
  );
}
