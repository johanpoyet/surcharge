import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { useToast } from '@/components/ui';
import { fr } from '@/i18n/fr';
import { pickExercisePhoto, PhotoPermissionError, type PhotoSource } from './photos';

const t = fr.exercises.photo;

/** Prend ou choisit une photo ; gère refus d'autorisation et erreurs. */
export function usePhotoPicker() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async (source: PhotoSource): Promise<string | null> => {
    setBusy(true);
    try {
      return await pickExercisePhoto(source);
    } catch (error) {
      if (error instanceof PhotoPermissionError) {
        Alert.alert(t.chooseTitle, source === 'camera' ? t.permissionCamera : t.permissionLibrary, [
          { text: t.cancel, style: 'cancel' },
          { text: fr.common.settings, onPress: () => void Linking.openSettings() },
        ]);
      } else {
        toast.show(t.failed);
      }
      return null;
    } finally {
      setBusy(false);
    }
  };

  /** Feuille de choix : appareil photo, galerie, (retirer), annuler. */
  const choose = (onPicked: (uri: string) => void, onRemove?: () => void) => {
    Alert.alert(t.chooseTitle, undefined, [
      {
        text: fr.photo.camera,
        onPress: () => void pick('camera').then((uri) => uri && onPicked(uri)),
      },
      {
        text: fr.photo.gallery,
        onPress: () => void pick('library').then((uri) => uri && onPicked(uri)),
      },
      ...(onRemove ? [{ text: t.remove, style: 'destructive' as const, onPress: onRemove }] : []),
      { text: t.cancel, style: 'cancel' as const },
    ]);
  };

  return { pick, choose, busy };
}
