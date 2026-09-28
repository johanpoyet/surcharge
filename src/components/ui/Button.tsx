import { ArrowRight, type LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';
import { colors, iconSizes } from '@/theme/tokens';

export type ButtonVariant =
  | 'primary' // fond volt, texte condensé majuscule
  | 'secondary' // contour gris
  | 'outline' // contour volt, texte volt
  | 'ghost' // texte seul
  | 'dark' // fond noir, texte volt (sur la carte volt « Séance du jour »)
  | 'darkOutline'; // contour noir (sur fond volt)

export type ButtonSize = 'lg' | 'md' | 'sm';

type GhostTone = 'volt' | 'muted' | 'danger';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Carré noir avec flèche à droite (écran de connexion). */
  withArrow?: boolean;
  icon?: LucideIcon;
  loading?: boolean;
  tone?: GhostTone;
  className?: string;
};

const sizeClasses: Record<ButtonSize, string> = {
  lg: 'h-[58px] rounded-cta px-5',
  md: 'h-[50px] rounded-input px-4',
  sm: 'h-10 rounded-button px-3.5',
};

const containerClasses: Record<ButtonVariant, string> = {
  primary: 'bg-volt',
  secondary: 'border border-line',
  outline: 'border-[1.5px] border-volt',
  ghost: 'px-0',
  dark: 'bg-onVolt',
  darkOutline: 'border-2 border-onVolt',
};

const ghostToneClasses: Record<GhostTone, string> = {
  volt: 'text-volt',
  muted: 'text-muted',
  danger: 'text-danger',
};

function labelClasses(variant: ButtonVariant, size: ButtonSize, tone: GhostTone): string {
  switch (variant) {
    case 'primary':
      return cn('font-display uppercase text-onVolt', size === 'lg' ? 'text-22' : 'text-20');
    case 'dark':
      return 'font-display text-20 uppercase text-volt';
    case 'darkOutline':
      return 'font-body-bold text-15 text-onVolt';
    case 'secondary':
      return cn('font-body-semibold text-text', size === 'sm' ? 'text-14' : 'text-15');
    case 'outline':
      return 'font-body-bold text-15 text-volt';
    case 'ghost':
      return cn('font-body-bold text-15', ghostToneClasses[tone]);
  }
}

const contentColors: Record<ButtonVariant, string> = {
  primary: colors.onVolt,
  secondary: colors.text,
  outline: colors.volt,
  ghost: colors.volt,
  dark: colors.volt,
  darkOutline: colors.onVolt,
};

export function Button({
  label,
  variant = 'primary',
  size,
  withArrow = false,
  icon: Icon,
  loading = false,
  tone = 'volt',
  disabled,
  className,
  ...props
}: ButtonProps) {
  const resolvedSize = size ?? (variant === 'primary' ? 'lg' : 'md');
  const isDisabled = disabled === true || loading;
  const contentColor = variant === 'ghost' ? colors[tone] : contentColors[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center active:opacity-80',
        sizeClasses[resolvedSize],
        containerClasses[variant],
        withArrow ? 'justify-between pl-[22px] pr-1.5' : 'justify-center gap-2',
        isDisabled && 'opacity-40',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          {Icon ? <Icon size={iconSizes.md} color={contentColor} strokeWidth={2} /> : null}
          <Text className={labelClasses(variant, resolvedSize, tone)}>{label}</Text>
          {withArrow ? (
            <View className="h-[46px] w-[46px] items-center justify-center rounded-button bg-onVolt">
              <ArrowRight size={iconSizes.md} color={colors.volt} strokeWidth={2.5} />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
