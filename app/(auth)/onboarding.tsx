import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  Button,
  ChoiceButton,
  KeyboardScreen,
  SegmentedControl,
  StackedTitle,
  Stepper,
} from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { StepHeader } from '@/features/auth/components/StepHeader';
import { authErrorMessage } from '@/features/auth/errors';
import { DisciplinesPicker } from '@/features/profile/components/DisciplinesPicker';
import { completeOnboarding, skipOnboarding } from '@/features/profile/onboarding';
import { signOut } from '@/features/auth/api';
import { fr } from '@/i18n/fr';
import type { Discipline, Goal, WeightUnit } from '@/lib/database.types';
import { formatNumber } from '@/lib/format';
import { convertDisplayed, fromKg, toKg } from '@/lib/units';

const t = fr.onboarding;

const GOALS: readonly Goal[] = ['muscle', 'strength', 'fat_loss', 'fitness'];
// « 6+ » est enregistré comme 6.
const SESSIONS = [1, 2, 3, 4, 5, 6] as const;
const UNITS = [
  { value: 'kg', label: fr.units.kg },
  { value: 'lb', label: fr.units.lb },
] as const;

const DEFAULT_WEIGHT_KG = 75;
const LIMITS_KG = { min: 30, max: 300 };

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="font-body-bold text-12 uppercase tracking-wide text-muted">{children}</Text>
  );
}

export default function OnboardingScreen() {
  const { session, setOnboardingPending } = useAuth();
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [weight, setWeight] = useState(DEFAULT_WEIGHT_KG);
  const [goal, setGoal] = useState<Goal>('muscle');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [disciplines, setDisciplines] = useState<Discipline[]>(['strength']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeUnit = (next: WeightUnit) => {
    setWeight((current) => convertDisplayed(current, unit, next));
    setUnit(next);
  };

  const onSkip = async () => {
    if (!session) return;
    setSaving(true);
    await skipOnboarding(session.user.id);
    setOnboardingPending(false);
  };

  const onSubmit = async () => {
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding(session.user.id, {
        weightKg: toKg(weight, unit),
        weightUnit: unit,
        goal,
        sessionsPerWeek,
        disciplines,
      });
      setOnboardingPending(false);
    } catch (e) {
      setError(authErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <KeyboardScreen contentClassName="gap-5">
      {/* Retour = abandon de l'inscription en cours : on revient à la connexion. */}
      <StepHeader step={2} total={2} onBack={() => void signOut()} />

      <StackedTitle size={48} lines={[{ text: t.title[0] }, { text: t.title[1], accent: true }]} />

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <SectionLabel>{t.weight}</SectionLabel>
          <SegmentedControl
            size="sm"
            tone="surface"
            options={UNITS}
            value={unit}
            onChange={changeUnit}
          />
        </View>
        <Stepper
          size="xl"
          value={weight}
          onChange={setWeight}
          step={0.1}
          min={Math.round(fromKg(LIMITS_KG.min, unit))}
          max={Math.round(fromKg(LIMITS_KG.max, unit))}
          unit={fr.units[unit]}
          format={(v) => formatNumber(v, 1)}
        />
      </View>

      <View className="gap-2">
        <SectionLabel>{t.disciplines}</SectionLabel>
        <DisciplinesPicker value={disciplines} onChange={setDisciplines} />
        <Text className="font-body text-13 text-muted">{t.disciplinesHint}</Text>
      </View>

      <View className="gap-2">
        <SectionLabel>{t.goal}</SectionLabel>
        <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
          {GOALS.map((g) => (
            <ChoiceButton
              key={g}
              label={t.goals[g]}
              selected={goal === g}
              onPress={() => setGoal(g)}
              className="grow basis-[48%]"
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <SectionLabel>{t.sessionsPerWeek}</SectionLabel>
        <View accessibilityRole="radiogroup" className="flex-row gap-1.5">
          {SESSIONS.map((n) => {
            const label = n === 6 ? '6+' : String(n);
            return (
              <ChoiceButton
                key={n}
                display
                label={label}
                accessibilityLabel={t.sessionsA11y(label)}
                selected={sessionsPerWeek === n}
                onPress={() => setSessionsPerWeek(n)}
                className="flex-1"
              />
            );
          })}
        </View>
        <Text className="font-body text-13 text-muted">{t.sessionsHint}</Text>
      </View>

      <View className="min-h-6 flex-1" />

      {error ? (
        <Text className="font-body-semibold text-14 text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label={t.submit} loading={saving} onPress={onSubmit} />
      <Button
        label={t.skip}
        variant="ghost"
        tone="muted"
        size="sm"
        disabled={saving}
        onPress={onSkip}
      />
    </KeyboardScreen>
  );
}
