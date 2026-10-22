import { useFocusEffect } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Heading, IconButton, useToast } from '@/components/ui';
import {
  getFriendProfiles,
  removeFriendship,
  respondFriendRequest,
  type FriendProfile,
} from '@/features/social/api';
import { Avatar } from '@/features/social/components/Avatar';
import { useFriendsBadge } from '@/features/social/hooks';
import { fr } from '@/i18n/fr';
import { goBack } from '@/lib/navigation';

const t = fr.friends.requests;

/** Demandes reçues et envoyées, personnes bloquées (on les débloque d'ici). */
export default function FriendRequestsScreen() {
  const toast = useToast();
  const [people, setPeople] = useState<FriendProfile[] | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await getFriendProfiles();
      setPeople(all);
      useFriendsBadge.setState({
        pending: all.filter((p) => p.status === 'pending' && p.incoming).length,
      });
    } catch {
      toast.show(fr.friends.offline);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const act = async (action: () => Promise<void>, message?: string) => {
    try {
      await action();
      if (message) toast.show(message);
    } catch {
      toast.show(fr.friends.addScreen.error);
    }
    void load();
  };

  const incoming = people?.filter((p) => p.status === 'pending' && p.incoming) ?? [];
  const outgoing = people?.filter((p) => p.status === 'pending' && !p.incoming) ?? [];
  const blocked = people?.filter((p) => p.status === 'blocked') ?? [];

  const row = (person: FriendProfile, actions: React.ReactNode) => (
    <View key={person.friendshipId} className="gap-3 rounded-card bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Avatar name={person.firstName} />
        <View className="flex-1">
          <Text className="font-body-bold text-16 text-text">{person.firstName}</Text>
          {person.username ? (
            <Text className="font-body text-13 text-muted">@{person.username}</Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row gap-2">{actions}</View>
    </View>
  );

  const section = (
    title: string,
    list: FriendProfile[],
    render: (p: FriendProfile) => React.ReactNode,
  ) =>
    list.length > 0 ? (
      <View className="gap-2">
        <Text className="font-body-bold text-12 uppercase tracking-overline text-muted">
          {title}
        </Text>
        {list.map(render)}
      </View>
    ) : null;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-5 px-screen pb-6 pt-2">
        <View className="flex-row items-center gap-3">
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel={fr.friends.addScreen.back}
            onPress={() => goBack('/friends')}
          />
          <Heading size={34}>{t.title}</Heading>
        </View>
        {people && incoming.length + outgoing.length + blocked.length === 0 ? (
          <Text className="font-body text-15 text-muted">{t.empty}</Text>
        ) : null}
        {section(t.incoming, incoming, (p) =>
          row(
            p,
            <>
              <Button
                label={t.accept}
                size="md"
                className="flex-1"
                onPress={() =>
                  void act(
                    () => respondFriendRequest(p.friendshipId, true),
                    t.acceptedToast(p.firstName),
                  )
                }
              />
              <Button
                label={t.decline}
                variant="secondary"
                className="flex-1"
                onPress={() => void act(() => respondFriendRequest(p.friendshipId, false))}
              />
            </>,
          ),
        )}
        {section(t.outgoing, outgoing, (p) =>
          row(
            p,
            <Button
              label={t.cancel}
              variant="secondary"
              className="flex-1"
              onPress={() => void act(() => removeFriendship(p.friendshipId))}
            />,
          ),
        )}
        {section(t.blocked, blocked, (p) =>
          row(
            p,
            <Button
              label={t.unblock}
              variant="secondary"
              className="flex-1"
              onPress={() => void act(() => removeFriendship(p.friendshipId))}
            />,
          ),
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
