import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { Button, Sheet } from '@/components/ui';
import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';
import { setUsername, SocialApiError } from '../api';
import { normalizeUsername, usernameProblem } from '../bannedWords';

const t = fr.friends.username;

type UsernameSheetProps = {
  visible: boolean;
  onDone: (username: string | null) => void;
};

/** Choix du pseudo au premier passage dans l'onglet Amis (contrôlé ici puis par le serveur). */
export function UsernameSheet({ visible, onDone }: UsernameSheetProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const problem = usernameProblem(value);
    if (problem) return setError(t.errors[problem]);
    setSaving(true);
    try {
      onDone(await setUsername(normalizeUsername(value)));
    } catch (e) {
      const code = e instanceof SocialApiError ? e.code : 'network';
      setError(
        code === 'username_taken'
          ? t.errors.taken
          : code === 'banned_username'
            ? t.errors.banned
            : code === 'invalid_username'
              ? t.errors.format
              : t.errors.network,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => onDone(null)} closeLabel={t.later}>
      <Text className="font-body-bold text-20 text-text">{t.title}</Text>
      <Text className="font-body text-14 text-muted">{t.hint}</Text>
      <TextInput
        value={value}
        onChangeText={(next) => {
          setValue(next);
          setError(null);
        }}
        onSubmitEditing={save}
        placeholder={t.placeholder}
        placeholderTextColor={colors.faint}
        accessibilityLabel={t.title}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardAppearance="dark"
        selectionColor={colors.volt}
        returnKeyType="done"
        maxLength={21}
        className={cn(
          'h-14 rounded-input bg-bg px-4 font-body-bold text-18 text-text',
          error ? 'border-[1.5px] border-danger' : 'border border-line',
        )}
      />
      {error ? <Text className="font-body text-13 text-danger">{error}</Text> : null}
      <Button label={t.save} onPress={save} loading={saving} />
      <Button label={t.later} variant="ghost" tone="muted" size="sm" onPress={() => onDone(null)} />
    </Sheet>
  );
}
