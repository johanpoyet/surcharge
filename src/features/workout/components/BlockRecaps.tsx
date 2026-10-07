import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { db } from '@/db/client';
import type { SessionBlock } from '@/db/schema';
import { formatDistance, formatPace, paceSecondsPerKm } from '@/features/exercises/tracking';
import { parseBlockConfig } from '@/features/templates/blockConfig';
import { circuitTitle } from '@/features/templates/blockSummary';
import { fr } from '@/i18n/fr';
import { formatDelta } from '../blocks/engine';
import { formatClock } from '../logic';
import { previousBlocks } from '../repository';
import { blockTitle, resultLine } from './BlockPanels';

const t = fr.workout.summary;
const tb = fr.templates.blocks;

function Tag({ label }: { label: string }) {
  return (
    <View className="h-6 justify-center self-start rounded-tag bg-line px-2">
      <Text className="font-body-bold text-11 uppercase tracking-wide text-text">{label}</Text>
    </View>
  );
}

/** Récap d'un circuit : résultat et écart avec la dernière fois (SPEC_V2 §4.5). */
export function CircuitRecapCard({ block, userId }: { block: SessionBlock; userId: string }) {
  const config = parseBlockConfig('circuit', block.config);
  const last = useMemo(
    () => previousBlocks(db, userId, block, block.sessionId)[0] ?? null,
    [block, userId],
  );
  const result = resultLine(block, block.result);
  const comparison = (() => {
    if (!last) return null;
    if (config.format === 'amrap' && typeof block.result.rounds === 'number') {
      const before = Number(last.result.rounds ?? 0);
      return t.circuit.vsLastRounds(block.result.rounds - before);
    }
    if (typeof block.result.totalS === 'number' && typeof last.result.totalS === 'number') {
      return t.circuit.vsLastTime(
        formatDelta(block.result.totalS - last.result.totalS, formatClock),
      );
    }
    return null;
  })();

  return (
    <View className="gap-1.5 rounded-card bg-surface p-4">
      <Tag label={tb.tags.circuit} />
      <Text className="font-body-bold text-15 text-muted">
        {block.name ?? circuitTitle(config)}
      </Text>
      <Text className="pr-1 font-display text-34 text-text">{result ?? '—'}</Text>
      {comparison ? <Text className="font-body text-13 text-muted">{comparison}</Text> : null}
    </View>
  );
}

/** Récap d'un bloc cardio : distance, temps, allure moyenne. */
export function CardioRecapCard({ block }: { block: SessionBlock }) {
  const distance = Number(block.result.totalDistanceM ?? 0);
  const time = Number(block.result.totalS ?? 0);
  const pace = paceSecondsPerKm(distance, time);
  const tiles = [
    { label: t.cardio.distance, value: distance > 0 ? formatDistance(distance) : '—' },
    { label: t.cardio.time, value: time > 0 ? formatClock(time) : '—' },
    { label: t.cardio.pace, value: pace !== null ? formatPace(pace) : '—' },
  ];
  return (
    <View className="gap-2.5 rounded-card bg-surface p-4">
      <Tag label={tb.tags.cardio} />
      {block.name ? <Text className="font-body-bold text-15 text-muted">{block.name}</Text> : null}
      <View className="flex-row gap-2">
        {tiles.map((tile) => (
          <View key={tile.label} className="flex-1 rounded-tile bg-bg p-3">
            <Text className="font-body text-12 text-muted">{tile.label}</Text>
            <Text numberOfLines={1} className="pr-1 font-display text-22 text-text">
              {tile.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Texte partagé à la fin d'une séance (pas d'image en V2, SPEC_V2 §8). */
export function shareText(
  sessionName: string,
  durationS: number,
  blocks: readonly SessionBlock[],
  strengthSets: number,
): string {
  const lines = [`${sessionName} · ${formatClock(durationS)}`];
  for (const block of blocks) {
    if (!block.endedAt) continue;
    if (block.type === 'hyrox' && typeof block.result.totalS === 'number') {
      const division = parseBlockConfig('hyrox', block.config).division;
      lines.push(
        t.hyrox.share(
          formatClock(block.result.totalS),
          division === 'custom' ? '' : tb.divisions[division],
        ),
      );
    } else {
      const result = resultLine(block, block.result);
      if (result) lines.push(`${blockTitle(block)} : ${result}`);
    }
  }
  if (strengthSets > 0) lines.push(`${t.strength} : ${strengthSets} ${t.sets.toLowerCase()}`);
  lines.push('', t.shareFooter);
  return lines.join('\n');
}
