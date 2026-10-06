import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  Button,
  ChipGroup,
  KeyboardScreen,
  Overline,
  Stepper,
  Switch,
  TextField,
} from '@/components/ui';
import { formatDistance, formatMeters } from '@/features/exercises/tracking';
import { useExercises } from '@/features/exercises/hooks';
import { HYROX_STATIONS, type HyroxDivision } from '@/features/hyrox/catalog';
import { hyroxSegments } from '@/features/hyrox/segments';
import { useProfile } from '@/features/profile/hooks';
import { formatClock } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { formatWeight } from '@/lib/format';
import { colors } from '@/theme/tokens';
import {
  DEFAULT_CIRCUITS,
  parseBlockConfig,
  toJson,
  type CircuitConfig,
  type CircuitFormat,
  type HyroxConfig,
} from '../blockConfig';
import { useTemplateDraft, type DraftBlock } from '../draftStore';
import { BlockItemCard } from './BlockItemCard';

const t = fr.templates.blocks;
const te = t.editor;

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="font-body-bold text-12 uppercase tracking-wide text-muted">{label}</Text>
      {children}
    </View>
  );
}

function Param({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="flex-1 font-body-semibold text-15 text-text">{label}</Text>
      {children}
    </View>
  );
}

const DIVISIONS: readonly HyroxDivision[] = [
  'open_men',
  'open_women',
  'pro_men',
  'pro_women',
  'doubles',
  'custom',
];
const CIRCUIT_FORMATS: readonly CircuitFormat[] = ['amrap', 'emom', 'for_time', 'tabata'];

