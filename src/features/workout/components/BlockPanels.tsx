import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { db } from '@/db/client';
import type { JsonObject } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { hyroxRunDistanceM, hyroxStations } from '@/features/hyrox/segments';
import { parseBlockConfig } from '@/features/templates/blockConfig';
import { circuitTitle } from '@/features/templates/blockSummary';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { activeSeconds } from '../blocks/engine';
import { formatClock } from '../logic';
import { getSessionBlock, lastBlock } from '../repository';
import type { PlannedBlock } from '../state';
import type { Workout } from '../useWorkout';

const t = fr.workout.blocks;
const tb = fr.templates.blocks;

/** Titre d'un bloc : son nom, sinon un résumé de son contenu. */
export function blockTitle(block: PlannedBlock): string {
  if (block.name) return block.name;
  switch (block.type) {
    case 'hyrox': {
      const config = parseBlockConfig('hyrox', block.config);
      return config.format === 'station'
        ? (hyroxStations(config)[0]?.exercise.name ?? tb.tags.hyrox)
        : tb.hyroxTitle[config.format];
    }
    case 'circuit':
      return circuitTitle(parseBlockConfig('circuit', block.config));
    case 'warmup':
      return parseBlockConfig('warmup', block.config).note ?? tb.warmupDefault;
    default:
      return tb.options[block.type].title;
  }
}

/** Résultat d'un bloc, en une ligne (« 1:24:10 », « 7 tours + 12 reps »…). */
export function resultLine(block: PlannedBlock, result: JsonObject): string | null {
  const totalS = typeof result.totalS === 'number' ? result.totalS : null;
  if (block.type === 'hyrox' && totalS !== null) return formatClock(totalS);
  if (block.type === 'circuit') {
    if (typeof result.rounds === 'number') {
      return t.circuit.result(result.rounds, Number(result.extraReps ?? 0));
    }
    if (totalS !== null) return formatClock(totalS);
    if (typeof result.completedRounds === 'number') {
      return t.circuit.finishedRounds(result.completedRounds);
    }
  }
  return null;
}

function Tag({ block }: { block: PlannedBlock }) {
  const hyrox = block.type === 'hyrox';
  return (
    <View
      className={cn(
        'h-6 justify-center self-center rounded-tag px-2',
        hyrox ? 'bg-volt' : 'bg-line',
      )}
    >
      <Text
        className={cn(
          'font-body-bold text-11 uppercase tracking-wide',
          hyrox ? 'text-onVolt' : 'text-text',
        )}
      >
        {tb.tags[block.type]}
      </Text>
    </View>
  );
}

/** Avant un bloc minuté : de quoi il s'agit, la dernière fois, « Démarrer le bloc ». */
export function BlockIntro({ workout }: { workout: Workout }) {
  const userId = useAuth().session?.user.id ?? '';
  const index = workout.currentBlock;
  const block = workout.blocks[index]!;
  const last = useMemo(
    () => lastBlock(db, userId, block, workout.session?.id ?? ''),
    [block, userId, workout.session?.id],
  );
  const lastResult = last ? resultLine(block, last.block.result) : null;
  const detail = (() => {
    if (block.type === 'hyrox') {
      const config = parseBlockConfig('hyrox', block.config);
      const km = hyroxRunDistanceM(config) / 1000;
      return [tb.divisions[config.division], km > 0 ? `${km} km` : null]
        .filter(Boolean)
        .join(' · ');
    }
    if (block.type === 'warmup') {
      return t.warmup.target(parseBlockConfig('warmup', block.config).durationMin ?? 10);
    }
    return null;
  })();

  return (
    <View className="flex-1 justify-center gap-5 px-screen">
      <View className="items-center gap-2.5 rounded-[22px] bg-surface p-6">
        <Tag block={block} />
        <Text className="text-center font-display text-40 uppercase text-text">
          {blockTitle(block)}
        </Text>
        {detail ? <Text className="font-body text-15 text-muted">{detail}</Text> : null}
        {lastResult ? (
          <Text className="font-body text-14 text-muted">{t.hyrox.last(lastResult)}</Text>
        ) : null}
      </View>
      <View className="gap-2">
        <Button label={t.start} onPress={() => workout.startBlock(index)} />
        <Button
          label={t.skipBlock}
          variant="ghost"
          tone="muted"
          size="sm"
          onPress={() => workout.completeBlock(index, {})}
        />
      </View>
    </View>
  );
}

/** Échauffement en cours : chrono et consignes. */
export function WarmupView({ workout, now }: { workout: Workout; now: number }) {
  const index = workout.currentBlock;
  const block = workout.blocks[index]!;
  const config = parseBlockConfig('warmup', block.config);
  const elapsed = activeSeconds(workout.runOf(index), now);
  return (
    <View className="flex-1 justify-center gap-5 px-screen">
      <View className="items-center gap-2 rounded-[22px] bg-surface p-6">
        <Tag block={block} />
        {config.note ? (
          <Text className="text-center font-body-bold text-17 text-text">{config.note}</Text>
        ) : null}
        <Text className="font-display text-96 text-text" accessibilityLabel={formatClock(elapsed)}>
          {formatClock(elapsed)}
        </Text>
        <Text className="font-body text-15 text-muted">
          {t.warmup.target(config.durationMin ?? 10)}
        </Text>
      </View>
      <Button label={t.warmup.done} onPress={() => workout.completeBlock(index, {})} />
    </View>
  );
}

/** Bloc minuté en pause : reprendre, terminer le bloc ou la séance. */
export function PausedPanel({ workout, onFinish }: { workout: Workout; onFinish: () => void }) {
  return (
    <View className="flex-1 justify-center gap-3 px-screen">
      <Text className="text-center font-display text-48 uppercase text-text">{t.paused}</Text>
      <Text className="text-center font-body text-15 text-muted">{t.pausedHint}</Text>
      <View className="mt-4 gap-2">
        <Button label={t.resume} onPress={workout.resume} />
        <Button
          label={t.endBlock}
          variant="secondary"
          onPress={() => workout.completeBlock(workout.currentBlock)}
        />
        <Button label={t.endSession} variant="ghost" tone="muted" size="sm" onPress={onFinish} />
      </View>
    </View>
  );
}

/** Bloc terminé : son résultat, puis le bloc suivant (ou la fin de la séance). */
export function BlockDone({
  workout,
  nextBlockName,
  onFinish,
}: {
  workout: Workout;
  nextBlockName: string | null;
  onFinish: () => void;
}) {
  const block = workout.blocks[workout.currentBlock]!;
  const run = workout.runOf(workout.currentBlock);
  // Résultat relu en base (enregistré à la fin du bloc).
  const result = useMemo(() => {
    const row = getSessionBlock(db, block.id);
    return row ? resultLine(block, row.result) : null;
    // run.endedAt : relire après une annulation puis une nouvelle fin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, run.endedAt]);

  return (
    <View className="flex-1 justify-center gap-5 px-screen">
      <View className="items-center gap-2.5 rounded-[22px] bg-volt p-6">
        <Text className="font-body-bold text-12 uppercase tracking-overline text-onVolt">
          {block.type === 'hyrox' ? t.hyrox.finished : t.done}
        </Text>
        <Text className="text-center font-display text-40 uppercase text-onVolt">
          {result ?? blockTitle(block)}
        </Text>
      </View>
      <Button
        label={nextBlockName !== null ? t.next(nextBlockName) : fr.workout.end}
        onPress={nextBlockName !== null ? workout.nextBlock : onFinish}
      />
    </View>
  );
}
