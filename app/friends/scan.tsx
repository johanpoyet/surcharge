import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { useRef } from 'react';
import { Linking, Text, View } from 'react-native';

import { Button, FullScreen, IconButton } from '@/components/ui';
import { parseInviteCode } from '@/features/social/invite';
import { useScannedCode } from '@/features/social/scanned';
import { fr } from '@/i18n/fr';
import { goBack } from '@/lib/navigation';

const t = fr.friends.scan;

/** Scanner le QR code d'un ami (SPEC_V2 §7.2) : le code lu revient à « Ajouter un ami ». */
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  const onScanned = (data: string) => {
    const code = parseInviteCode(data);
    if (!code || done.current) return;
    done.current = true;
    useScannedCode.setState({ code });
    goBack('/friends/add');
  };

  return (
    <FullScreen>
      <View className="flex-row items-center justify-between px-screen pt-2">
        <Text className="font-body-bold text-18 text-text">{t.title}</Text>
        <IconButton icon={X} accessibilityLabel={t.close} onPress={() => goBack('/friends/add')} />
      </View>
      {permission?.granted ? (
        <View className="flex-1 gap-4 px-screen pb-6 pt-4">
          <View className="flex-1 overflow-hidden rounded-card">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => onScanned(data)}
            />
          </View>
          <Text className="text-center font-body text-15 text-muted">{t.hint}</Text>
        </View>
      ) : permission ? (
        <View className="flex-1 justify-center gap-4 px-screen">
          <Text className="text-center font-body text-16 text-text">{t.permission}</Text>
          {permission.canAskAgain ? (
            <Button label={t.allow} onPress={() => void requestPermission()} />
          ) : (
            <Button label={t.settings} onPress={() => void Linking.openSettings()} />
          )}
        </View>
      ) : null}
    </FullScreen>
  );
}
