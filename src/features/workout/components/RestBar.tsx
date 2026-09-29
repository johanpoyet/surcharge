import { Timer } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { colors } from '@/theme/tokens';
import { formatClock } from '../logic';

const t = fr.workout.rest;

type RestBarProps = {
  remainingSeconds: number;
  durationSeconds: number;
  nextLabel: string;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
};

function SmallButton({
  label,
  a11y,
  onPress,
}: {
  label: string;
  a11y: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      hitSlop={6}
      className="h-8 justify-center rounded-sm bg-surface2 px-3 active:opacity-80"
    >
      <Text className="font-body-bold text-13 text-text">{label}</Text>
    </Pressable>
  );
}

/** Chrono de repos : temps restant, progression, « ensuite : … », −15 s / +15 s. */
export function RestBar({
  remainingSeconds,
  durationSeconds,
  nextLabel,
  onAdjust,
  onSkip,
}: RestBarProps) {
  const elapsed = durationSeconds > 0 ? 1 - remainingSeconds / durationSeconds : 1;
  return (
    <View className="gap-2 rounded-cta bg-surface px-3 py-2.5">
      <View className="flex-row items-center gap-3">
        <Timer size={22} color={colors.volt} strokeWidth={2} />
        <View className="flex-1">
          <Text numberOfLines={1} className="font-body text-13 text-muted">
            {t.label(nextLabel)}
          </Text>
          <View className="mt-1.5 h-1 overflow-hidden rounded-[2px] bg-line">
            <View
              className="h-1 bg-volt"
              style={{ width: `${Math.min(100, Math.max(0, elapsed * 100))}%` }}
            />
          </View>
        </View>
        <Text
          accessibilityLabel={formatClock(remainingSeconds)}
          accessibilityLiveRegion="polite"
          className="font-display text-26 text-text"
        >
          {formatClock(remainingSeconds)}
        </Text>
      </View>
      <View className="flex-row justify-end gap-2">
        <SmallButton label={t.minus} a11y={t.minusA11y} onPress={() => onAdjust(-15)} />
        <SmallButton label={t.plus} a11y={t.plusA11y} onPress={() => onAdjust(15)} />
        <SmallButton label={t.skip} a11y={t.skip} onPress={onSkip} />
      </View>
    </View>
  );
}
