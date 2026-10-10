import { Dumbbell, Flame, Footprints, Timer, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { fr } from '@/i18n/fr';
import { cn } from '@/lib/cn';
import type { SessionKind } from '../kinds';

const ICONS: Record<SessionKind, LucideIcon> = {
  strength: Dumbbell,
  running: Footprints,
  cross_training: Flame,
  hyrox: Timer,
};

type KindIconsProps = {
  kinds: readonly SessionKind[];
  size: number;
  color: string;
  className?: string;
};

/** Pictogrammes du type de séance : haltère, course, flamme (cross-training), chrono (Hyrox). */
export function KindIcons({ kinds, size, color, className }: KindIconsProps) {
  if (kinds.length === 0) return null;
  return (
    <View
      accessible
      accessibilityLabel={kinds.map((kind) => fr.kinds[kind]).join(', ')}
      className={cn('flex-row items-center gap-0.5', className)}
    >
      {kinds.map((kind) => {
        const Icon = ICONS[kind];
        return <Icon key={kind} size={size} color={color} strokeWidth={2.25} />;
      })}
    </View>
  );
}
