import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Heading, Placeholder } from '@/components/ui';
import { useExercises } from '@/features/exercises/hooks';
import { fr } from '@/i18n/fr';

export default function ExercisesScreen() {
  const exercises = useExercises();
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-4 px-screen pt-3">
        <Heading size={34}>{fr.tabs.exercises}</Heading>
        <Placeholder>{fr.exercises.count(exercises.length)}</Placeholder>
        <Placeholder>{fr.placeholders.exercises}</Placeholder>
      </ScrollView>
    </SafeAreaView>
  );
}
