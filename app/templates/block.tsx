import { useLocalSearchParams } from 'expo-router';

import { BlockEditor } from '@/features/templates/components/BlockEditor';

/** Édition d'un bloc de la séance type en cours (modale ouverte depuis l'éditeur). */
export default function TemplateBlockScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  return <BlockEditor blockKey={key} />;
}
