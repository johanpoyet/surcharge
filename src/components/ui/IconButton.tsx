import type { LucideIcon } from 'lucide-react-native';
import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';
import { colors, iconSizes } from '@/theme/tokens';

type IconButtonTone = 'surface' | 'volt' | 'raised' | 'ghost';

type IconButtonProps = Omit<PressableProps, 'children'> & {
  icon: LucideIcon;
  /** Obligatoire : un bouton icône n'a pas de texte visible. */
  accessibilityLabel: string;
  tone?: IconButtonTone;
  size?: 'md' | 'sm';
  className?: string;
};

const toneClasses: Record<IconButtonTone, string> = {
  surface: 'bg-surface',
  volt: 'bg-volt',
  raised: 'bg-line',
  ghost: '',
};

const iconColors: Record<IconButtonTone, string> = {
  surface: colors.text,
  volt: colors.onVolt,
  raised: colors.volt,
  ghost: colors.muted,
};

/** Bouton carré 44×44 (36×36 en `sm`, avec zone tactile étendue à 44). */
export function IconButton({
  icon: Icon,
  tone = 'surface',
  size = 'md',
  disabled,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={size === 'sm' ? 4 : undefined}
      className={cn(
        'items-center justify-center active:opacity-80',
        size === 'md' ? 'h-11 w-11 rounded-input' : 'h-9 w-9 rounded-button',
        toneClasses[tone],
        disabled && 'opacity-40',
        className,
      )}
      {...props}
    >
      <Icon
        size={size === 'md' ? iconSizes.md : iconSizes.sm}
        color={iconColors[tone]}
        strokeWidth={2}
      />
    </Pressable>
  );
}
