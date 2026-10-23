import { Linking } from 'react-native';

/**
 * Ouvre la page de l'app dans les Réglages d'iOS (autorisations). iOS 27.1 refuse parfois
 * `openSettings` : on retente avec l'URL `app-settings:`. Faux si les deux échouent (l'écran
 * appelant affiche alors le chemin à suivre).
 */
export async function openAppSettings(): Promise<boolean> {
  try {
    await Linking.openSettings();
    return true;
  } catch {
    try {
      await Linking.openURL('app-settings:');
      return true;
    } catch {
      return false;
    }
  }
}
