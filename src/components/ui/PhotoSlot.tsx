import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

type PhotoSlotProps = {
  /** Photo locale ou distante ; sinon, placeholder pointillé. */
  uri?: string | null;
  /**
   * `hero` : création d'exercice (appareil photo / galerie) ;
   * `banner` : en-tête du détail exercice ;
   * `thumb` : vignette 64×64 (séance en cours, listes).
   */
  variant?: 'hero' | 'banner' | 'thumb';
  onCamera?: () => void;
  onGallery?: () => void;
  onPress?: () => void;
  className?: string;
};

function SmallAction({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={4}
      className="h-9 justify-center rounded-button bg-surface px-3.5 active:opacity-80"
    >
      <Text className="font-body-semibold text-13 text-text">{label}</Text>
    </Pressable>
  );
}

export function PhotoSlot({
  uri,
  variant = 'hero',
  onCamera,
  onGallery,
  onPress,
  className,
}: PhotoSlotProps) {
  if (variant === 'thumb') {
    return (
      <Pressable
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={fr.photo.placeholder}
        onPress={onPress}
        disabled={!onPress}
        className={cn(
          'h-16 w-16 items-center justify-center gap-0.5 overflow-hidden rounded-cta',
          uri ? 'bg-surface2' : 'border border-dashed border-lineStrong bg-surface2',
          className,
        )}
      >
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        ) : (
          <>
            <Camera size={18} color={colors.muted} strokeWidth={2} />
            <Text className="font-body text-11 text-muted">{fr.photo.thumb}</Text>
          </>
        )}
      </Pressable>
    );
  }

  if (uri) {
    return (
      <View
        className={cn(
          'overflow-hidden rounded-hero bg-surface',
          variant === 'hero' ? 'h-[180px]' : 'h-32',
          className,
        )}
      >
        <Image
          source={{ uri }}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel={fr.photo.placeholder}
        />
        <View className="absolute bottom-3 right-3 flex-row gap-2">
          {variant === 'hero' ? (
            <>
              <SmallAction label={fr.photo.camera} onPress={onCamera} />
              <SmallAction label={fr.photo.gallery} onPress={onGallery} />
            </>
          ) : (
            <SmallAction label={fr.photo.change} onPress={onPress} />
          )}
        </View>
      </View>
    );
  }

  if (variant === 'banner') {
    return (
      <View
        className={cn(
          'h-32 items-center justify-center gap-2 rounded-hero border-[1.5px] border-dashed border-lineStrong bg-surface',
          className,
        )}
      >
        <Camera size={24} color={colors.muted} strokeWidth={2} />
        <Text className="font-body text-14 text-muted">{fr.photo.placeholder}</Text>
        <View className="absolute bottom-3 right-3">
          <SmallAction label={fr.photo.change} onPress={onPress} />
        </View>
      </View>
    );
  }

  return (
    <View
      className={cn(
        'h-[180px] items-center justify-center gap-2 rounded-hero border-[1.5px] border-dashed border-volt bg-volt-subtle p-4',
        className,
      )}
    >
      <View className="h-[52px] w-[52px] items-center justify-center rounded-cta bg-volt">
        <Camera size={24} color={colors.onVolt} strokeWidth={2} />
      </View>
      <Text className="font-body-bold text-16 text-text">{fr.photo.add}</Text>
      <Text className="max-w-[260px] text-center font-body text-13 text-muted">
        {fr.photo.hint}
      </Text>
      <View className="flex-row gap-2">
        <SmallAction label={fr.photo.camera} onPress={onCamera} />
        <SmallAction label={fr.photo.gallery} onPress={onGallery} />
      </View>
    </View>
  );
}
