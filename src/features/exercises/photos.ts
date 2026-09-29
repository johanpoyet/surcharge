import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { newId } from '@/lib/id';

// Compression avant stockage (SPEC 7) : côté le plus long 1080 px, JPEG qualité 0,7.
const MAX_SIDE = 1080;
const JPEG_QUALITY = 0.7;
const PHOTO_DIR = 'exercise-photos';

export type PhotoSource = 'camera' | 'library';

export class PhotoPermissionError extends Error {
  constructor(readonly source: PhotoSource) {
    super(`Permission refusée : ${source}`);
    this.name = 'PhotoPermissionError';
  }
}

/**
 * Photo prise ou choisie, compressée et copiée dans documentDirectory.
 * Retourne l'URI locale (affichable hors ligne), ou null si l'utilisateur annule.
 */
export async function pickExercisePhoto(source: PhotoSource): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new PhotoPermissionError(source);

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  const directory = new Directory(Paths.document, PHOTO_DIR);
  if (!directory.exists) directory.create({ intermediates: true });
  const destination = new File(directory, `${newId()}.jpg`);
  await new File(saved.uri).move(destination);
  return destination.uri;
}

/** Supprime une photo locale devenue inutile (remplacée, ou formulaire annulé). */
export function deleteLocalPhoto(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Fichier déjà absent : rien à faire.
  }
}
