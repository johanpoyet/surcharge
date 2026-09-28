import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

type KeyboardScreenProps = {
  children: ReactNode;
  /** Élément décoratif en fond (filigrane), hors du défilement. */
  background?: ReactNode;
  contentClassName?: string;
};

/** Écran de formulaire : fond, zones sûres, défilement et clavier qui ne masque pas les champs. */
export function KeyboardScreen({ children, background, contentClassName }: KeyboardScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      {background}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerClassName={cn('grow px-auth pb-6 pt-4', contentClassName)}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
