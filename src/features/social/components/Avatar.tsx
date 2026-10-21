import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type AvatarProps = {
  name: string;
  /** Moi : fond volt. */
  highlight?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = {
  sm: { box: 'h-10 w-10 rounded-button', text: 'text-16' },
  md: { box: 'h-12 w-12 rounded-input', text: 'text-18' },
  lg: { box: 'h-[88px] w-[88px] rounded-hero', text: 'text-44' },
};

/** Initiale du prénom (pas de photo de profil : SPEC_V2 §6.2). */
export function Avatar({ name, highlight = false, size = 'sm' }: AvatarProps) {
  const s = SIZES[size];
  return (
    <View
      className={cn('items-center justify-center', s.box, highlight ? 'bg-volt' : 'bg-surface2')}
    >
      <Text
        className={cn(
          size === 'lg' ? 'px-1 font-display' : 'font-body-bold',
          s.text,
          highlight ? 'text-onVolt' : 'text-text',
        )}
      >
        {(name.trim().charAt(0) || '?').toUpperCase()}
      </Text>
    </View>
  );
}
