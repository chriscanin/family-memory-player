import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FocusablePressable } from '../ui';
import { palette, radius } from '@/theme';
import { IS_TV } from '@/core/tv';

interface ScrubberProps {
  /** Current playback position, 0..1. */
  progress: number;
  duration: number;
  onScrubStart?: () => void;
  /** Commit a seek (seconds) on release or tap (touch only). */
  onScrub?: (time: number) => void;
  /** Live seek (seconds) emitted continuously *during* a drag so the frame
   * updates as you scrub (touch only; the parent throttles the actual seek). */
  onScrubMove?: (time: number) => void;
  /** TV only: report focus so the parent can route d-pad Left/Right to seeking. */
  onFocusChange?: (focused: boolean) => void;
  /** TV focus-restore plumbing (records/reclaims focus across chrome reveals). */
  onFocus?: () => void;
  hasTVPreferredFocus?: boolean;
}

const THUMB = 16;

/**
 * The scrubbing affordance.
 *
 * - **Touch:** a draggable / tappable bar driven by Reanimated shared values so
 *   the thumb tracks the finger at 60fps and commits a seek on release.
 * - **TV:** a *focusable* bar. There's no pointer, so when it holds focus the
 *   parent (`VideoPlayer`) routes d-pad **Left/Right** to continuous seeking
 *   (hold to fast-forward / rewind); the thumb appears while focused and the
 *   fill tracks the live position. Being full-width it also bridges focus
 *   between the centered transport below and the left-aligned chapters above.
 */
export function Scrubber({
  progress,
  duration,
  onScrubStart,
  onScrub,
  onScrubMove,
  onFocusChange,
  onFocus,
  hasTVPreferredFocus,
}: ScrubberProps) {
  const trackW = useSharedValue(0);
  const progressSV = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragging = useSharedValue(0);

  // Animate the fill/thumb to the latest position instead of snapping it there.
  // A *small* delta is an ordinary playback tick (timeUpdate fires every 0.25s) —
  // glide linearly so the bar moves continuously between ticks instead of
  // stepping. A *large* delta is a seek (chapter select, tap-to-seek, or a TV
  // d-pad jump) — ease it so the playhead visibly slides to the new spot rather
  // than teleporting. Never animate while a finger is dragging: the gesture owns
  // the thumb then, and withTiming would fight it.
  useEffect(() => {
    if (dragging.value) {
      progressSV.value = progress;
      return;
    }
    const delta = Math.abs(progress - progressSV.value);
    progressSV.value =
      delta > 0.02
        ? withTiming(progress, { duration: 320, easing: Easing.out(Easing.cubic) })
        : withTiming(progress, { duration: 260, easing: Easing.linear });
  }, [progress, progressSV, dragging]);

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
  const move = (ratio: number) => {
    if (onScrubMove && duration > 0) onScrubMove(Math.max(0, Math.min(1, ratio)) * duration);
  };

  const pan = Gesture.Pan()
    .onBegin((e) => {
      dragging.value = 1;
      dragX.value = e.x;
      if (onScrubStart) runOnJS(onScrubStart)();
    })
    .onUpdate((e) => {
      dragX.value = Math.max(0, Math.min(trackW.value, e.x));
      // Live preview: seek the (paused) video to the dragged position. The
      // parent throttles the actual seek, so emitting every frame is fine.
      if (onScrubMove) runOnJS(move)(trackW.value > 0 ? dragX.value / trackW.value : 0);
    })
    .onEnd(() => {
      const ratio = trackW.value > 0 ? dragX.value / trackW.value : 0;
      runOnJS(commit)(ratio);
    })
    .onFinalize(() => {
      dragging.value = 0;
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const ratio = trackW.value > 0 ? e.x / trackW.value : 0;
    runOnJS(commit)(ratio);
  });

  const bar = (showThumb: boolean) => (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        trackW.value = e.nativeEvent.layout.width;
      }}
    >
      <View style={styles.track} />
      <Animated.View style={[styles.fill, fillStyle]} />
      {showThumb ? <Animated.View style={[styles.thumb, thumbStyle]} /> : null}
    </View>
  );

  if (IS_TV) {
    // Focusable bar: parent handles Left/Right → seek while this holds focus.
    return (
      <FocusablePressable
        focusScale={1}
        accessibilityLabel="Scrub bar"
        accessibilityRole="adjustable"
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={() => {
          onFocusChange?.(true);
          onFocus?.();
        }}
        onBlur={() => onFocusChange?.(false)}
        style={styles.tvHit}
      >
        {({ focused }) => bar(focused)}
      </FocusablePressable>
    );
  }

  return <GestureDetector gesture={Gesture.Race(pan, tap)}>{bar(true)}</GestureDetector>;
}

const styles = StyleSheet.create({
  wrap: { height: THUMB + 12, justifyContent: 'center' },
  tvHit: { paddingVertical: 6, justifyContent: 'center' },
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
