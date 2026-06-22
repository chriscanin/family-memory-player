import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { FocusablePressable } from '../ui';
import { palette, radius } from '@/theme';

/** The MaterialIcons family covers the whole transport in one consistent set:
 * play/pause, ±10s (`replay-10`/`forward-10`), replay, and PiP. */
export type ControlIcon = keyof typeof MaterialIcons.glyphMap;

interface ControlButtonProps {
  icon: ControlIcon;
  label: string;
  onPress?: () => void;
  /** Press-and-hold hooks — used to drive continuous seek (fast-forward/rewind). */
  onPressIn?: () => void;
  onPressOut?: () => void;
  onFocus?: () => void;
  size?: 'md' | 'lg';
  hasTVPreferredFocus?: boolean;
}

/** Round, focusable transport control (play/pause, skip, replay, PiP). */
export function ControlButton({
  icon,
  label,
  onPress,
  onPressIn,
  onPressOut,
  onFocus,
  size = 'md',
  hasTVPreferredFocus,
}: ControlButtonProps) {
  const dim = size === 'lg' ? 68 : 48;
  const glyph = Math.round(dim * (size === 'lg' ? 0.5 : 0.55));
  return (
    <FocusablePressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onFocus={onFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityLabel={label}
      ring={{ color: palette.focus, radius: radius.pill }}
      style={[styles.button, { width: dim, height: dim, borderRadius: dim / 2 }]}
    >
      <MaterialIcons name={icon} size={glyph} color={palette.text} />
    </FocusablePressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.controlBg,
  },
});
