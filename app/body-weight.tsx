import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Heading, Stepper, useToast } from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBodyWeights, useProfile } from '@/features/profile/hooks';
import { saveBodyWeight } from '@/features/profile/repository';
import { fr } from '@/i18n/fr';
import { formatNumber, toLocalDateString } from '@/lib/format';
import { fromKg, roundTenth, toKg } from '@/lib/units';

const t = fr.profile.weightEntry;
const DEFAULT_KG = 75;

/** Nouvelle pesée (aujourd'hui) ; une pesée existante du jour est remplacée. */
export default function BodyWeightScreen() {
  const toast = useToast();
  const userId = useAuth().session?.user.id ?? '';
  const unit = useProfile().profile?.weightUnit ?? 'kg';
  const weights = useBodyWeights();
  const lastKg = weights[weights.length - 1]?.weightKg ?? DEFAULT_KG;
  const [value, setValue] = useState(() => roundTenth(fromKg(lastKg, unit)));

  const save = () => {
    if (!userId) return;
    saveBodyWeight(
      db,
      userId,
      toLocalDateString(new Date()),
      Math.round(toKg(value, unit) * 100) / 100,
    );
    toast.show(t.saved);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg px-screen">
      <View className="flex-row items-center justify-between pt-2">
        <Button
          label={t.cancel}
          variant="ghost"
          tone="muted"
          size="sm"
          onPress={() => router.back()}
        />
      </View>
      <View className="flex-1 justify-center gap-4">
        <Heading size={40}>{t.title}</Heading>
        <Text className="font-body text-15 text-muted">{t.today}</Text>
        <Stepper
          size="xl"
          value={value}
          onChange={setValue}
          step={0.1}
          min={20}
          max={unit === 'lb' ? 660 : 300}
          unit={fr.units[unit]}
          format={(v) => formatNumber(v, 1)}
        />
      </View>
      <Button label={t.save} className="mb-2" onPress={save} />
    </SafeAreaView>
  );
}
