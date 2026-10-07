import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BrandWatermark } from '@/components/ui';
import { db } from '@/db/client';
import type { SessionBlock } from '@/db/schema';
import { hyroxRecap, type HyroxRecap } from '@/features/hyrox/recap';
import { hyroxSegments } from '@/features/hyrox/segments';
import { parseBlockConfig } from '@/features/templates/blockConfig';
import { appendTemplateBlock } from '@/features/templates/repository';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { onVoltAlpha } from '@/theme/tokens';
import { formatDelta } from '../blocks/engine';
import { formatClock } from '../logic';
import { listSessionSets, previousBlocks } from '../repository';

const t = fr.workout.summary.hyrox;
const tb = fr.templates.blocks;

/** Temps des segments d'un bloc terminé : `result.splits`, sinon ses séries dans l'ordre. */
export function blockSplits(block: SessionBlock): (number | null)[] {
  const splits = block.result.splits;
  if (Array.isArray(splits)) return splits.map((v) => (typeof v === 'number' ? v : null));
  return listSessionSets(db, block.sessionId)
    .filter((set) => set.blockId === block.id)
    .map((set) => set.durationS ?? null);
}

/** Calcule le récap d'un bloc Hyrox terminé (comparé aux simus précédentes du même bloc). */
export function useHyroxRecap(block: SessionBlock, userId: string): HyroxRecap {
  return useMemo(() => {
    const config = parseBlockConfig('hyrox', block.config);
    const durations = blockSplits(block);
    const segments = hyroxSegments(config).map((segment, index) => ({
      kind: segment.kind,
      name:
        segment.kind === 'run'
          ? fr.workout.blocks.hyrox.runName(segment.round)
          : segment.exercise.name,
      station: segment.station,
      durationS: durations[index] ?? null,
    }));
    const previous = previousBlocks(db, userId, block, block.sessionId);
    const totals = previous.flatMap((b) =>
      typeof b.result.totalS === 'number' ? [b.result.totalS] : [],
    );
    const transitions = block.result.transitionsS;
    return hyroxRecap(
      segments,
      previous[0] ? blockSplits(previous[0]) : null,
      typeof transitions === 'number' ? transitions : null,
      totals.length > 0 ? Math.min(...totals) : null,
    );
  }, [block, userId]);
}

const deltaTone = (deltaS: number | null) =>
  deltaS === null || deltaS === 0 ? 'text-muted' : deltaS < 0 ? 'text-volt' : 'text-diffHard';

type HyroxRecapCardProps = {
  block: SessionBlock;
  sessionName: string;
  userId: string;
  /** Séance type de la séance (bloc dédié au point faible), null sans séance type. */
  template: { id: string; name: string } | null;
};

/** Récap d'une simu Hyrox (maquette recap-hyrox). */
export function HyroxRecapCard({ block, sessionName, userId, template }: HyroxRecapCardProps) {
  const recap = useHyroxRecap(block, userId);
  const config = parseBlockConfig('hyrox', block.config);
  const [added, setAdded] = useState(false);

  const addWeakBlock = () => {
    if (!template || !recap.weakPoint?.station) return;
    appendTemplateBlock(db, userId, template.id, {
      type: 'hyrox',
      name: null,
      config: { format: 'station', division: config.division, stations: [recap.weakPoint.station] },
    });
    setAdded(true);
  };

  return (
    <>
      <View className="overflow-hidden rounded-[22px] bg-volt p-5">
        <BrandWatermark size={200} fill={onVoltAlpha.watermark} className="-right-10 -top-5" />
        <Text className="font-body-bold text-12 uppercase tracking-overline text-onVolt">
          {t.done(block.name ?? sessionName)}
        </Text>
        <Text className="px-1 font-display text-72 text-onVolt">{formatClock(recap.totalS)}</Text>
        <View className="mt-1.5 flex-row gap-1.5">
          {recap.recordDeltaS !== null ? (
            <View className="h-7 justify-center rounded-sm bg-onVolt px-2.5">
              <Text className="font-body-bold text-13 text-volt">
                {t.record(formatDelta(recap.recordDeltaS, formatClock))}
              </Text>
            </View>
          ) : null}
          {config.division !== 'custom' ? (
            <View className="h-7 justify-center rounded-sm bg-onVolt-tag px-2.5">
              <Text className="font-body-bold text-13 text-onVolt">
                {tb.divisions[config.division]}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-row gap-2">
        {[
          {
            label: t.run,
            value: formatClock(recap.runS),
            caption: recap.paceSPerKm
              ? `${formatClock(Math.round(recap.paceSPerKm))} ${fr.units.perKm}`
              : '',
          },
          {
            label: t.stations,
            value: formatClock(recap.stationsS),
            caption: t.stationCount(recap.stationCount),
          },
          ...(recap.transitionsS !== null
            ? [{ label: t.transitions, value: formatClock(recap.transitionsS), caption: t.roxzone }]
            : []),
        ].map((tile) => (
          <View key={tile.label} className="flex-1 rounded-tile bg-surface p-3">
            <Text className="font-body text-12 text-muted">{tile.label}</Text>
            <Text className="pr-1 font-display text-26 text-text">{tile.value}</Text>
            <Text className="font-body text-12 text-muted">{tile.caption}</Text>
          </View>
        ))}
      </View>

      {recap.stations.length > 0 ? (
        <View className="gap-[9px] rounded-card bg-surface p-4">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-body-bold text-18 text-text">{t.stations}</Text>
            {recap.stations.some((s) => s.deltaS !== null) ? (
              <Text className="font-body text-12 text-muted">{t.vsLast}</Text>
            ) : null}
          </View>
          {recap.stations.map((row) => (
            <View key={row.name} className="flex-row items-center gap-2">
              <Text numberOfLines={1} className="w-[112px] font-body text-14 text-text">
                {row.name}
              </Text>
              <View className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <View
                  className={cn('h-2 rounded-full', row.slowest ? 'bg-diffHard' : 'bg-text')}
                  style={{ width: `${Math.round(row.ratio * 100)}%` }}
                />
              </View>
              <Text className="w-11 text-right font-body-bold text-14 text-text">
                {formatClock(row.durationS)}
              </Text>
              <Text
                className={cn(
                  'w-[50px] text-right font-body-semibold text-14',
                  deltaTone(row.deltaS),
                )}
              >
                {row.deltaS === null ? '' : formatDelta(row.deltaS, formatClock)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {recap.weakPoint ? (
        <View className="gap-2.5 rounded-tile border border-diffHard-border bg-diffHard-subtle px-3.5 py-3">
          <Text className="font-body text-14 leading-[20px] text-text">
            {t.weakPrefix}
            <Text className="font-body-bold text-diffHard">{recap.weakPoint.name}</Text>
            {t.weakSuffix(recap.weakPoint.deltaS)}
          </Text>
          {/* Confirmation dans le bandeau : un toast serait caché derrière cette modale. */}
          {added && template ? (
            <Text className="font-body-bold text-14 text-volt">{t.added(template.name)}</Text>
          ) : null}
          {template && recap.weakPoint.station && !added ? (
            <Pressable
              accessibilityRole="button"
              onPress={addWeakBlock}
              className="h-10 items-center justify-center self-start rounded-button border border-diffHard-border px-3.5 active:opacity-80"
            >
              <Text className="font-body-bold text-14 text-diffHard">{t.addBlock}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );
}
