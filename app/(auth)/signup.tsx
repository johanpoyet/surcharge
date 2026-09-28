import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Linking, Text, View } from 'react-native';

import {
  BrandWatermark,
  Button,
  Checkbox,
  KeyboardScreen,
  StackedTitle,
  TextField,
} from '@/components/ui';
import { config } from '@/config';
import { EmailConfirmationRequiredError, signUp } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordStrengthMeter } from '@/features/auth/components/PasswordStrengthMeter';
import { SocialButtons } from '@/features/auth/components/SocialButtons';
import { StepHeader } from '@/features/auth/components/StepHeader';
import { authErrorMessage } from '@/features/auth/errors';
import { signupSchema, type SignupValues } from '@/features/auth/schemas';
import { fr } from '@/i18n/fr';
import { zodResolver } from '@/lib/zodResolver';

const t = fr.auth.signup;

export default function SignupScreen() {
  const { setOnboardingPending } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: '', email: '', password: '', acceptTerms: false },
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    // Avant l'appel : la session arrive pendant signUp et la garde doit garder l'onboarding.
    setOnboardingPending(true);
    try {
      await signUp(values);
      router.replace('/onboarding');
    } catch (error) {
      setOnboardingPending(false);
      setFormError(
        error instanceof EmailConfirmationRequiredError ? t.confirmEmail : authErrorMessage(error),
      );
    }
  });

  return (
    <KeyboardScreen background={<BrandWatermark className="-right-[150px] top-20" />}>
      <StepHeader step={1} total={2} onBack={() => router.replace('/login')} />

      <View className="mt-7">
        <StackedTitle
          size={56}
          lines={[{ text: t.title[0] }, { text: t.title[1], accent: true }]}
        />
        <Text className="mt-2.5 font-body text-16 text-muted">{t.subtitle}</Text>
      </View>

      <View className="min-h-8 flex-1" />

      <View className="gap-3">
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label={t.firstName}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.firstName?.message}
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
            />
          )}
        />
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
              autoComplete="new-password"
              textContentType="newPassword"
              helper={<PasswordStrengthMeter password={password} />}
            />
          )}
        />
        <Controller
          control={control}
          name="acceptTerms"
          render={({ field: { onChange, value } }) => (
            <Checkbox checked={value} onChange={onChange} accessibilityLabel={t.termsA11y}>
              <Text className="font-body text-14 text-muted">
                {t.termsPrefix}
                <Text
                  className="font-body-semibold text-volt"
                  onPress={() => Linking.openURL(config.termsUrl)}
                >
                  {t.terms}
                </Text>
                {t.termsMiddle}
                <Text
                  className="font-body-semibold text-volt"
                  onPress={() => Linking.openURL(config.privacyUrl)}
                >
                  {t.privacy}
                </Text>
              </Text>
            </Checkbox>
          )}
        />
        {errors.acceptTerms?.message ? (
          <Text className="-mt-2 font-body-semibold text-13 text-danger">
            {errors.acceptTerms.message}
          </Text>
        ) : null}

        {formError ? (
          <Text className="font-body-semibold text-14 text-danger" accessibilityLiveRegion="polite">
            {formError}
          </Text>
        ) : null}

        <Button label={t.submit} withArrow loading={isSubmitting} onPress={onSubmit} />
        <SocialButtons prefixed />
        <View className="flex-row justify-center">
          <Text className="font-body text-15 text-muted">{t.hasAccount} </Text>
          <Link href="/login" replace>
            <Text className="font-body-bold text-15 text-volt">{t.login}</Text>
          </Link>
        </View>
      </View>
    </KeyboardScreen>
  );
}
