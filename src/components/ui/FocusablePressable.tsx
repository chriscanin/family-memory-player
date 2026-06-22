import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { metrics, palette, radius } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FocusablePressableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode | ((state: { focused: boolean }) => ReactNode);
  style?: ViewStyle | ViewStyle[];
  /** How much the element grows when focused (TV) or pressed (touch). */
  focusScale?: number;
  /** Draw an animated focus ring (used by buttons; cards draw their own). */
  ring?: { color?: string; radius?: number; width?: number };
}

/**
 * The core interactive primitive. It unifies two input models behind one
 * component: on touch it reacts to press; on TV it reacts to the focus engine
 * (`onFocus`/`onBlur`). Both drive the same scale animation.
 *
 * The ref is forwarded to the underlying Pressable so a `TVFocusGuideView` can
 * target this element via `destinations` (used to send focus to the Back button
 * from across the screen).
 */
export const FocusablePressable = forwardRef<any, FocusablePressableProps>(
  function FocusablePressable(
    {
      children,
      style,
      focusScale = metrics.focusScale,
      ring,
      onFocus,
      onBlur,
      onPressIn,
      onPressOut,
      ...rest
    },
    ref,
  ) {
    const focus = useSharedValue(0);
    const press = useSharedValue(0);
    const [focused, setFocused] = useState(false);

    const containerStyle = useAnimatedStyle(() => {
      const active = Math.max(focus.value, press.value);
      return { transform: [{ scale: 1 + active * (focusScale - 1) }] };
    });

    const ringStyle = useAnimatedStyle(() => ({ opacity: focus.value }));

    return (
      <AnimatedPressable
        ref={ref}
        {...rest}
        onFocus={(e) => {
          focus.value = withTiming(1, { duration: 140 });
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          focus.value = withTiming(0, { duration: 140 });
          setFocused(false);
          onBlur?.(e);
        }}
        onPressIn={(e: GestureResponderEvent) => {
          press.value = withTiming(1, { duration: 90 });
          onPressIn?.(e);
        }}
        onPressOut={(e: GestureResponderEvent) => {
          press.value = withTiming(0, { duration: 130 });
          onPressOut?.(e);
        }}
        style={[styles.base, containerStyle, style]}
      >
        {typeof children === 'function' ? children({ focused }) : children}
        {ring ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: ring.radius ?? radius.md,
                borderWidth: ring.width ?? 3,
                borderColor: ring.color ?? palette.focus,
              },
              ringStyle,
            ]}
          />
        ) : null}
      </AnimatedPressable>
    );
  },
);

const styles = StyleSheet.create({
  base: { position: 'relative' },
});
