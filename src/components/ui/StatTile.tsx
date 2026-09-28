import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type StatTileProps = {
  value: string;
  /** Suffixe plus petit collé à la valeur (« 5 sem. »). */
  unit?: string;
  /** Légende sous la valeur. */
  caption?: string;
  /** Libellé au-dessus de la valeur (détail exercice : « Record »). */
  label?: string;
  /** Valeur en volt (record). */
  accent?: boolean;
  className?: string;
};

/** Gros chiffre condensé + légende muted. */
export function StatTile({
  value,
  unit,
  caption,
  label,
  accent = false,
  className,
}: StatTileProps) {
  return (
    <View
      accessible
      accessibilityLabel={[label, value, unit, caption].filter(Boolean).join(' ')}
      className={cn('flex-1 rounded-tile bg-surface px-3 py-3.5', className)}
    >
      {label ? <Text className="mb-1 font-body text-13 text-muted">{label}</Text> : null}
      <Text className={cn('font-display text-32', accent ? 'text-volt' : 'text-text')}>
        {value}
        {unit ? <Text className="text-18"> {unit}</Text> : null}
      </Text>
      {caption ? <Text className="mt-1 font-body text-13 text-muted">{caption}</Text> : null}
    </View>
  );
}
