import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { cn } from '@/lib/cn';
import { FullScreen } from './FullScreen';

type KeyboardScreenProps = {
  children: ReactNode;
  /** Élément décoratif en fond (filigrane), hors du défilement. */
  background?: ReactNode;
  contentClassName?: string;
  /** Faux pendant un glisser-déposer. */
  scrollEnabled?: boolean;
};

/** Écran de formulaire : fond, zones sûres, défilement et clavier qui ne masque pas les champs. */
export function KeyboardScreen({
  children,
  background,
  contentClassName,
  scrollEnabled = true,
}: KeyboardScreenProps) {
  return (
    <FullScreen>
      {background}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerClassName={cn('grow px-auth pb-6 pt-4', contentClassName)}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </FullScreen>
  );
}
