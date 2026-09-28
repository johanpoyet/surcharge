import { forwardRef, useState, type ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

type TextFieldProps = TextInputProps & {
  label: string;
  /** `label` : 13 px (écrans d'auth) ; `overline` : 12 px majuscules espacées (formulaires). */
  labelStyle?: 'label' | 'overline';
  error?: string;
  /** Aide sous le champ (ex. jauge de mot de passe), remplacée par `error` si présent. */
  helper?: ReactNode;
  className?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, labelStyle = 'label', error, helper, multiline, onFocus, onBlur, className, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn('gap-1.5', className)}>
      <Text
        className={cn(
          'text-muted',
          labelStyle === 'label'
            ? 'font-body-semibold text-13'
            : 'font-body-bold text-12 uppercase tracking-wide',
        )}
      >
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.faint}
        selectionColor={colors.volt}
        keyboardAppearance="dark"
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        className={cn(
          'rounded-input bg-surface px-4 font-body text-16 text-text',
          multiline ? 'min-h-[76px] py-3 text-15' : 'h-[52px]',
          error
            ? 'border-[1.5px] border-danger'
            : focused
              ? 'border-[1.5px] border-volt'
              : 'border border-line',
        )}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {error ? (
        <Text className="font-body-semibold text-13 text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : (
        helper
      )}
    </View>
  );
});
