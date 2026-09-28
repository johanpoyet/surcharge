import { Redirect, router } from 'expo-router';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Dumbbell,
  House,
  Plus,
  UserRound,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  Checkbox,
  ChipGroup,
  DifficultyBadge,
  DifficultyPicker,
  Heading,
  IconButton,
  Overline,
  PhotoSlot,
  ProgressSegments,
  SegmentedControl,
  StackedTitle,
  StatTile,
  Stepper,
  Switch,
  TabBar,
  Tabs,
  TextField,
  useToast,
} from '@/components/ui';
import { DIFFICULTIES, type Difficulty } from '@/features/workout/difficulty';
import { fr } from '@/i18n/fr';

const s = fr.dev.samples;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Overline>{title}</Overline>
      {children}
    </View>
  );
}

const toOptions = <T extends string>(labels: readonly T[]) =>
  labels.map((label) => ({ value: label, label }));

type TabKey = 'home' | 'sessions' | 'exercises' | 'profile';

const tabItems = [
  { key: 'home', label: fr.tabs.home, icon: House },
  { key: 'sessions', label: fr.tabs.sessions, icon: CalendarDays },
  { key: 'exercises', label: fr.tabs.exercises, icon: Dumbbell },
  { key: 'profile', label: fr.tabs.profile, icon: UserRound },
] as const;

