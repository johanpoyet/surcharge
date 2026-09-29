import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const GAP = 8;
// Appui court sur la poignée avant de soulever la carte (évite les conflits avec le défilement).
const LIFT_DELAY_MS = 120;

/** Index d'arrivée d'une carte déplacée de `dy` px (hauteurs mesurées des cartes). */
export function targetIndex(active: number, dy: number, heights: readonly number[]): number {
  'worklet';
  let target = active;
  let travelled = 0;
  if (dy > 0) {
    for (let i = active + 1; i < heights.length; i++) {
      const size = (heights[i] ?? 0) + GAP;
      if (dy > travelled + size / 2) target = i;
      else break;
      travelled += size;
    }
  } else {
    for (let i = active - 1; i >= 0; i--) {
      const size = (heights[i] ?? 0) + GAP;
      if (-dy > travelled + size / 2) target = i;
      else break;
      travelled += size;
    }
  }
  return target;
}

type RowProps = {
  index: number;
  active: SharedValue<number>;
  dragY: SharedValue<number>;
  heights: SharedValue<number[]>;
  onLayout: (event: LayoutChangeEvent) => void;
  onLift: () => void;
  onDrop: (from: number, to: number) => void;
  children: (handleGesture: GestureType) => ReactNode;
};

function Row({ index, active, dragY, heights, onLayout, onLift, onDrop, children }: RowProps) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LIFT_DELAY_MS)
        .onStart(() => {
          active.set(index);
          dragY.set(0);
          scheduleOnRN(onLift);
        })
        .onUpdate((event) => {
          dragY.set(event.translationY);
        })
        .onFinalize(() => {
          if (active.get() !== index) return;
          scheduleOnRN(onDrop, index, targetIndex(index, dragY.get(), heights.get()));
        }),
    [active, dragY, heights, index, onDrop, onLift],
  );

  const style = useAnimatedStyle(() => {
    const from = active.get();
    if (from < 0) return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0 };
    if (from === index) {
      return { transform: [{ translateY: dragY.get() }, { scale: 1.02 }], zIndex: 10 };
    }
    const to = targetIndex(from, dragY.get(), heights.get());
    const size = (heights.get()[from] ?? 0) + GAP;
    let shift = 0;
    if (from < index && index <= to) shift = -size;
    if (to <= index && index < from) shift = size;
    return {
      transform: [{ translateY: withTiming(shift, { duration: 120 }) }, { scale: 1 }],
      zIndex: 0,
    };
  });

  return (
    <Animated.View style={style} onLayout={onLayout}>
      {children(gesture)}
    </Animated.View>
  );
}

type ReorderableListProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  /** `handleGesture` va sur la poignée (`<GestureDetector gesture={handleGesture}>`). */
  renderItem: (item: T, index: number, handleGesture: GestureType) => ReactNode;
  onMove: (from: number, to: number) => void;
  /** Pour bloquer le défilement du parent pendant le glisser. */
  onDragChange?: (dragging: boolean) => void;
};

/** Liste verticale réordonnable par glisser-déposer via une poignée (séance type). */
export function ReorderableList<T>({
  items,
  keyOf,
  renderItem,
  onMove,
  onDragChange,
}: ReorderableListProps<T>) {
  const active = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const heights = useSharedValue<number[]>([]);
  const measured = useRef<number[]>([]);
  const count = items.length;

  const setHeight = useCallback(
    (index: number, height: number) => {
      measured.current[index] = height;
      heights.set(measured.current.slice(0, count));
    },
    [heights, count],
  );

  const onLift = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDragChange?.(true);
  }, [onDragChange]);

  const onDrop = useCallback(
    (from: number, to: number) => {
      if (from !== to) {
        onMove(from, to);
        void Haptics.selectionAsync();
      }
      // Remise à zéro après le nouvel ordre, pour éviter un saut visuel.
      requestAnimationFrame(() => {
        active.set(-1);
        dragY.set(0);
      });
      onDragChange?.(false);
    },
    [active, dragY, onDragChange, onMove],
  );

  return (
    <View style={{ gap: GAP }}>
      {items.map((item, index) => (
        <Row
          key={keyOf(item)}
          index={index}
          active={active}
          dragY={dragY}
          heights={heights}
          onLayout={(event) => setHeight(index, event.nativeEvent.layout.height)}
          onLift={onLift}
          onDrop={onDrop}
        >
          {(gesture) => renderItem(item, index, gesture)}
        </Row>
      ))}
    </View>
  );
}
