import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PhotoMemory } from '@/core';
import { resolveAsset } from '@/core/data/assetMap';
import { palette } from '@/theme';
import { IS_TV } from '@/core/tv';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;

/** Photo detail. Split into TV/handheld components so the zoom hooks are only
 * ever mounted where they apply (no conditional-hook hazard). */
export function PhotoViewer({ memory }: { memory: PhotoMemory }) {
  const source = resolveAsset(memory.assetURL);
  return IS_TV ? <StaticPhoto source={source} /> : <ZoomablePhoto source={source} />;
}

function StaticPhoto({ source }: { source: number }) {
  // No pointer on TV — show the photo fitted, full-bleed.
  return (
    <View style={styles.container}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" transition={200} />
    </View>
  );
}

function ZoomablePhoto({ source }: { source: number }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const resetPan = () => {
    'worklet';
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    startX.value = 0;
    startY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(MAX_SCALE, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) resetPan();
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = startX.value + e.translationX;
        translateY.value = startY.value + e.translationY;
      }
    })
    .onEnd(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        resetPan();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.fill, animatedStyle]}>
          <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" transition={200} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.playerBg },
  fill: { flex: 1 },
});
