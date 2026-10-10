import { Text, View } from 'react-native';

import { Button, Card, Heading } from '@/components/ui';
import { KindIcons } from '@/features/templates/components/KindIcons';
import type { SessionKind } from '@/features/templates/kinds';
import { fr } from '@/i18n/fr';
import { colors } from '@/theme/tokens';

const t = fr.home.day;

export type DayCardState =
  | { kind: 'planned'; name: string; meta: string; changed: boolean; kinds: SessionKind[] }
  | { kind: 'rest' }
  | { kind: 'active'; name: string }
  | { kind: 'done'; name: string }
  | { kind: 'empty' };

type DayCardProps = {
  state: DayCardState;
  onStart: () => void;
  onChange: () => void;
  onResume: () => void;
  onRecap: () => void;
  onCreate: () => void;
};

function Tag({ label }: { label: string }) {
  return (
    <View className="h-5 justify-center rounded-tag bg-onVolt-tag px-2">
      <Text className="font-body-bold text-11 text-onVolt">{label}</Text>
    </View>
  );
}

/** Carte volt « Séance du jour » (SPEC 8.1). */
export function DayCard({ state, onStart, onChange, onResume, onRecap, onCreate }: DayCardProps) {
  const overline = (
    <Text className="font-body-bold text-12 uppercase tracking-overline text-onVolt">
      {state.kind === 'active' ? t.inProgress : t.overline}
    </Text>
  );

  return (
    <Card variant="hero" watermark>
      {state.kind === 'planned' ? (
        <>
          <View className="flex-row items-center gap-2">
            {overline}
            <Tag label={state.changed ? t.changed : t.planned} />
            <KindIcons kinds={state.kinds} size={18} color={colors.onVolt} className="ml-auto" />
          </View>
          <Heading size={48} tone="onVolt" className="mt-1">
            {state.name}
          </Heading>
          <Text className="mt-1 font-body-medium text-15 text-onVolt">{state.meta}</Text>
          <View className="mt-4 flex-row gap-2">
            <Button label={t.start} variant="dark" className="flex-1" onPress={onStart} />
            <Button label={t.change} variant="darkOutline" onPress={onChange} />
          </View>
        </>
      ) : null}

      {state.kind === 'rest' ? (
        <>
          {overline}
          <Heading size={48} tone="onVolt" className="mt-1">
            {t.rest}
          </Heading>
          <Text className="mt-1 font-body-medium text-15 text-onVolt">{t.restHint}</Text>
          <Button label={t.anyway} variant="dark" className="mt-4" onPress={onChange} />
        </>
      ) : null}

      {state.kind === 'active' ? (
        <>
          {overline}
          <Heading size={48} tone="onVolt" className="mt-1">
            {state.name}
          </Heading>
          <Button label={t.resume} variant="dark" className="mt-4" onPress={onResume} />
        </>
      ) : null}

      {state.kind === 'done' ? (
        <>
          {overline}
          <Heading size={48} tone="onVolt" className="mt-1">
            {t.done}
          </Heading>
          <Text className="mt-1 font-body-medium text-15 text-onVolt">{state.name}</Text>
          <Button label={t.doneLink} variant="darkOutline" className="mt-4" onPress={onRecap} />
        </>
      ) : null}

      {state.kind === 'empty' ? (
        <>
          {overline}
          <Heading size={40} tone="onVolt" className="mt-1">
            {t.empty}
          </Heading>
          <Text className="mt-1 font-body-medium text-15 text-onVolt">{t.emptyHint}</Text>
          <Button label={t.create} variant="dark" className="mt-4" onPress={onCreate} />
        </>
      ) : null}
    </Card>
  );
}
