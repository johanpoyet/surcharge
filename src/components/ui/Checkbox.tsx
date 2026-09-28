import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accessibilityLabel: string;
  /** Libellé à droite (peut contenir des liens). */
  children?: ReactNode;
  className?: string;
};

export function Checkbox({
  checked,
  onChange,
  accessibilityLabel,
  children,
  className,
}: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      className={cn('min-h-11 flex-row items-center gap-3', className)}
    >
      <View
        className={cn(
          'h-6 w-6 items-center justify-center rounded-tag',
          checked ? 'bg-volt' : 'border-[1.5px] border-lineStrong bg-surface',
        )}
      >
        {checked ? <Check size={16} color={colors.onVolt} strokeWidth={3} /> : null}
      </View>
      {children ? <View className="flex-1">{children}</View> : null}
    </Pressable>
  );
}
