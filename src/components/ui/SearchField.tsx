import { Search, X } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors, iconSizes } from '@/theme/tokens';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  clearLabel?: string;
  className?: string;
};

/** Champ de recherche (h 48) avec loupe et bouton d'effacement. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  clearLabel = 'Effacer',
  className,
}: SearchFieldProps) {
  return (
    <View
      className={cn(
        'h-12 flex-row items-center gap-2.5 rounded-input border border-line bg-surface px-3.5',
        className,
      )}
    >
      <Search size={iconSizes.md} color={colors.muted} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        placeholderTextColor={colors.muted}
        selectionColor={colors.volt}
        keyboardAppearance="dark"
        autoCorrect={false}
        returnKeyType="search"
        className="h-full flex-1 font-body text-16 text-text"
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => onChangeText('')}
          hitSlop={10}
        >
          <X size={iconSizes.sm} color={colors.muted} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}
