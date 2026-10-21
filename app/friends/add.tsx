import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import {
  Button,
  Heading,
  IconButton,
  KeyboardScreen,
  SearchField,
  Switch,
  useToast,
} from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile } from '@/features/profile/hooks';
import { updateProfile } from '@/features/profile/repository';
import { findUser, sendFriendRequest, SocialApiError, type FoundUser } from '@/features/social/api';
import { Avatar } from '@/features/social/components/Avatar';
import { useMyIdentity } from '@/features/social/hooks';
import { inviteUrl, parseInviteCode } from '@/features/social/invite';
import { useScannedCode } from '@/features/social/scanned';
import { fr } from '@/i18n/fr';
import { colors } from '@/theme/tokens';
import { requestSync } from '@/sync';

const t = fr.friends.addScreen;

type Search =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'found'; user: FoundUser }
  | { status: 'none'; message: string };

/** Ajouter un ami (SPEC_V2 §7.2, maquette ajouter-ami) : QR, code, recherche, confidentialité. */
export default function AddFriendScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const userId = useAuth().session?.user.id ?? '';
  const { profile } = useProfile();
  const { friendCode } = useMyIdentity();
  const toast = useToast();
  const [query, setQuery] = useState(params.code ?? '');
  const [search, setSearch] = useState<Search>({ status: 'idle' });
  const [sending, setSending] = useState(false);

  const run = async (value: string) => {
    const text = parseInviteCode(value) ?? value.trim();
    if (!text) return;
    setSearch({ status: 'searching' });
    try {
      const user = await findUser(text);
      setSearch(user ? { status: 'found', user } : { status: 'none', message: t.notFound });
    } catch (e) {
      const limited = e instanceof SocialApiError && e.code === 'rate_limited';
      setSearch({ status: 'none', message: limited ? t.rateLimited : t.error });
    }
  };

  // Ouvert depuis un lien d'invitation : recherche directe (le champ est déjà prérempli).
  const linkCode = params.code;
  useEffect(() => {
    // Recherche lancée juste après le rendu (pas de mise à jour d'état pendant l'effet).
    if (linkCode) void Promise.resolve(linkCode).then(run);
  }, [linkCode]);

  // Retour du scanner : le code lu est cherché aussitôt.
  useEffect(
    () =>
      useScannedCode.subscribe(({ code }) => {
        if (!code) return;
        useScannedCode.setState({ code: null });
        setQuery(code);
        void run(code);
      }),
    [],
  );

  const send = async (user: FoundUser) => {
    setSending(true);
    try {
      const result = await sendFriendRequest(user.id);
      toast.show(
        result === 'accepted'
          ? t.accepted
          : result === 'already_friends'
            ? t.alreadyFriends
            : result === 'already_sent'
              ? t.alreadySent
              : t.sent,
      );
      setSearch({ status: 'idle' });
      setQuery('');
    } catch (e) {
      toast.show(
        e instanceof SocialApiError && e.code === 'blocked_by_you' ? t.blockedByYou : t.error,
      );
    } finally {
      setSending(false);
    }
  };

  const shareLink = () => {
    if (!friendCode) return;
    void Share.share({ message: t.shareMessage(friendCode, inviteUrl(friendCode)) }).catch(
      () => undefined,
    );
  };

  const setShare = (patch: {
    shareSessions?: boolean;
    shareRecords?: boolean;
    shareExactWeights?: boolean;
  }) => {
    if (!userId) return;
    updateProfile(db, userId, patch);
    requestSync();
  };

  return (
    <KeyboardScreen contentClassName="gap-4 px-screen">
      <View className="flex-row items-center gap-3">
        <IconButton icon={ChevronLeft} accessibilityLabel={t.back} onPress={() => router.back()} />
        <Heading size={34}>{t.title}</Heading>
      </View>

      <View className="items-center gap-3 rounded-hero bg-volt p-5">
        <Text className="font-body-bold text-12 uppercase tracking-overline text-onVolt">
          {t.yourCode}
        </Text>
        <View className="rounded-card bg-onVolt p-4">
          {friendCode ? (
            <QRCode
              value={inviteUrl(friendCode)}
              size={140}
              color={colors.volt}
              backgroundColor={colors.onVolt}
            />
          ) : (
            <View className="h-[140px] w-[140px]" />
          )}
        </View>
        <Text className="px-2 font-display text-44 text-onVolt">{friendCode ?? '—'}</Text>
        {friendCode ? null : <Text className="font-body text-13 text-onVolt">{t.codeMissing}</Text>}
        <View className="flex-row gap-2 self-stretch">
          {/* Maquette : texte volt sur fond noir, même taille que « Scanner un code ». */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !friendCode }}
            disabled={!friendCode}
            onPress={shareLink}
            className="h-[50px] flex-1 items-center justify-center rounded-input bg-onVolt active:opacity-80"
          >
            <Text className="font-body-bold text-15 text-volt">{t.share}</Text>
          </Pressable>
          <Button
            label={t.scan}
            variant="darkOutline"
            className="flex-1"
            onPress={() => router.push('/friends/scan')}
          />
        </View>
      </View>

      <SearchField
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          if (search.status !== 'searching') setSearch({ status: 'idle' });
        }}
        onSubmit={() => void run(query)}
        autoCapitalize="none"
        placeholder={t.search}
        clearLabel={fr.common.clear}
      />
      {search.status === 'searching' ? (
        <Text className="font-body text-14 text-muted">…</Text>
      ) : search.status === 'none' ? (
        <Text className="font-body text-14 text-muted">{search.message}</Text>
      ) : search.status === 'found' ? (
        <View className="gap-3 rounded-card bg-surface p-4">
          <View className="flex-row items-center gap-3">
            <Avatar name={search.user.firstName} size="md" />
            <View className="flex-1">
              <Text className="font-body-bold text-17 text-text">{search.user.firstName}</Text>
              {search.user.username ? (
                <Text className="font-body text-14 text-muted">@{search.user.username}</Text>
              ) : null}
            </View>
          </View>
          <Button label={t.send} loading={sending} onPress={() => void send(search.user)} />
        </View>
      ) : null}

      <View className="gap-1 rounded-card bg-surface p-4">
        <Text className="font-body-bold text-18 text-text">{t.privacyTitle}</Text>
        <Text className="mb-2 font-body text-14 text-muted">{t.privacyHint}</Text>
        {(
          [
            ['shareSessions', t.shareSessions],
            ['shareRecords', t.shareRecords],
            ['shareExactWeights', t.shareExactWeights],
          ] as const
        ).map(([key, label]) => (
          <View
            key={key}
            className="min-h-[54px] flex-row items-center justify-between border-b border-line"
          >
            <Text className="flex-1 font-body-semibold text-16 text-text">{label}</Text>
            <Switch
              value={profile?.[key] ?? key !== 'shareExactWeights'}
              onValueChange={(value) => setShare({ [key]: value })}
              accessibilityLabel={label}
            />
          </View>
        ))}
        <View className="min-h-[54px] flex-row items-center justify-between">
          <Text className="font-body-semibold text-16 text-muted">{t.bodyWeight}</Text>
          <Text className="font-body-semibold text-14 text-muted">{t.never}</Text>
        </View>
      </View>
    </KeyboardScreen>
  );
}
