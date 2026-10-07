import { useState } from 'react';
import { Text } from 'react-native';

import { Button, Sheet } from '@/components/ui';
import type { Discipline } from '@/db/schema';
import { fr } from '@/i18n/fr';
import { DisciplinesPicker } from './DisciplinesPicker';

const t = fr.disciplines;

type DisciplinesSheetProps = {
  visible: boolean;
  initial: readonly Discipline[];
  onSave: (disciplines: Discipline[]) => void;
  onClose: () => void;
};

/** Contenu de la feuille : monté à chaque ouverture, il part des disciplines actuelles. */
function DisciplinesForm({ initial, onSave, onClose }: Omit<DisciplinesSheetProps, 'visible'>) {
  const [value, setValue] = useState<Discipline[]>([...initial]);
  return (
    <>
      <Text className="mt-1.5 font-display text-28 uppercase text-text">{t.title}</Text>
      <Text className="font-body text-14 text-muted">{t.hint}</Text>
      <DisciplinesPicker value={value} onChange={setValue} />
      <Button label={t.validate} className="mt-2" onPress={() => onSave(value)} />
      <Button label={t.later} variant="ghost" tone="muted" size="sm" onPress={onClose} />
    </>
  );
}

/** Feuille « Tes disciplines » (SPEC_V2 §5.5) : comptes existants et réglage du profil. */
export function DisciplinesSheet({ visible, initial, onSave, onClose }: DisciplinesSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} closeLabel={t.later}>
      {visible ? <DisciplinesForm initial={initial} onSave={onSave} onClose={onClose} /> : null}
    </Sheet>
  );
}
