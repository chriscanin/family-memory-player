import { StyleSheet, View } from 'react-native';

import { palette, spacing } from '../tokens';
import { AppText } from './Text';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="title">{title}</AppText>
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
