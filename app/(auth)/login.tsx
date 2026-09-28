import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import {
  BrandWatermark,
  Button,
  KeyboardScreen,
  Logo,
  StackedTitle,
  TextField,
  useToast,
} from '@/components/ui';
import { requestPasswordReset, signIn } from '@/features/auth/api';
import { OrDivider } from '@/features/auth/components/Divider';
import { SocialButtons } from '@/features/auth/components/SocialButtons';
import { authErrorMessage } from '@/features/auth/errors';
import { emailSchema, loginSchema, type LoginValues } from '@/features/auth/schemas';
import { fr } from '@/i18n/fr';
import { zodResolver } from '@/lib/zodResolver';

const t = fr.auth.login;

export default function LoginScreen() {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values);
      // La garde de navigation bascule vers les onglets dès que la session existe.
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  });

  const onForgot = async () => {
    const parsed = emailSchema.safeParse(getValues('email'));
    if (!parsed.success) {
      setError('email', { message: t.resetNeedsEmail });
      return;
    }
    try {
      await requestPasswordReset(parsed.data);
      toast.show(t.resetSent(parsed.data));
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  };

  return (
    <KeyboardScreen background={<BrandWatermark className="-right-[120px] top-24" />}>
      <View className="flex-row items-center gap-2.5 pt-2">
        <Logo />
        <Text className="font-display text-24 text-text">{fr.app.name.toUpperCase()}</Text>
      </View>

      <View className="mt-10">
        <StackedTitle
          lines={fr.app.tagline.map((text, index) => ({
            text,
            accent: index === fr.app.tagline.length - 1,
          }))}
        />
        <Text className="mt-3.5 max-w-[290px] font-body text-16 leading-[23px] text-muted">
          {t.subtitle}
        </Text>
      </View>

      <View className="min-h-8 flex-1" />

      <View className="gap-3.5">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label={t.email}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
          )}
        />
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
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />
        <View className="items-end">
          <Button label={t.forgot} variant="ghost" size="sm" className="h-8" onPress={onForgot} />
        </View>

        {formError ? (
          <Text className="font-body-semibold text-14 text-danger" accessibilityLiveRegion="polite">
            {formError}
          </Text>
        ) : null}

        <Button label={t.submit} withArrow loading={isSubmitting} onPress={onSubmit} />
        <OrDivider />
        <SocialButtons />
        <View className="flex-row justify-center">
          <Text className="font-body text-15 text-muted">{t.noAccount} </Text>
          <Link href="/signup" replace>
            <Text className="font-body-bold text-15 text-volt">{t.createAccount}</Text>
          </Link>
        </View>
      </View>
    </KeyboardScreen>
  );
}
