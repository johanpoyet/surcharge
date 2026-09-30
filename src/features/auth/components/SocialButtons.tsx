import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { fr } from '@/i18n/fr';
import { radii } from '@/theme/tokens';
import { authErrorMessage } from '../errors';
import {
  appleSignInAvailable,
  SignInCanceledError,
  signInWithApple,
  signInWithGoogle,
  type SocialSignInResult,
} from '../social';
import { GoogleLogo } from './GoogleLogo';

const BUTTON_HEIGHT = 50;

/**
 * Apple et Google (SPEC 11 : Apple obligatoire dès qu'on propose Google). Bouton officiel
 * d'Apple ; bouton Google avec son logo « G ».
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

  const [busy, setBusy] = useState(false);

  const run = async (signIn: () => Promise<SocialSignInResult>) => {
    setBusy(true);
    // Avant l'appel : un nouveau compte doit arriver sur l'onboarding, pas sur l'accueil.
    setOnboardingPending(true);
    try {
      const { isNew } = await signIn();
      if (!isNew) setOnboardingPending(false);
    } catch (error) {
      setOnboardingPending(false);
      if (error instanceof SignInCanceledError) return;
      // En développement : l'erreur exacte dans le terminal de Metro (diagnostic).
      if (__DEV__) console.warn('Connexion sociale refusée :', error);
      toast.show(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

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
          onPress={() => void run(signInWithApple)}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.googleA11y}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => void run(signInWithGoogle)}
        className="h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-input border border-line active:opacity-80"
      >
        <GoogleLogo />
        <Text className="font-body-semibold text-15 text-text">
          {prefixed ? s.withGoogle : s.google}
        </Text>
      </Pressable>
    </View>
  );
}
