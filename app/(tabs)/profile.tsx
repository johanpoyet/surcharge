import * as Application from 'expo-application';
import { format, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Heading, StatTile, Switch, useToast } from '@/components/ui';
import { config } from '@/config';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { signOut } from '@/features/auth/api';
import { authErrorMessage } from '@/features/auth/errors';
import { useExercises } from '@/features/exercises/hooks';
import { BodyWeightChartCard } from '@/features/profile/components/BodyWeightChartCard';
import { RecordsCard } from '@/features/profile/components/RecordsCard';
import { DisciplinesSheet } from '@/features/profile/components/DisciplinesSheet';
import { deleteAccount } from '@/features/profile/deleteAccount';
import { saveDisciplines } from '@/features/profile/disciplines';
import type { Discipline } from '@/db/schema';
import { exportCsv } from '@/features/profile/export';
import { useBodyWeights, useProfile } from '@/features/profile/hooks';
import { updateProfile } from '@/features/profile/repository';
import { globalStats, personalRecords } from '@/features/stats/series';
import { formatRest } from '@/features/templates/format';
import { useAllSets, useCompletedSessions } from '@/features/workout/hooks';
import { fr } from '@/i18n/fr';
import { formatThousands } from '@/lib/format';
import { useSyncStatus } from '@/sync';
import { usePendingChanges } from '@/sync/hooks';
import { colors } from '@/theme/tokens';

const t = fr.profile;
const REST_CHOICES = [60, 90, 120, 150, 180];

