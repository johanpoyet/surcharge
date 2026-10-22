import { router, type Href } from 'expo-router';

/**
 * Retour en arrière, ou vers `fallback` si l'écran a été ouvert directement (lien d'invitation,
 * notification) et n'a pas d'écran précédent.
 */
export function goBack(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
