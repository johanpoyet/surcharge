import { useEffect, useState } from 'react';
import { Animated, Pressable } from 'react-native';

import { cn } from '@/lib/cn';

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  className?: string;
};

// Piste 48×28, pastille 22 à 3 px du bord.
const TRAVEL = 48 - 22 - 3 * 2;

export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
  className,
}: SwitchProps) {
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [position, value]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      className={cn(
        'h-7 w-12 justify-center rounded-full px-[3px]',
        value ? 'bg-volt' : 'bg-line',
        disabled && 'opacity-40',
        className,
      )}
    >
      <Animated.View
        className={cn('h-[22px] w-[22px] rounded-full', value ? 'bg-bg' : 'bg-muted')}
        style={{
          transform: [
            { translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] }) },
          ],
        }}
      />
    </Pressable>
  );
}
