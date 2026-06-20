import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { formatDuration, formatRecordedDate, isVideo, type Memory } from '@/core';
import { resolvePoster } from '@/data/assetMap';

import { metrics, palette, radius, spacing } from '../tokens';
import { AppText } from './Text';
import { Badge } from './Badge';
import { FocusablePressable } from './FocusablePressable';

interface MemoryCardProps {
  memory: Memory;
  onPress: () => void;
  width?: number;
  /** Request initial d-pad focus (TV) — used for the first card. */
  hasTVPreferredFocus?: boolean;
}

/**
 * A single memory in the library. Built on FocusablePressable, so it lifts and
 * highlights identically under touch or d-pad. The poster is a real frame
 * (extracted still for videos), with type + duration chips overlaid.
 */
export function MemoryCard({ memory, onPress, width = metrics.cardWidth, hasTVPreferredFocus }: MemoryCardProps) {
  const posterHeight = Math.round(width * metrics.cardPosterRatio);
  const video = isVideo(memory);

  return (
    <FocusablePressable
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={[styles.card, { width }]}
      accessibilityRole="button"
      accessibilityLabel={`${memory.title}, ${video ? 'video' : 'photo'}`}
    >
      {({ focused }) => (
        <View>
          <View
            style={[
              styles.poster,
              { height: posterHeight, borderColor: focused ? palette.accent : palette.line },
            ]}
          >
            <Image
              source={resolvePoster(memory.assetURL)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
            />
            <View style={styles.topRow}>
              <Badge label={video ? 'VIDEO' : 'PHOTO'} tone={video ? 'video' : 'scrim'} />
              {video ? <Badge label={formatDuration(memory.duration)} tone="scrim" /> : null}
            </View>
            {video ? (
              <View style={styles.playGlyph}>
                <AppText variant="title" color={palette.text}>
                  ▶
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="heading" numberOfLines={1} style={styles.title}>
            {memory.title}
          </AppText>
          <AppText variant="caption" color={palette.textMuted} numberOfLines={1}>
            {formatRecordedDate(memory.dateRecorded)}
          </AppText>
        </View>
      )}
    </FocusablePressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  poster: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: palette.surface,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  playGlyph: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: spacing.xs },
});