function HyroxEditor({ block }: { block: DraftBlock }) {
  const updateBlock = useTemplateDraft((s) => s.updateBlock);
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const config = parseBlockConfig('hyrox', block.config);
  const set = (patch: Partial<HyroxConfig>) =>
    updateBlock(block.key, { config: toJson({ ...config, ...patch }) });
  const segments = hyroxSegments(config);

  return (
    <>
      <Section label={te.format}>
        <ChipGroup
          options={(['full', 'half', 'station'] as const).map((value) => ({
            value,
            label: te.hyroxFormats[value],
          }))}
          value={config.format}
          onChange={(format) =>
            set({ format, stations: format === 'station' ? ['skierg'] : undefined })
          }
        />
        {config.format === 'half' ? (
          <Text className="font-body text-13 text-muted">{te.halfStations}</Text>
        ) : null}
      </Section>
      {config.format === 'station' ? (
        <Section label={te.station}>
          <ChipGroup
            options={HYROX_STATIONS.map((s) => ({ value: s.key, label: s.exercise.name }))}
            value={config.stations?.[0] ?? 'skierg'}
            onChange={(station) => set({ stations: [station] })}
          />
        </Section>
      ) : null}
      <Section label={te.division}>
        <ChipGroup
          options={DIVISIONS.map((value) => ({ value, label: t.divisions[value] }))}
          value={config.division}
          onChange={(division) => set({ division })}
        />
      </Section>
      <View className="flex-row items-center gap-3 rounded-tile bg-surface p-3.5">
        <View className="flex-1 gap-0.5">
          <Text className="font-body-semibold text-15 text-text">{te.transitions}</Text>
          <Text className="font-body text-13 leading-[18px] text-muted">{te.transitionsHint}</Text>
        </View>
        <Switch
          value={config.timeTransitions ?? false}
          onValueChange={(timeTransitions) => set({ timeTransitions })}
          accessibilityLabel={te.transitions}
        />
      </View>
      <Section label={te.segments(segments.length)}>
        <View className="gap-1">
          {segments.map((segment, index) => {
            const target = segment.distanceM
              ? segment.kind === 'station'
                ? formatMeters(segment.distanceM)
                : formatDistance(segment.distanceM)
              : t.reps(segment.reps ?? 0);
            const weight =
              segment.weightKg !== undefined
                ? t.weight(segment.weightCount, formatWeight(segment.weightKg, unit))
                : null;
            return (
              <View
                key={`${segment.kind}-${segment.round}-${index}`}
                className="h-[34px] flex-row items-center gap-2 rounded-sm bg-surface px-2"
              >
                <Text className="w-6 font-body-bold text-14 text-muted">{index + 1}</Text>
                <Text
                  className={cn(
                    'flex-1 text-14',
                    segment.kind === 'run' ? 'font-body text-muted' : 'font-body-bold text-text',
                  )}
                >
                  {segment.kind === 'run' ? t.run : segment.exercise.name}
                </Text>
                <Text className="font-body text-14 text-muted">
                  {weight ? `${target} · ${weight}` : target}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>
    </>
  );
}

function CircuitParams({ block }: { block: DraftBlock }) {
  const updateBlock = useTemplateDraft((s) => s.updateBlock);
  const config = parseBlockConfig('circuit', block.config);
  const set = (next: CircuitConfig) => updateBlock(block.key, { config: toJson(next) });
  const minutes = (seconds: number) => t.minutes(Math.round(seconds / 60));

  return (
    <>
      <Section label={te.format}>
        <ChipGroup
          options={CIRCUIT_FORMATS.map((value) => ({ value, label: t.circuitFormats[value] }))}
          value={config.format}
          onChange={(format) => set(DEFAULT_CIRCUITS[format])}
        />
      </Section>
      <View className="gap-3 rounded-tile bg-surface p-3.5">
        {config.format === 'amrap' ? (
          <Param label={te.durationAmrap}>
            <Stepper
              size="sm"
              value={config.durationS}
              onChange={(durationS) => set({ ...config, durationS })}
              step={60}
              min={60}
              max={3600}
              format={minutes}
            />
          </Param>
        ) : null}
        {config.format === 'emom' ? (
          <>
            <Param label={te.interval}>
              <Stepper
                size="sm"
                value={config.intervalS}
                onChange={(intervalS) => set({ ...config, intervalS })}
                step={15}
                min={15}
                max={600}
                format={formatClock}
              />
            </Param>
            <Param label={te.rounds}>
              <Stepper
                size="sm"
                value={config.rounds}
                onChange={(rounds) => set({ ...config, rounds })}
                step={1}
                min={1}
                max={100}
                format={String}
              />
            </Param>
          </>
        ) : null}
        {config.format === 'for_time' ? (
          <>
            <Param label={te.rounds}>
              <Stepper
                size="sm"
                value={config.rounds}
                onChange={(rounds) => set({ ...config, rounds })}
                step={1}
                min={1}
                max={100}
                format={String}
              />
            </Param>
            <Param label={te.timeCap}>
              <Stepper
                size="sm"
                value={config.timeCapS ?? 0}
                onChange={(cap) => set({ ...config, timeCapS: cap > 0 ? cap : undefined })}
                step={60}
                min={0}
                max={7200}
                format={(v) => (v > 0 ? minutes(v) : te.noTimeCap)}
              />
            </Param>
          </>
        ) : null}
        {config.format === 'tabata' ? (
          <>
            <Param label={te.work}>
              <Stepper
                size="sm"
                value={config.workS}
                onChange={(workS) => set({ ...config, workS })}
                step={5}
                min={5}
                max={300}
                format={(v) => `${v} s`}
              />
            </Param>
            <Param label={te.rest}>
              <Stepper
                size="sm"
                value={config.restS}
                onChange={(restS) => set({ ...config, restS })}
                step={5}
                min={0}
                max={300}
                format={(v) => `${v} s`}
              />
            </Param>
            <Param label={te.rounds}>
              <Stepper
                size="sm"
                value={config.rounds}
                onChange={(rounds) => set({ ...config, rounds })}
                step={1}
                min={1}
                max={50}
                format={String}
              />
            </Param>
          </>
        ) : null}
      </View>
    </>
  );
}

/** Exercices d'un bloc Course / cardio ou Circuit, avec l'ajout depuis la bibliothèque. */
function BlockItems({ block, kind }: { block: DraftBlock; kind: 'cardio' | 'circuit' }) {
  const draft = useTemplateDraft();
  const exercises = useExercises();
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  return (
    <Section label={kind === 'circuit' ? te.movements : te.exercises}>
      {block.items.map((item) => (
        <BlockItemCard
          key={item.key}
          item={item}
          exercise={byId.get(item.exerciseId)}
          kind={kind}
          unit={unit}
          onChange={(patch) => draft.updateItem(item.key, patch)}
          onRemove={() => draft.removeItem(item.key)}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          draft.setPickTarget(block.key);
          router.push('/templates/pick-exercises');
        }}
        className="h-[52px] flex-row items-center justify-center gap-2 rounded-input border-[1.5px] border-dashed border-volt active:opacity-80"
      >
        <Plus size={18} color={colors.volt} strokeWidth={2.5} />
        <Text className="font-body-bold text-15 text-volt">
          {kind === 'circuit' ? te.addMovements : te.addExercises}
        </Text>
      </Pressable>
    </Section>
  );
}

/** Édition d'un bloc de la séance type en cours (les modifications vont dans le brouillon). */
export function BlockEditor({ blockKey }: { blockKey: string }) {
  const block = useTemplateDraft((s) => s.blocks.find((b) => b.key === blockKey));
  const updateBlock = useTemplateDraft((s) => s.updateBlock);

  if (!block) return null;
  const warmup = block.type === 'warmup' ? parseBlockConfig('warmup', block.config) : null;

  return (
    <KeyboardScreen contentClassName="gap-4 px-screen">
      <View className="flex-row items-center justify-between">
        <View className="w-16" />
        <Overline className="text-13">{t.tags[block.type]}</Overline>
        <Button label={te.done} variant="ghost" size="sm" onPress={() => router.back()} />
      </View>

      <TextField
        label={te.name}
        labelStyle="overline"
        placeholder={t.options[block.type].title}
        value={block.name ?? ''}
        onChangeText={(name) => updateBlock(block.key, { name: name || null })}
        maxLength={40}
        autoCapitalize="sentences"
        returnKeyType="done"
      />

      {warmup ? (
        <>
          <Param label={te.duration}>
            <Stepper
              size="sm"
              value={warmup.durationMin ?? 10}
              onChange={(durationMin) =>
                updateBlock(block.key, { config: toJson({ ...warmup, durationMin }) })
              }
              step={1}
              min={1}
              max={60}
              format={(v) => t.minutes(v)}
            />
          </Param>
          <TextField
            label={te.note}
            labelStyle="overline"
            placeholder={te.notePlaceholder}
            value={warmup.note ?? ''}
            onChangeText={(note) =>
              updateBlock(block.key, { config: toJson({ ...warmup, note: note || undefined }) })
            }
            maxLength={120}
            multiline
          />
        </>
      ) : null}
      {block.type === 'hyrox' ? <HyroxEditor block={block} /> : null}
      {block.type === 'circuit' ? (
        <>
          <CircuitParams block={block} />
          <BlockItems block={block} kind="circuit" />
        </>
      ) : null}
      {block.type === 'cardio' ? <BlockItems block={block} kind="cardio" /> : null}

      <View className="min-h-4 flex-1" />
      <Button label={te.done} onPress={() => router.back()} />
    </KeyboardScreen>
  );
}
