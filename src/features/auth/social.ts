import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { config } from '@/config';
import { supabase } from '@/lib/supabase';

/** Compte créé à l'instant : création et première connexion quasi simultanées. */
export function isNewAccount(
  user: { created_at: string; last_sign_in_at?: string | null },
  toleranceMs = 60_000,
): boolean {
  if (!user.last_sign_in_at) return true;
  return Math.abs(Date.parse(user.last_sign_in_at) - Date.parse(user.created_at)) < toleranceMs;
}

/** Apple disponible : iOS, et app compilée avec la capacité (voir SANS_APPLE_SIGNIN, app.config.js). */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' || Constants.expoConfig?.ios?.usesAppleSignIn === false) return false;
  return AppleAuthentication.isAvailableAsync();
}

/** Annulation par l'utilisateur (pas une erreur à afficher). */
export class SignInCanceledError extends Error {
  constructor() {
    super('Connexion annulée');
    this.name = 'SignInCanceledError';
  }
}

export type SocialSignInResult = { isNew: boolean };

/**
 * « Se connecter avec Apple » (SPEC 2, 11) : jeton d'identité Apple vérifié par Supabase.
 * Le nonce est envoyé haché à Apple et en clair à Supabase (protection contre le rejeu).
 * Apple ne donne le prénom qu'à la toute première autorisation : il est alors enregistré.
 */
export async function signInWithApple(): Promise<SocialSignInResult> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED')
      throw new SignInCanceledError();
    throw error;
  }
  if (!credential.identityToken) throw new Error('Jeton Apple manquant');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  const firstName = credential.fullName?.givenName?.trim();
  if (firstName && data.user) {
    // Le profil a été créé par le trigger avec le début de l'e-mail : on met le vrai prénom.
    await supabase.auth.updateUser({ data: { first_name: firstName } });
    await supabase.from('profiles').update({ first_name: firstName }).eq('id', data.user.id);
  }
  return { isNew: data.user ? isNewAccount(data.user) : false };
}

let googleConfigured = false;

/**
 * « Se connecter avec Google » : jeton d'identité Google vérifié par Supabase (le prénom vient
 * de `given_name`, repris par le trigger de création du profil).
 */
export async function signInWithGoogle(): Promise<SocialSignInResult> {
  if (!googleConfigured) {
    GoogleSignin.configure({
      iosClientId: config.googleIosClientId,
      webClientId: config.googleWebClientId,
    });
    googleConfigured = true;
  }
  let idToken: string | null = null;
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new SignInCanceledError();
    idToken = response.data.idToken;
  } catch (error) {
    if (
      error instanceof SignInCanceledError ||
      (isErrorWithCode(error) &&
        (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS))
    ) {
      throw new SignInCanceledError();
    }
    throw error;
  }
  if (!idToken) throw new Error('Jeton Google manquant');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  return { isNew: data.user ? isNewAccount(data.user) : false };
}
