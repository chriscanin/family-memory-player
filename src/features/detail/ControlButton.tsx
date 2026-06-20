import { StyleSheet } from 'react-native';

import { AppText, FocusablePressable, palette, radius } from '@/design-system';

interface ControlButtonProps {
  glyph: string;
  label: string;
  onPress: () => void;
  size?: 'md' | 'lg';
  hasTVPreferredFocus?: boolean;
}

/** Round, focusable transport control (play/pause, skip, PiP, fullscreen). */
export function ControlButton({ glyph, label, onPress, size = 'md', hasTVPreferredFocus }: ControlButtonProps) {
  const dim = size === 'lg' ? 68 : 48;
  return (
    <FocusablePressable
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityLabel={label}
      ring={{ color: palette.focus, radius: radius.pill }}
      style={[styles.button, { width: dim, height: dim, borderRadius: dim / 2 }]}
    >
      <AppText variant={size === 'lg' ? 'title' : 'heading'} color={palette.text}>
        {glyph}
      </AppText>
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
