import { StyleSheet, View } from 'react-native';

import { palette, spacing } from '@/theme';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

/** Swimlane / section heading — a wide-tracked uppercase eyebrow in muted sage,
 * matching the design's "RECENTLY VIEWED" / "ALL MEMORIES" labels. */
export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="eyebrow" color={palette.textMuted}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color={palette.textMuted}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
