import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

type FullScreenProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Écran plein écran (modale « fullScreenModal ») : marges de l'encoche et de la barre d'accueil
 * prises sur la fenêtre. `SafeAreaView` les mesure sur la vue elle-même, encore hors écran
 * pendant l'animation d'ouverture de la modale : il lui arrive de garder 0, et les boutons du
 * haut et du bas passaient sous l'heure et la barre d'accueil.
 */
export function FullScreen({ children, className }: FullScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={cn('flex-1 bg-bg', className)}
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
}
