import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChipGroup } from '@/components/ui';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { leaderboard, type Criterion, type LeaderboardPerson } from '../leaderboard';
import { Avatar } from './Avatar';

const t = fr.friends.leaderboard;
const CRITERIA = (['regularity', 'progress', 'records'] as const).map((value) => ({
  value,
  label: t.criteria[value],
}));

type LeaderboardCardProps = {
  people: readonly LeaderboardPerson[];
  today: Date;
  onOpen: (userId: string) => void;
};

/** Classement de la semaine (maquette amis) : trois critères relatifs, « Toi » mis en avant. */
export function LeaderboardCard({ people, today, onOpen }: LeaderboardCardProps) {
  const [criterion, setCriterion] = useState<Criterion>('regularity');
  const rows = leaderboard(people, criterion, today);

  return (
    <View className="gap-3 rounded-card bg-surface p-4">
      <Text className="pr-1 font-display text-26 uppercase text-text">{t.title}</Text>
      <ChipGroup size="sm" options={CRITERIA} value={criterion} onChange={setCriterion} />
      <Text className="font-body text-13 text-muted">{t.hints[criterion]}</Text>
      <View className="gap-1.5">
        {rows.map(({ person, rank, value, fill }) => {
          const strong = person.isMe || rank === 1;
          return (
            <Pressable
              key={person.userId}
              accessibilityRole={person.isMe ? undefined : 'button'}
              disabled={person.isMe}
              onPress={() => onOpen(person.userId)}
              className={cn(
                'h-[60px] flex-row items-center gap-3 rounded-tile px-3 active:opacity-80',
                person.isMe ? 'border border-volt/40 bg-volt-subtle' : 'bg-bg',
              )}
            >
              <Text className={cn('w-6 font-display text-26', strong ? 'text-volt' : 'text-muted')}>
                {rank}
              </Text>
              <Avatar name={person.name} highlight={person.isMe} />
              <View className="flex-1 gap-1.5">
                <Text numberOfLines={1} className="font-body-bold text-16 text-text">
                  {person.isMe ? t.me : person.name}
                </Text>
                <View className="h-1.5 w-full max-w-[150px] overflow-hidden rounded-full bg-line">
                  <View
                    className={cn('h-full rounded-full', strong ? 'bg-volt' : 'bg-text')}
                    style={{ width: `${Math.round(Math.max(0, Math.min(1, fill)) * 100)}%` }}
                  />
                </View>
              </View>
              <Text className="pr-1 font-display text-26 text-text">{value}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
