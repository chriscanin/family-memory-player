import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { formatDuration, formatRecordedDate, isVideo, type Memory } from '@/core';
import { resolvePoster } from '@/core/data/assetMap';
import { IS_TV } from '@/core/tv';

import { metrics, palette, radius, spacing } from '@/theme';
import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { FavoriteButton } from './FavoriteButton';
import { FocusablePressable } from '../ui/FocusablePressable';

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
 * (extracted still for videos), with type + duration chips overlaid. On focus it
 * draws the heritage treatment: a sage ring hugging the poster plus a soft sage
 * halo just outside it.
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
          {/* Soft sage halo, just outside the ring — the design's `0 0 0 8px`
              glow. A sibling (not a child of the clipped poster) so it can sit
              outside the poster's rounded edge. */}
          {focused ? <View pointerEvents="none" style={[styles.halo, { height: posterHeight + spacing.md }]} /> : null}
          <View
            style={[
              styles.poster,
              { height: posterHeight, borderColor: focused ? palette.accent : 'transparent' },
            ]}
          >
            <Image
              source={resolvePoster(memory.assetURL)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
            />
            <View style={styles.topRow}>
              <Badge label={video ? 'VIDEO' : 'PHOTO'} tone={video ? 'video' : 'photo'} />
              {video ? <Badge label={formatDuration(memory.duration)} tone="scrim" /> : null}
            </View>
            {/* Handheld: a tap-to-favorite heart. On TV favoriting is via the
                detail top bar (a second focusable per card would double the
                grid's focus stops). It's its own pressable, so it captures the
                tap and never opens the memory. */}
            {!IS_TV ? <FavoriteButton memoryId={memory.id} size={20} style={styles.heart} /> : null}
          </View>
          <AppText variant="title" numberOfLines={1} style={styles.title}>
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
  halo: {
    position: 'absolute',
    top: -spacing.sm,
    left: -spacing.sm,
    right: -spacing.sm,
    borderRadius: radius.lg,
    borderWidth: spacing.xs + 1,
    borderColor: palette.focusHalo,
  },
  poster: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: palette.surface,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  heart: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: palette.controlScrim,
  },
  title: { marginTop: spacing.xs },
});
