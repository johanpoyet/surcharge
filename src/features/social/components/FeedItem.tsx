import { Pressable, Text, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { describeEvent, timeAgo, type FeedEvent } from '../leaderboard';
import { Avatar } from './Avatar';

const t = fr.friends.feed;

type FeedItemProps = {
  event: FeedEvent;
  name: string;
  now: Date;
  bravo: boolean;
  onBravo: () => void;
};

/** Activité d'un ami : phrase, valeur en grand, bouton « Bravo » (plein une fois donné). */
export function FeedItem({ event, name, now, bravo, onBravo }: FeedItemProps) {
  const { text, strong, value } = describeEvent(event);
  return (
    <View className="flex-row gap-3 rounded-card bg-surface p-4">
      <Avatar name={name} />
      <View className="flex-1 gap-1">
        <Text className="font-body text-16 text-text">
          <Text className="font-body-bold">{name}</Text>
          {text}
          <Text className="font-body-bold">{strong}</Text>
          {event.type === 'streak' ? t.streakEnd : ''}
        </Text>
        <View className="flex-row items-baseline gap-2">
          {value ? <Text className="pr-1 font-display text-26 text-volt">{value}</Text> : null}
          <Text className="font-body text-13 text-muted">{timeAgo(event.createdAt, now)}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.bravoA11y(name)}
        accessibilityState={{ selected: bravo }}
        onPress={onBravo}
        hitSlop={6}
        className={cn(
          'h-9 justify-center self-start rounded-button px-3 active:opacity-80',
          bravo ? 'bg-volt' : 'border-[1.5px] border-volt',
        )}
      >
        <Text className={cn('font-body-bold text-14', bravo ? 'text-onVolt' : 'text-volt')}>
          {bravo ? t.bravoDone : t.bravo}
        </Text>
      </Pressable>
    </View>
  );
}
