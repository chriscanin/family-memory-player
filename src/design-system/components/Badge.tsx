import { StyleSheet, View, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '../tokens';
import { AppText } from './Text';

type Tone = 'video' | 'neutral' | 'scrim';

interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  video: { bg: palette.accent, fg: palette.accentInk },
  neutral: { bg: palette.surfaceHi, fg: palette.text },
  scrim: { bg: palette.scrim, fg: palette.text },
};

/** Compact pill used for media type, duration, and status chips. */
export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <AppText variant="label" color={fg}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
