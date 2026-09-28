import { Text, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { passwordStrength, strengthSegments } from '../passwordStrength';

const SEGMENTS = 3;

/** Jauge de solidité sous le champ mot de passe (inscription). */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  const filled = strengthSegments[strength];
  const ok = strength === 'correct' || strength === 'strong';

  return (
    <View className="flex-row items-center gap-2.5" accessibilityLiveRegion="polite">
      <View className="flex-row gap-1">
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <View
            key={index}
            className={cn(
              'h-1 w-7 rounded-[2px]',
              index < filled ? (ok ? 'bg-volt' : 'bg-diffHard') : 'bg-line',
            )}
          />
        ))}
      </View>
      <Text className="font-body text-13 text-muted">
        {strength === 'empty' ? null : (
          <Text className={cn('font-body-bold', ok ? 'text-volt' : 'text-diffHard')}>
            {fr.auth.strength[strength]}
            {' · '}
          </Text>
        )}
        {fr.auth.strength.hint}
      </Text>
    </View>
  );
}
