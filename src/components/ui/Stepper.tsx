import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { colors } from '@/theme/tokens';

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
  /** Unité affichée sous la valeur (`lg`) ou à côté (`md`). */
  unit?: string;
  /** `lg` : séance en cours (h 56, unité en dessous) ; `md` : formulaires (h 52, unité à côté). */
  size?: 'lg' | 'md';
  decrementLabel?: string;
  incrementLabel?: string;
  className?: string;
};

// Appui long : premier pas après LONG_PRESS_DELAY, puis répétition de plus en plus rapide.
const LONG_PRESS_DELAY = 350;
const REPEAT_START_MS = 160;
const REPEAT_MIN_MS = 50;
const REPEAT_ACCELERATION = 0.85;

// Évite les erreurs de flottants (82.5 + 2.5 × n).
const roundStep = (value: number) => Math.round(value * 100) / 100;

export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  format = (v) => formatNumber(v, 2),
  unit,
  size = 'lg',
  decrementLabel,
  incrementLabel,
  className,
}: StepperProps) {
  // Refs : le minuteur de répétition doit lire la valeur la plus récente.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stepBy = useCallback(
    (direction: 1 | -1): boolean => {
      const next = roundStep(Math.min(max, Math.max(min, valueRef.current + direction * step)));
      if (next === valueRef.current) return false;
      valueRef.current = next;
      onChangeRef.current(next);
      void Haptics.selectionAsync();
      return true;
    },
    [max, min, step],
  );

  const stopRepeat = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startRepeat = useCallback(
    (direction: 1 | -1) => {
      stopRepeat();
      const tick = (delay: number) => {
        if (!stepBy(direction)) return; // borne atteinte
        timerRef.current = setTimeout(
          () => tick(Math.max(REPEAT_MIN_MS, delay * REPEAT_ACCELERATION)),
          delay,
        );
      };
      tick(REPEAT_START_MS);
    },
    [stepBy, stopRepeat],
  );

  useEffect(() => stopRepeat, [stopRepeat]);

  const formattedStep = unit ? `${formatNumber(step, 2)} ${unit}` : formatNumber(step, 2);
  const large = size === 'lg';
  const buttonClass = 'h-11 w-11 items-center justify-center rounded-button active:opacity-80';
  const iconSize = large ? 24 : 22;

  const renderButton = (direction: 1 | -1) => {
    const increment = direction === 1;
    const disabled = increment ? value >= max : value <= min;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          increment
            ? (incrementLabel ?? fr.stepper.increase(formattedStep))
            : (decrementLabel ?? fr.stepper.decrease(formattedStep))
        }
        accessibilityState={{ disabled }}
        disabled={disabled}
        delayLongPress={LONG_PRESS_DELAY}
        onPress={() => stepBy(direction)}
        onLongPress={() => startRepeat(direction)}
        onPressOut={stopRepeat}
        className={cn(buttonClass, increment ? 'bg-volt' : 'bg-surface2', disabled && 'opacity-40')}
      >
        {increment ? (
          <Plus size={iconSize} color={colors.onVolt} strokeWidth={2.5} />
        ) : (
          <Minus size={iconSize} color={colors.text} strokeWidth={2.5} />
        )}
      </Pressable>
    );
  };

  const display = format(value);

  return (
    <View
      className={cn(
        'flex-row items-center justify-between',
        large
          ? 'h-14 rounded-input border border-line bg-bg px-[5px]'
          : 'h-[52px] w-40 rounded-input bg-surface px-1',
        className,
      )}
    >
      {renderButton(-1)}
      {large ? (
        <View className="items-center" accessibilityLiveRegion="polite">
          <Text className="font-display text-26 text-text">{display}</Text>
          {unit ? (
            <Text className="-mt-1 font-body-bold text-10 uppercase tracking-wide text-muted">
              {unit}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text className="font-display text-22 text-text" accessibilityLiveRegion="polite">
          {unit ? `${display} ${unit}` : display}
        </Text>
      )}
      {renderButton(1)}
    </View>
  );
}
