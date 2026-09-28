import { format } from 'date-fns';
import { fr as dateFr } from 'date-fns/locale';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Heading, Overline, Placeholder } from '@/components/ui';
import { useProfile } from '@/features/profile/hooks';
import { fr } from '@/i18n/fr';

export default function HomeScreen() {
  const { firstName } = useProfile();
  // « lun. 28 sept. » : la majuscule vient du style (sur-titre en majuscules).
  const today = format(new Date(), 'EEE d MMM', { locale: dateFr });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-4 px-screen pt-3">
        <View>
          <Overline className="text-13">{today}</Overline>
          <Heading size={34}>{fr.home.greeting(firstName)}</Heading>
        </View>
        <Placeholder>{fr.placeholders.home}</Placeholder>
      </ScrollView>
    </SafeAreaView>
  );
}
