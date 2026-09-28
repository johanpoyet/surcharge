import { Plus, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { colors, iconSizes } from '@/theme/tokens';

export type TabBarItem<K extends string> = {
  key: K;
  label: string;
  icon: LucideIcon;
};

type TabBarProps<K extends string> = {
  /** 4 onglets : 2 avant et 2 après le bouton central. */
  items: readonly [TabBarItem<K>, TabBarItem<K>, TabBarItem<K>, TabBarItem<K>];
  activeKey: K;
  onSelect: (key: K) => void;
  onCenterPress: () => void;
  centerLabel?: string;
  className?: string;
};

// Bas de barre : 24 px sous les libellés dans la maquette (iPhone avec barre d'accueil).
const MIN_BOTTOM_PADDING = 12;
const HOME_INDICATOR_OFFSET = 10;

/** Barre d'onglets custom : Accueil, Séances, + central surélevé, Exercices, Profil. */
export function TabBar<K extends string>({
  items,
  activeKey,
  onSelect,
  onCenterPress,
  centerLabel = fr.tabs.start,
  className,
}: TabBarProps<K>) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(MIN_BOTTOM_PADDING, insets.bottom - HOME_INDICATOR_OFFSET);

  const renderItem = (item: TabBarItem<K>) => {
    const active = item.key === activeKey;
    const Icon = item.icon;
    return (
      <Pressable
        key={item.key}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
        onPress={() => onSelect(item.key)}
        className="min-h-11 w-16 items-center justify-center gap-1"
      >
        <Icon size={iconSizes.lg} color={active ? colors.volt : colors.muted} strokeWidth={2} />
        <Text className={cn('font-body-semibold text-12', active ? 'text-volt' : 'text-muted')}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  const [first, second, third, fourth] = items;

  return (
    <View
      accessibilityRole="tablist"
      style={{ paddingBottom }}
      className={cn(
        'flex-row items-center justify-between border-t border-surface2 bg-bg px-3.5 pt-2.5',
        className,
      )}
    >
      {renderItem(first)}
      {renderItem(second)}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={centerLabel}
        onPress={onCenterPress}
        className="-mt-[26px] h-[58px] w-[58px] items-center justify-center rounded-cardSm border-4 border-bg bg-volt active:opacity-80"
      >
        <Plus size={28} color={colors.onVolt} strokeWidth={2.5} />
      </Pressable>
      {renderItem(third)}
      {renderItem(fourth)}
    </View>
  );
}
