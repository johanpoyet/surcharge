import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Libellé lu par VoiceOver pour le fond qui ferme la feuille. */
  closeLabel: string;
  children: ReactNode;
};

/** Feuille du bas (maquette ajouter-bloc) : fond assombri, poignée, coins arrondis en haut. */
export function Sheet({ visible, onClose, closeLabel, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-scrim">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          className="flex-1"
        />
        <View
          className="gap-2.5 rounded-t-[24px] bg-surface px-screen pt-2.5"
          style={{ paddingBottom: Math.max(insets.bottom, 20) + 14 }}
        >
          <View className="h-[5px] w-10 self-center rounded-full bg-lineStrong" />
          {children}
        </View>
      </View>
    </Modal>
  );
}
