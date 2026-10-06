import { router } from 'expo-router';
import { Ellipsis, GripVertical, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';

import { IconButton, ReorderableList } from '@/components/ui';
import type { Exercise } from '@/db/schema';
import { formatDistance, formatMeters } from '@/features/exercises/tracking';
import { hyroxSegments, type HyroxSegment } from '@/features/hyrox/segments';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import type { WeightUnit } from '@/lib/database.types';
import { colors } from '@/theme/tokens';
import { parseBlockConfig } from '../blockConfig';
import { cardioLine, circuitTitle, itemTarget } from '../blockSummary';
import { useTemplateDraft, type DraftBlock } from '../draftStore';
import { blockSeconds } from '../estimate';
import { parseRest } from '../format';
import { TemplateItemCard } from './TemplateItemCard';

const t = fr.templates.blocks;
const VISIBLE_SEGMENTS = 4;

type BlockCardProps = {
  block: DraftBlock;
  index: number;
  count: number;
  exercises: ReadonlyMap<string, Exercise>;
  unit: WeightUnit;
  onDragChange: (dragging: boolean) => void;
  /** Poignée de la carte (glisser pour réordonner les blocs). */
  handleGesture: GestureType;
};

function Tag({ label, accent }: { label: string; accent: boolean }) {
  return (
    <View className={cn('h-6 justify-center rounded-tag px-2', accent ? 'bg-volt' : 'bg-line')}>
      <Text
        className={cn(
          'font-body-bold text-11 uppercase tracking-wide',
          accent ? 'text-onVolt' : 'text-text',
        )}
      >
        {label}
      </Text>
    </View>
  );
}

const openEditor = (key: string) => router.push({ pathname: '/templates/block', params: { key } });

/** Segment Hyrox : « Course + SkiErg · 1 km · 1000 m » (ou la station seule). */
function SegmentRow({ station, run }: { station: HyroxSegment; run: HyroxSegment | undefined }) {
  const stationMeta = station.distanceM
    ? formatMeters(station.distanceM)
    : t.reps(station.reps ?? 0);
  return (
    <View className="h-[34px] flex-row items-center gap-2 rounded-sm bg-bg px-2">
      <Text className="w-6 font-body-bold text-14 text-muted">{station.round}</Text>
      <Text className="flex-1 font-body text-14 text-text" numberOfLines={1}>
        {run ? t.runPlus : ''}
        <Text className="font-body-bold">{station.exercise.name}</Text>
      </Text>
      <Text className="font-body text-14 text-muted">
        {t.segmentMeta(run?.distanceM ? formatDistance(run.distanceM) : null, stationMeta)}
      </Text>
    </View>
  );
}

function HyroxBody({ block }: { block: DraftBlock }) {
  const [expanded, setExpanded] = useState(false);
  const config = parseBlockConfig('hyrox', block.config);
  const segments = hyroxSegments(config);
  const stations = segments.filter((s) => s.kind === 'station');
  const visible = expanded ? stations : stations.slice(0, VISIBLE_SEGMENTS);
  const hidden = stations.slice(VISIBLE_SEGMENTS);
  const runOf = (station: HyroxSegment) =>
    segments.find((s) => s.kind === 'run' && s.round === station.round);
  const title =
    config.format === 'station' ? (stations[0]?.exercise.name ?? '') : t.hyroxTitle[config.format];

  return (
    <>
      <Text className="font-display text-26 uppercase text-text">{title}</Text>
      <View className="gap-1">
        {visible.map((station) => (
          <SegmentRow key={station.round} station={station} run={runOf(station)} />
        ))}
        {hidden.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((v) => !v)}
            className="h-[34px] justify-center px-2"
          >
            <Text className="font-body-semibold text-14 text-volt">
              {expanded
                ? t.lessSegments
                : t.moreSegments(hidden.length, hidden.map((s) => s.exercise.name).join(', '))}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-1.5">
        <View className="h-[30px] flex-row items-center rounded-sm bg-bg px-2.5">
          <Text className="font-body text-13 text-text">
            {t.division}
            <Text className="font-body-bold">{t.divisions[config.division]}</Text>
          </Text>
        </View>
        <View className="h-[30px] justify-center rounded-sm bg-bg px-2.5">
          <Text className="font-body text-13 text-text">
            {config.division === 'custom' ? t.freeWeights : t.officialWeights}
          </Text>
        </View>
        {config.timeTransitions ? (
          <View className="h-[30px] justify-center rounded-sm bg-bg px-2.5">
            <Text className="font-body text-13 text-text">{t.transitionsOn}</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

/** Carte d'un bloc de la séance type (maquette seance-multi-blocs). */
export function BlockCard({
  block,
  index,
  count,
  exercises,
  unit,
  onDragChange,
  handleGesture,
}: BlockCardProps) {
  const draft = useTemplateDraft();
  const hyrox = block.type === 'hyrox';
  const sets = block.items.reduce((sum, item) => sum + item.targetSets, 0);
  const tracking = (exerciseId: string) => exercises.get(exerciseId)?.trackingType ?? 'reps';

  const meta = (() => {
    switch (block.type) {
      case 'hyrox':
        return t.hyroxSubtitle;
      case 'strength':
        return t.exercisesSets(block.items.length, sets);
      case 'circuit':
        return circuitTitle(parseBlockConfig('circuit', block.config));
      default: {
        const minutes = Math.round(
          blockSeconds({
            type: block.type,
            config: block.config,
            items: block.items.map((i) => ({
              targetSets: i.targetSets,
              restSeconds: parseRest(i.restText) ?? 0,
              targetDistanceM: i.targetDistanceM,
              targetDurationS: i.targetDurationS,
            })),
          }) / 60,
        );
        return t.minutes(minutes);
      }
    }
  })();

  const openMenu = () =>
    Alert.alert(block.name ?? t.tags[block.type], undefined, [
      { text: block.type === 'strength' ? t.rename : t.edit, onPress: () => openEditor(block.key) },
      { text: t.duplicate, onPress: () => draft.duplicateBlock(block.key) },
      {
        text: t.delete,
        style: 'destructive' as const,
        onPress: () =>
          Alert.alert(t.deleteTitle, block.items.length > 0 ? t.deleteMessage : undefined, [
            { text: t.cancel, style: 'cancel' },
            { text: t.delete, style: 'destructive', onPress: () => draft.removeBlock(block.key) },
          ]),
      },
      { text: t.cancel, style: 'cancel' as const },
    ]);

  const warmup = block.type === 'warmup' ? parseBlockConfig('warmup', block.config) : null;
  const title = warmup ? (block.name ?? warmup.note ?? t.warmupDefault) : block.name;

  const body = (
    <>
      {title ? <Text className="font-body-bold text-17 text-text">{title}</Text> : null}
      {warmup && block.name && warmup.note ? (
        <Text className="font-body text-15 text-muted">{warmup.note}</Text>
      ) : null}
      {hyrox ? <HyroxBody block={block} /> : null}
      {block.type === 'circuit' || block.type === 'cardio' ? (
        block.items.length === 0 ? (
          <Text className="font-body text-15 text-muted">{t.noExercises}</Text>
        ) : (
          <View className="gap-1">
            {block.items.map((item) => {
              const exercise = exercises.get(item.exerciseId);
              const kind = tracking(item.exerciseId);
              return (
                <Text key={item.key} className="font-body text-15 text-text">
                  <Text className="font-body-bold">{exercise?.name ?? '—'}</Text>
                  {` · ${block.type === 'cardio' ? cardioLine(item, kind, unit) : itemTarget(item, kind, unit)}`}
                </Text>
              );
            })}
          </View>
        )
      ) : null}
    </>
  );

  return (
    <View
      className={cn('gap-2.5 rounded-cardSm bg-surface p-3', hyrox && 'border-[1.5px] border-volt')}
    >
      <View className="flex-row items-center gap-2.5">
        <GestureDetector gesture={handleGesture}>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t.move(block.name ?? t.tags[block.type])}
            accessibilityActions={[
              ...(index > 0 ? [{ name: 'moveUp', label: t.moveUp }] : []),
              ...(index < count - 1 ? [{ name: 'moveDown', label: t.moveDown }] : []),
            ]}
            onAccessibilityAction={(event) =>
              draft.moveBlock(
                index,
                event.nativeEvent.actionName === 'moveUp' ? index - 1 : index + 1,
              )
            }
            className="-ml-1 h-9 w-6 items-center justify-center"
          >
            <GripVertical size={18} color={colors.faint} strokeWidth={2} />
          </View>
        </GestureDetector>
        <Tag label={t.tags[block.type]} accent={hyrox} />
        <Text
          numberOfLines={1}
          className={cn('flex-1 font-body text-13 text-muted', !hyrox && 'text-right')}
        >
          {meta}
        </Text>
        <IconButton
          icon={Ellipsis}
          tone="ghost"
          size="sm"
          accessibilityLabel={t.menu}
          onPress={openMenu}
        />
      </View>

      {block.type === 'strength' ? (
        <>
          {title ? <Text className="font-body-bold text-17 text-text">{title}</Text> : null}
          <ReorderableList
            items={block.items}
            keyOf={(item) => item.key}
            onMove={(from, to) => draft.moveItem(block.key, from, to)}
            onDragChange={onDragChange}
            renderItem={(item, itemIndex, gesture) => (
              <TemplateItemCard
                item={item}
                exercise={exercises.get(item.exerciseId)}
                handleGesture={gesture}
                index={itemIndex}
                count={block.items.length}
                onChange={(patch) => draft.updateItem(item.key, patch)}
                onRemove={() => draft.removeItem(item.key)}
                onMove={(to) => draft.moveItem(block.key, itemIndex, to)}
              />
            )}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              draft.setPickTarget(block.key);
              router.push('/templates/pick-exercises');
            }}
            className="h-11 flex-row items-center justify-center gap-2 rounded-input border-[1.5px] border-dashed border-volt active:opacity-80"
          >
            <Plus size={16} color={colors.volt} strokeWidth={2.5} />
            <Text className="font-body-bold text-14 text-volt">{fr.templates.editor.add}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.edit} : ${t.tags[block.type]}`}
          onPress={() => openEditor(block.key)}
          className="gap-2.5 active:opacity-80"
        >
          {body}
        </Pressable>
      )}
    </View>
  );
}
