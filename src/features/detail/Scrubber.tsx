import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { palette, radius } from '@/design-system';
import { IS_TV } from '@/platform/tv';

interface ScrubberProps {
  /** Current playback position, 0..1. */
  progress: number;
  duration: number;
  onScrubStart?: () => void;
  /** Commit a seek (seconds) on release or tap. */
  onScrub?: (time: number) => void;
}

const THUMB = 16;

/**
 * The scrubbing affordance. On touch it's a draggable/ tappable bar driven by
 * Reanimated shared values so the thumb tracks the finger at 60fps and only
 * commits a seek on release (snappy, no mid-drag thrash). On TV there is no
 * pointer, so it renders as a read-only progress bar and seeking is delegated
 * to the focusable skip/chapter controls — same visual, right input model.
 */
export function Scrubber({ progress, duration, onScrubStart, onScrub }: ScrubberProps) {
  const trackW = useSharedValue(0);
  const progressSV = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragging = useSharedValue(0);

  useEffect(() => {
    progressSV.value = progress;
  }, [progress, progressSV]);

  const fillStyle = useAnimatedStyle(() => {
    const r = dragging.value ? (trackW.value > 0 ? dragX.value / trackW.value : 0) : progressSV.value;
    return { width: Math.max(0, Math.min(1, r)) * trackW.value };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const r = dragging.value ? (trackW.value > 0 ? dragX.value / trackW.value : 0) : progressSV.value;
    return { transform: [{ translateX: Math.max(0, Math.min(1, r)) * trackW.value - THUMB / 2 }] };
  });

  const commit = (ratio: number) => {
    if (onScrub && duration > 0) onScrub(Math.max(0, Math.min(1, ratio)) * duration);
  };

  const pan = Gesture.Pan()
    .onBegin((e) => {
      dragging.value = 1;
      dragX.value = e.x;
      if (onScrubStart) runOnJS(onScrubStart)();
    })
    .onUpdate((e) => {
      dragX.value = Math.max(0, Math.min(trackW.value, e.x));
    })
    .onEnd(() => {
      const ratio = trackW.value > 0 ? dragX.value / trackW.value : 0;
      runOnJS(commit)(ratio);
    })
    // onFinalize always fires (END / FAILED / CANCELLED), so the drag-display
    // branch is cleared even when a tap wins the Race and cancels the pan
    // before it ever becomes ACTIVE (otherwise the fill would freeze).
    .onFinalize(() => {
      dragging.value = 0;
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const ratio = trackW.value > 0 ? e.x / trackW.value : 0;
    runOnJS(commit)(ratio);
  });

  const bar = (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        trackW.value = e.nativeEvent.layout.width;
      }}
    >
      <View style={styles.track} />
      <Animated.View style={[styles.fill, fillStyle]} />
      {!IS_TV ? <Animated.View style={[styles.thumb, thumbStyle]} /> : null}
    </View>
  );

  if (IS_TV) return bar;
  return <GestureDetector gesture={Gesture.Race(pan, tap)}>{bar}</GestureDetector>;
}

const styles = StyleSheet.create({
  wrap: { height: THUMB + 12, justifyContent: 'center' },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.track,
  },
  fill: {
    position: 'absolute',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: palette.text,
    borderWidth: 2,
    borderColor: palette.accent,
  },
});
