import { Pressable, ScrollView, Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type ChipSize = 'md' | 'sm';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** `md` : formulaires (h 38) ; `sm` : filtres de liste (h 36). */
  size?: ChipSize;
  className?: string;
};

export function Chip({ label, selected = false, onPress, size = 'md', className }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      className={cn(
        'items-center justify-center rounded-button px-3.5 active:opacity-80',
        size === 'md' ? 'h-[38px]' : 'h-9',
        selected ? 'bg-volt' : 'border border-line bg-surface',
        className,
      )}
    >
      <Text
        className={cn(
          'text-14',
          selected ? 'font-body-bold text-onVolt' : 'font-body-semibold text-text',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export type ChipOption<T extends string> = { value: T; label: string };

type ChipGroupBase<T extends string> = {
  options: readonly ChipOption<T>[];
  /** `wrap` : retour à la ligne (formulaires) ; `scroll` : défilement horizontal (filtres). */
  layout?: 'wrap' | 'scroll';
  size?: ChipSize;
  className?: string;
};

type SingleProps<T extends string> = ChipGroupBase<T> & {
  multiple?: false;
  value: T | null;
  onChange: (value: T) => void;
};

type MultipleProps<T extends string> = ChipGroupBase<T> & {
  multiple: true;
  value: readonly T[];
  onChange: (value: T[]) => void;
};

/** Groupe de chips en sélection simple ou multiple. */
export function ChipGroup<T extends string>(props: SingleProps<T> | MultipleProps<T>) {
  const { options, layout = 'wrap', size = 'md', className } = props;

  const isSelected = (option: T) =>
    props.multiple ? props.value.includes(option) : props.value === option;

  const toggle = (option: T) => {
    if (props.multiple) {
      const next = props.value.includes(option)
        ? props.value.filter((v) => v !== option)
        : [...props.value, option];
      props.onChange(next);
    } else {
      props.onChange(option);
    }
  };

  const chips = options.map((option) => (
    <Chip
      key={option.value}
      label={option.label}
      size={size}
      selected={isSelected(option.value)}
      onPress={() => toggle(option.value)}
    />
  ));

  if (layout === 'scroll') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-1.5"
        className={className}
      >
        {chips}
      </ScrollView>
    );
  }
  return <View className={cn('flex-row flex-wrap gap-1.5', className)}>{chips}</View>;
}
