import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useEffect } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button, FullScreen, IconButton, Overline, useToast } from '@/components/ui';
import { useProfile } from '@/features/profile/hooks';
import {
  BlockDone,
  BlockIntro,
  blockTitle,
  PausedPanel,
  WarmupView,
} from '@/features/workout/components/BlockPanels';
import { CardioView } from '@/features/workout/components/CardioView';
import { CircuitView } from '@/features/workout/components/CircuitView';
import { HyroxView } from '@/features/workout/components/HyroxView';
import { StrengthView } from '@/features/workout/components/StrengthView';
import { formatClock } from '@/features/workout/logic';
import { useWorkout } from '@/features/workout/useWorkout';
import { fr } from '@/i18n/fr';
import { useNow } from '@/lib/useNow';

const t = fr.workout;

/** Blocs chronométrés d'un bout à l'autre (bouton « Démarrer », pause, résultat). */
const TIMED = new Set(['warmup', 'hyrox', 'circuit']);

export default function WorkoutScreen() {
  useKeepAwake();
  const toast = useToast();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const workout = useWorkout(sessionId);
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const now = useNow();

  const rest = workout.state?.rest ?? null;
  const restRemaining = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0;

  // Fin du repos au premier plan : vibration + message (la notification couvre l'arrière-plan).
  useEffect(() => {
    if (rest && restRemaining <= 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(t.rest.done);
      workout.stopRest();
    }
  }, [rest, restRemaining, toast, workout]);

  const { state, session } = workout;
  if (!state || !session || session.endedAt) {
    return (
      <FullScreen className="px-screen pt-2">
        <IconButton
          icon={ChevronDown}
          accessibilityLabel={t.minimize}
          onPress={() => router.back()}
        />
        <Text className="mt-6 font-body text-15 text-muted">{t.notFound}</Text>
        <Button label={t.backHome} className="mt-6" onPress={() => router.replace('/')} />
      </FullScreen>
    );
  }

  const index = workout.currentBlock;
  const block = workout.blocks[index];
  const run = workout.runOf(index);
  const multi = workout.blocks.length > 1;
  const next = workout.blocks[index + 1];
  const nextBlockName = next ? blockTitle(next) : null;
  const timed = !!block && TIMED.has(block.type);
  const running = timed && run.startedAt !== null && run.endedAt === null;

  const finishNow = () => {
    const result = workout.finish();
    if (result === 'discarded') {
      toast.show(t.discarded);
      router.back();
    } else {
      router.replace({ pathname: '/workout/summary/[sessionId]', params: { sessionId } });
    }
  };

  const confirmFinish = () => {
    const done =
      workout.sets.length + workout.blocks.filter((_, i) => workout.runOf(i).endedAt).length;
    const remaining = [
      workout.remainingSets > 0 ? t.finishRemaining(workout.remainingSets) : null,
      workout.unfinishedBlocks > 0 ? t.blocks.unfinished(workout.unfinishedBlocks) : null,
    ]
      .filter(Boolean)
      .join(' ');
    if (done > 0 && !remaining) return finishNow();
    Alert.alert(t.finishTitle, done === 0 ? t.finishEmpty : remaining, [
      { text: t.keepGoing, style: 'cancel' },
      {
        text: t.finishConfirm,
        style: done === 0 ? 'destructive' : 'default',
        onPress: finishNow,
      },
    ]);
  };

  const elapsed = (now - new Date(session.startedAt).getTime()) / 1000;

  const body = (() => {
    if (!block || block.type === 'strength') {
      return (
        <StrengthView
          workout={workout}
          unit={unit}
          restRemaining={restRemaining}
          nextBlockName={nextBlockName}
          onFinish={confirmFinish}
        />
      );
    }
    if (block.type === 'cardio') {
      return (
        <CardioView
          workout={workout}
          now={now}
          unit={unit}
          restRemaining={restRemaining}
          nextBlockName={nextBlockName}
          onFinish={confirmFinish}
        />
      );
    }
    if (run.endedAt !== null) {
      return <BlockDone workout={workout} nextBlockName={nextBlockName} onFinish={confirmFinish} />;
    }
    if (run.startedAt === null) return <BlockIntro workout={workout} />;
    if (run.pausedAt !== null) return <PausedPanel workout={workout} onFinish={confirmFinish} />;
    if (block.type === 'hyrox') return <HyroxView workout={workout} now={now} unit={unit} />;
    if (block.type === 'circuit') return <CircuitView workout={workout} now={now} unit={unit} />;
    return <WarmupView workout={workout} now={now} />;
  })();

  return (
    <FullScreen>
      <View className="flex-row items-center justify-between px-screen pt-1">
        <IconButton
          icon={ChevronDown}
          accessibilityLabel={t.minimize}
          onPress={() => router.back()}
        />
        <View className="flex-1 items-center px-2">
          <Overline className="text-13" numberOfLines={1}>
            {running && block?.type === 'hyrox' ? t.blocks.total(session.name) : session.name}
          </Overline>
          <Text
            className="font-display text-26 text-volt"
            accessibilityLabel={formatClock(elapsed)}
          >
            {formatClock(elapsed)}
          </Text>
          {multi ? (
            <Text className="font-body text-13 text-muted">
              {t.blocks.blockOf(index + 1, workout.blocks.length)}
            </Text>
          ) : null}
        </View>
        {running ? (
          <Button
            label={run.pausedAt !== null ? t.blocks.resume : t.blocks.pause}
            variant="secondary"
            size="sm"
            className="h-11"
            onPress={run.pausedAt !== null ? workout.resume : workout.pause}
          />
        ) : (
          <Button
            label={t.finish}
            variant="secondary"
            size="sm"
            className="h-11"
            onPress={confirmFinish}
          />
        )}
      </View>
      {body}
    </FullScreen>
  );
}