function SettingRow({
  label,
  value,
  onPress,
  right,
  last = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      className={`h-[54px] flex-row items-center justify-between px-4 active:opacity-80 ${last ? '' : 'border-b border-surface2'}`}
    >
      <Text className="font-body-semibold text-15 text-text">{label}</Text>
      {right ?? (
        <View className="flex-row items-center gap-1">
          <Text className="font-body-medium text-15 text-muted">{value}</Text>
          <ChevronRight size={16} color={colors.muted} strokeWidth={2} />
        </View>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const toast = useToast();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { profile, firstName } = useProfile();
  const unit = profile?.weightUnit ?? 'kg';
  const pending = usePendingChanges();
  const syncing = useSyncStatus((s) => s.syncing);
  const sessions = useCompletedSessions();
  const sets = useAllSets();
  const weights = useBodyWeights();
  const exercises = useExercises();
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingDisciplines, setEditingDisciplines] = useState(false);
  const disciplines: Discipline[] = profile?.disciplines ?? ['strength'];

  const stats = useMemo(() => globalStats(sessions, sets), [sessions, sets]);
  const records = useMemo(() => {
    const names = new Map(exercises.map((e) => [e.id, e.name]));
    return personalRecords(sets)
      .filter((r) => names.has(r.exerciseId))
      .map((r) => ({ ...r, exerciseName: names.get(r.exerciseId) ?? '' }));
  }, [exercises, sets]);

  const memberSince = session?.user.created_at
    ? format(parseISO(session.user.created_at), 'MMM yyyy', { locale: frLocale })
    : '';

  const update = (patch: Parameters<typeof updateProfile>[2]) => {
    if (profile) updateProfile(db, profile.id, patch);
  };

  const editName = () =>
    Alert.prompt(
      t.editNameTitle,
      undefined,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.save,
          onPress: (value?: string) => {
            const name = value?.trim();
            if (name) update({ firstName: name.slice(0, 40) });
          },
        },
      ],
      'plain-text',
      firstName,
    );

  const chooseUnit = () =>
    Alert.alert(t.settings.unitTitle, undefined, [
      { text: fr.units.kg, onPress: () => update({ weightUnit: 'kg' }) },
      { text: fr.units.lb, onPress: () => update({ weightUnit: 'lb' }) },
      { text: t.cancel, style: 'cancel' },
    ]);

  const chooseRest = () =>
    Alert.alert(t.settings.restTitle, undefined, [
      ...REST_CHOICES.map((seconds) => ({
        text: formatRest(seconds),
        onPress: () => update({ defaultRestSeconds: seconds }),
      })),
      { text: t.cancel, style: 'cancel' as const },
    ]);

  const onExport = async () => {
    try {
      const result = await exportCsv(db, userId);
      if (result === 'empty') toast.show(t.csv.empty);
      if (result === 'unavailable') toast.show(t.csv.unavailable);
    } catch {
      toast.show(t.csv.failed);
    }
  };

  const d = t.deleteAccount;
  const runDelete = async () => {
    setDeleting(true);
    toast.show(d.deleting);
    try {
      await deleteAccount(db);
    } catch {
      toast.show(d.failed);
      setDeleting(false);
    }
  };
  // Double confirmation (SPEC 11).
  const confirmDelete = () =>
    Alert.alert(d.title, d.message, [
      { text: d.cancel, style: 'cancel' },
      {
        text: d.confirm,
        style: 'destructive',
        onPress: () =>
          Alert.alert(d.finalTitle, d.finalMessage, [
            { text: d.cancel, style: 'cancel' },
            { text: d.finalConfirm, style: 'destructive', onPress: () => void runDelete() },
          ]),
      },
    ]);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      toast.show(authErrorMessage(error));
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-4 px-screen pb-8 pt-3">
        <Heading size={34}>{t.title}</Heading>

        <Card className="flex-row items-center gap-3.5">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-card bg-volt">
            <Text className="font-display text-40 text-onVolt">
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="font-body-bold text-22 text-text">
              {firstName}
            </Text>
            <Text className="font-body text-14 text-muted">{t.memberSince(memberSince)}</Text>
          </View>
          <Button label={t.edit} variant="secondary" size="sm" onPress={editName} />
        </Card>

        <View className="flex-row gap-2">
          <StatTile value={String(stats.sessions)} caption={t.stats.sessions} />
          <StatTile value={String(stats.hours)} unit={t.stats.hoursUnit} caption={t.stats.hours} />
          <StatTile
            value={formatThousands(stats.tonnes)}
            unit={t.stats.tonnesUnit}
            caption={t.stats.tonnes}
          />
        </View>

        <BodyWeightChartCard weights={weights} unit={unit} />
        <RecordsCard records={records} unit={unit} />

        <Card className="overflow-hidden p-0">
          <SettingRow
            label={t.disciplines}
            value={disciplines.map((d) => fr.exercises.tracking.disciplines[d]).join(', ')}
            onPress={() => setEditingDisciplines(true)}
          />
          <SettingRow label={t.settings.unit} value={fr.units[unit]} onPress={chooseUnit} />
          <SettingRow
            label={t.settings.rest}
            value={formatRest(profile?.defaultRestSeconds ?? 120)}
            onPress={chooseRest}
          />
          <SettingRow
            label={t.settings.reminders}
            right={
              <Switch
                value={profile?.remindersEnabled ?? true}
                onValueChange={(remindersEnabled) => update({ remindersEnabled })}
                accessibilityLabel={t.settings.reminders}
              />
            }
          />
          <SettingRow
            label={t.settings.export}
            value={t.settings.exportValue}
            onPress={() => void onExport()}
          />
          <Button
            label={t.signOut}
            variant="ghost"
            tone="danger"
            loading={signingOut}
            onPress={onSignOut}
            className="h-[54px] justify-start px-4"
          />
        </Card>

        <Card className="overflow-hidden p-0">
          <SettingRow
            label={t.legal.terms}
            value=""
            onPress={() => void Linking.openURL(config.termsUrl)}
          />
          <SettingRow
            label={t.legal.privacy}
            value=""
            onPress={() => void Linking.openURL(config.privacyUrl)}
          />
          <Button
            label={d.action}
            variant="ghost"
            tone="danger"
            loading={deleting}
            onPress={confirmDelete}
            className="h-[54px] justify-start px-4"
          />
        </Card>

        <Text className="text-center font-body text-13 text-muted">
          {syncing ? t.syncing : pending === 0 ? t.synced : t.pending(pending)}
        </Text>
        <Text className="-mt-2 text-center font-body text-12 text-faint">
          {t.version(Application.nativeApplicationVersion ?? '', Application.nativeBuildVersion)}
        </Text>

        {__DEV__ ? (
          <Button
            label={t.dev}
            variant="secondary"
            onPress={() => router.push('/_dev/components')}
          />
        ) : null}
      </ScrollView>
      <DisciplinesSheet
        visible={editingDisciplines}
        initial={disciplines}
        onSave={(chosen) => {
          setEditingDisciplines(false);
          if (!profile) return;
          saveDisciplines(db, profile.id, chosen);
          toast.show(fr.disciplines.saved);
        }}
        onClose={() => setEditingDisciplines(false)}
      />
    </SafeAreaView>
  );
}
