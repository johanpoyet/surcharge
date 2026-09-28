import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Heading, Placeholder } from '@/components/ui';
import { fr } from '@/i18n/fr';

export default function ExercisesScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-4 px-screen pt-3">
        <Heading size={34}>{fr.tabs.exercises}</Heading>
        <Placeholder>{fr.placeholders.exercises}</Placeholder>
      </ScrollView>
    </SafeAreaView>
  );
}
