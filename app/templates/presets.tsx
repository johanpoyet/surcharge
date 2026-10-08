import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Heading, IconButton, useToast } from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDistance } from '@/features/exercises/tracking';
import { addPreset, CATALOG_BY_KEY, presetEstimateBlocks } from '@/features/templates/addPreset';
import { parseBlockConfig } from '@/features/templates/blockConfig';
import { circuitTitle } from '@/features/templates/blockSummary';
import { estimateTemplateMinutes } from '@/features/templates/estimate';
import { formatEstimate, formatRepsTarget, formatRest } from '@/features/templates/format';
import {
  PRESET_CATEGORIES,
  PRESETS,
  type Preset,
  type PresetBlock,
} from '@/features/templates/presets';
import { formatClock } from '@/features/workout/logic';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';

const t = fr.templates.presets;
const tb = fr.templates.blocks;

/** Lignes décrivant un bloc d'une séance toute prête. */
function blockLines(block: PresetBlock): string[] {
  const name = (key: string) => CATALOG_BY_KEY.get(key)?.name ?? key;
  const items = block.items ?? [];
  switch (block.type) {
    case 'warmup': {
      const config = parseBlockConfig('warmup', block.config ?? {});
      return [t.warmup(config.durationMin ?? 10, config.note ?? null)];
    }
    case 'hyrox': {
      const config = parseBlockConfig('hyrox', block.config ?? {});
      const title = config.format === 'station' ? tb.tags.hyrox : tb.hyroxTitle[config.format];
      return [`${title} · ${tb.divisions[config.division]}`];
    }
    case 'circuit': {
      const config = parseBlockConfig('circuit', block.config ?? {});
      return [
        circuitTitle(config),
        ...items.map((i) =>
          // Tabata : on enchaîne le mouvement pendant l'effort, sans nombre de reps.
          config.format === 'tabata'
            ? name(i.key)
            : i.calories
              ? `${i.calories} ${fr.units.cal} ${name(i.key)}`
              : `${i.reps?.[1] ?? 1} ${name(i.key)}`,
        ),
      ];
    }
    case 'cardio':
      return items.map((i) => {
        const target = i.distanceM ? formatDistance(i.distanceM) : formatClock(i.durationS ?? 0);
        const line = `${name(i.key)} · ${tb.itemSummary(i.sets, target)}`;
        return i.sets > 1 && i.restS ? `${line} · ${tb.restSuffix(formatRest(i.restS))}` : line;
      });
    case 'strength':
      return items.map((i) =>
        t.lift(
          name(i.key),
          i.sets,
          formatRepsTarget({ min: i.reps?.[0] ?? null, max: i.reps?.[1] ?? null }),
        ),
      );
  }
}

function PresetCard({
  preset,
  onAdd,
  added,
}: {
  preset: Preset;
  onAdd: () => void;
  added: boolean;
}) {
  const minutes = estimateTemplateMinutes(presetEstimateBlocks(preset));
  return (
    <View className="gap-2.5 rounded-card bg-surface p-4">
      <View>
        <Text className="font-display text-24 uppercase text-text">{preset.name}</Text>
        <Text className="font-body text-13 text-muted">
          {t.meta(t.levels[preset.level], formatEstimate(minutes))}
        </Text>
      </View>
      {preset.blocks.map((block, index) => (
        <View key={index} className="gap-1 rounded-input bg-bg p-3">
          <Text
            className={cn(
              'font-body-bold text-11 uppercase tracking-wide',
              block.type === 'hyrox' ? 'text-volt' : 'text-muted',
            )}
          >
            {tb.tags[block.type]}
          </Text>
          {blockLines(block).map((line, i) => (
            <Text key={i} className="font-body text-14 text-text">
              {line}
            </Text>
          ))}
        </View>
      ))}
      <Button
        label={added ? t.addAgain : t.add}
        variant={added ? 'secondary' : 'outline'}
        size="md"
        onPress={onAdd}
      />
    </View>
  );
}

/** Catalogue de séances toutes prêtes : une copie va dans « Mes séances », modifiable ensuite. */
export default function PresetsScreen() {
  const toast = useToast();
  const userId = useAuth().session?.user.id ?? '';
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());

  const add = (preset: Preset) => {
    if (!userId) return;
    addPreset(db, userId, preset);
    setAdded((current) => new Set(current).add(preset.key));
    toast.show(t.added(preset.name));
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center gap-3 px-screen pt-2">
        <IconButton icon={X} accessibilityLabel={t.close} onPress={() => router.back()} />
        <Heading size={30} className="flex-1">
          {t.title}
        </Heading>
      </View>
      <ScrollView contentContainerClassName="gap-3 px-screen pb-8 pt-3">
        <Text className="font-body text-14 text-muted">{t.hint}</Text>
        {PRESET_CATEGORIES.map((category) => (
          <View key={category} className="gap-2.5">
            <Text className="mt-2 font-body-bold text-18 text-text">{t.categories[category]}</Text>
            {PRESETS.filter((p) => p.category === category).map((preset) => (
              <PresetCard
                key={preset.key}
                preset={preset}
                added={added.has(preset.key)}
                onAdd={() => add(preset)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
