import { StyleSheet, View, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Tone = 'video' | 'photo' | 'neutral' | 'scrim' | 'outline';

interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
  /** Text style. Defaults to the uppercase micro-`label` (media-type / duration
   * chips); chapter chips pass `caption` for normal-case, readable titles. */
  textVariant?: 'label' | 'caption' | 'heading';
}

/** Pill styling per tone. Mirrors the design's chips: VIDEO is a solid sage
 * pill; PHOTO and inactive chapters are outlined over the footage; duration is a
 * soft dark scrim. */
const TONES: Record<Tone, { bg: string; fg: string; border?: string }> = {
  video: { bg: palette.accent, fg: palette.accentInk },
  photo: { bg: palette.badgePhotoBg, fg: palette.text, border: palette.badgeBorder },
  outline: { bg: 'transparent', fg: palette.text, border: palette.badgeBorder },
  neutral: { bg: palette.surfaceHi, fg: palette.text },
  scrim: { bg: palette.badgeScrim, fg: palette.text },
};

/** Compact pill used for media type, duration, and chapter chips. */
export function Badge({ label, tone = 'neutral', style, textVariant = 'label' }: BadgeProps) {
  const { bg, fg, border } = TONES[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        border ? { borderWidth: StyleSheet.hairlineWidth + 1, borderColor: border } : null,
        style,
      ]}
    >
      <AppText variant={textVariant} color={fg}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