/** Écran caché (dev uniquement) qui présente tout le design system (SPEC Phase 1). */
export default function ComponentsScreen() {
  const toast = useToast();
  const [weight, setWeight] = useState(82.5);
  const [reps, setReps] = useState(6);
  const [weightStep, setWeightStep] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty | null>('hard');
  const [muscle, setMuscle] = useState<string | null>('Jambes');
  const [muscles, setMuscles] = useState<string[]>(['Pecs', 'Épaules']);
  const [period, setPeriod] = useState<string>('3M');
  const [view, setView] = useState<string>('Sem.');
  const [tab, setTab] = useState<string>('Planning');
  const [reminders, setReminders] = useState(true);
  const [terms, setTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-8 px-screen pb-10 pt-2">
        <View className="flex-row items-center gap-3">
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel={s.back}
            onPress={() => router.back()}
          />
          <Heading size={34}>{fr.dev.componentsTitle}</Heading>
        </View>

        <Section title={fr.dev.sections.typography}>
          <StackedTitle
            lines={fr.app.tagline.map((text, index) => ({ text, accent: index === 2 }))}
          />
          <Overline>{s.overline}</Overline>
          <Heading size={48}>{s.heading}</Heading>
          <Text className="font-body text-16 text-muted">{s.body}</Text>
        </Section>

        <Section title={fr.dev.sections.buttons}>
          <Button label={s.primary} />
          <Button label={s.login} withArrow />
          <View className="flex-row gap-2.5">
            <Button label={s.secondary} variant="secondary" className="flex-1" />
            <Button label="Google" variant="secondary" className="flex-1" />
          </View>
          <Button label={s.outline} variant="outline" size="md" />
          <View className="flex-row justify-between">
            <Button label={s.ghostMuted} variant="ghost" tone="muted" />
            <Button label={s.ghost} variant="ghost" />
            <Button label={s.danger} variant="ghost" tone="danger" />
          </View>
          <Button label={s.disabled} disabled />
          <Button label={s.primary} loading />
        </Section>

        <Section title={fr.dev.sections.iconButtons}>
          <View className="flex-row gap-2.5">
            <IconButton icon={ChevronLeft} accessibilityLabel={s.back} />
            <IconButton icon={Bell} accessibilityLabel={s.notifications} />
            <IconButton icon={Plus} tone="volt" accessibilityLabel={s.add} />
            <IconButton icon={ChevronLeft} size="sm" accessibilityLabel={s.back} />
          </View>
        </Section>

        <Section title={fr.dev.sections.cards}>
          <Card variant="hero" watermark>
            <View className="flex-row items-center gap-2">
              <Text className="font-body-bold text-12 uppercase tracking-overline text-onVolt">
                {s.overline}
              </Text>
              <View className="h-5 justify-center rounded-tag bg-onVolt-tag px-2">
                <Text className="font-body-bold text-11 text-onVolt">{s.heroTag}</Text>
              </View>
            </View>
            <Heading size={48} className="mt-1 text-onVolt">
              {s.heading}
            </Heading>
            <Text className="mt-1 font-body-medium text-15 text-onVolt">{s.heroMeta}</Text>
            <View className="mt-4 flex-row gap-2">
              <Button label={s.start} variant="dark" className="flex-1" />
              <Button label={s.change} variant="darkOutline" />
            </View>
          </Card>
          <View className="flex-row gap-2">
            <StatTile value="12" caption={s.statSessions} />
            <StatTile value="3" caption={s.statRecords} />
            <StatTile value="5" unit={s.statStreakUnit} caption={s.statStreak} />
          </View>
          <View className="flex-row gap-2">
            <StatTile
              label={s.statRecordLabel}
              value="82,5 kg"
              caption={s.statRecordCaption}
              accent
            />
            <StatTile value="98 kg" caption="formule Epley" label="1RM estimé" />
          </View>
        </Section>

        <Section title={fr.dev.sections.steppers}>
          <View className="flex-row gap-2">
            <Stepper
              className="flex-1"
              value={weight}
              onChange={setWeight}
              step={2.5}
              unit={fr.units.kg}
            />
            <Stepper
              className="flex-1"
              value={reps}
              onChange={setReps}
              step={1}
              min={0}
              max={100}
              unit={fr.units.reps}
            />
          </View>
          <Text className="font-body-bold text-12 uppercase tracking-wide text-muted">
            {s.weightStep}
          </Text>
          <Stepper
            size="md"
            value={weightStep}
            onChange={setWeightStep}
            step={0.5}
            min={0.5}
            max={20}
            unit={fr.units.kg}
          />
        </Section>

        <Section title={fr.dev.sections.difficulty}>
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
          <View className="flex-row gap-2">
            {DIFFICULTIES.map((d) => (
              <DifficultyBadge key={d} difficulty={d} />
            ))}
            {DIFFICULTIES.map((d) => (
              <DifficultyBadge key={`sm-${d}`} difficulty={d} size="sm" />
            ))}
          </View>
        </Section>

        <Section title={fr.dev.sections.chips}>
          <ChipGroup options={toOptions(s.muscles)} value={muscle} onChange={setMuscle} />
          <ChipGroup
            multiple
            layout="scroll"
            options={toOptions(s.muscles)}
            value={muscles}
            onChange={setMuscles}
          />
        </Section>

        <Section title={fr.dev.sections.segmented}>
          <View className="flex-row items-center justify-between">
            <SegmentedControl options={toOptions(s.views)} value={view} onChange={setView} />
            <SegmentedControl
              size="sm"
              options={toOptions(s.periods)}
              value={period}
              onChange={setPeriod}
            />
          </View>
          <Tabs options={toOptions(s.tabs)} value={tab} onChange={setTab} />
        </Section>

        <Section title={fr.dev.sections.fields}>
          <TextField
            label={s.email}
            placeholder={s.emailPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextField label={s.password} secureTextEntry error={s.passwordError} />
          <TextField
            label={s.exerciseName}
            labelStyle="overline"
            defaultValue="Presse à cuisses 45°"
          />
          <TextField label={s.note} labelStyle="overline" multiline />
        </Section>

        <Section title={fr.dev.sections.toggles}>
          <View className="flex-row items-center justify-between rounded-card bg-surface px-4 py-3">
            <Text className="font-body-semibold text-15 text-text">{s.reminders}</Text>
            <Switch
              value={reminders}
              onValueChange={setReminders}
              accessibilityLabel={s.reminders}
            />
          </View>
          <Checkbox checked={terms} onChange={setTerms} accessibilityLabel={s.terms}>
            <Text className="font-body text-14 text-muted">{s.terms}</Text>
          </Checkbox>
        </Section>

        <Section title={fr.dev.sections.progress}>
          <ProgressSegments count={6} progress={2.6} />
          <ProgressSegments count={2} progress={1} />
        </Section>

        <Section title={fr.dev.sections.photos}>
          <PhotoSlot />
          <PhotoSlot variant="banner" />
          <PhotoSlot variant="thumb" />
        </Section>

        <Section title={fr.dev.sections.toast}>
          <Button
            label={s.toastButton}
            variant="secondary"
            onPress={() => toast.show(s.toastMessage)}
          />
        </Section>

        <Section title={fr.dev.sections.tabBar}>
          <View className="-mx-screen">
            <TabBar
              items={tabItems}
              activeKey={activeTab}
              onSelect={setActiveTab}
              onCenterPress={() => toast.show(fr.tabs.start)}
            />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
