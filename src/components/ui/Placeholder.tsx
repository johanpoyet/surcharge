import { Text } from 'react-native';

/** Texte temporaire d'un onglet pas encore développé. */
export function Placeholder({ children }: { children: string }) {
  return <Text className="font-body text-15 text-muted">{children}</Text>;
}
