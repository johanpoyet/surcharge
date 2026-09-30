import { Text, View } from 'react-native';

import { Button, useToast } from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { fr } from '@/i18n/fr';
import { addMissingDefaultExercises } from '../repository';

/** Bibliothèque vide : jamais d'impasse, on propose les exercices de base. */
export function EmptyLibrary() {
  const toast = useToast();
  const userId = useAuth().session?.user.id;
  return (
    <View className="items-center gap-4 pt-6">
      <Text className="text-center font-body text-15 text-muted">{fr.exercises.emptyLibrary}</Text>
      <Button
        label={fr.exercises.addDefaults}
        variant="outline"
        size="md"
        onPress={() => {
          if (!userId) return;
          toast.show(fr.exercises.defaultsAdded(addMissingDefaultExercises(db, userId)));
        }}
      />
    </View>
  );
}
