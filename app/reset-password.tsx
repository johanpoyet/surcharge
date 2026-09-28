import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Text, View } from 'react-native';

import {
  BrandWatermark,
  Button,
  KeyboardScreen,
  StackedTitle,
  TextField,
  useToast,
} from '@/components/ui';
import { exchangeResetCode, updatePassword } from '@/features/auth/api';
import { authErrorMessage } from '@/features/auth/errors';
import { newPasswordSchema, type NewPasswordValues } from '@/features/auth/schemas';
import { fr } from '@/i18n/fr';
import { zodResolver } from '@/lib/zodResolver';
import { colors } from '@/theme/tokens';

const t = fr.auth.resetPassword;

type LinkState = 'checking' | 'ready' | 'invalid';

/** Ouvert par le lien « mot de passe oublié » : surcharge://reset-password?code=… */
export default function ResetPasswordScreen() {
  const toast = useToast();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [linkState, setLinkState] = useState<LinkState>(code ? 'checking' : 'invalid');
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    if (!code) return;
    exchangeResetCode(code)
      .then(() => setLinkState('ready'))
      .catch(() => setLinkState('invalid'));
  }, [code]);

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await updatePassword(password);
      toast.show(t.success);
      router.replace('/');
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <KeyboardScreen background={<BrandWatermark className="-right-[150px] top-20" />}>
      <View className="mt-10">
        <StackedTitle
          size={56}
          lines={[{ text: t.title[0] }, { text: t.title[1], accent: true }]}
        />
        <Text className="mt-2.5 font-body text-16 text-muted">{t.subtitle}</Text>
      </View>

      <View className="min-h-8 flex-1" />

      {linkState === 'checking' ? (
        <View className="items-center gap-3">
          <ActivityIndicator color={colors.volt} />
          <Text className="font-body text-15 text-muted">{t.checking}</Text>
        </View>
      ) : null}

      {linkState === 'invalid' ? (
        <View className="gap-4">
          <Text className="font-body-semibold text-15 text-danger">{t.invalidLink}</Text>
          <Button
            label={t.backToLogin}
            variant="secondary"
            onPress={() => router.replace('/login')}
          />
        </View>
      ) : null}

      {linkState === 'ready' ? (
        <View className="gap-4">
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label={t.password}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={onSubmit}
              />
            )}
          />
          {formError ? (
            <Text className="font-body-semibold text-14 text-danger">{formError}</Text>
          ) : null}
          <Button label={t.submit} loading={isSubmitting} onPress={onSubmit} />
        </View>
      ) : null}
    </KeyboardScreen>
  );
}
