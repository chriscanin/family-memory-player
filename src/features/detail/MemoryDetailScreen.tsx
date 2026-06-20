import { useEffect, type ComponentType } from 'react';
import { StyleSheet, TVFocusGuideView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatRecordedDate, isVideo } from '@/core';
import { memoriesById } from '@/data/library';
import { AppText, FocusablePressable, metrics, palette, radius, spacing } from '@/design-system';
import { IS_TV } from '@/platform/tv';
import { useRecentlyViewed } from '@/state/recentlyViewedStore';

import { PhotoViewer } from './PhotoViewer';
import { VideoPlayer } from './VideoPlayer';

export function MemoryDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const memory = memoriesById.get(id);
  const record = useRecentlyViewed((s) => s.recordView);

  // Recording the view is the whole point of "recently viewed" — do it once the
  // memory is opened.
  useEffect(() => {
    if (memory) record(memory.id);
  }, [memory, record]);

  if (!memory) {
    return (
      <View style={[styles.root, styles.center]}>
        <AppText variant="title">Memory not found</AppText>
        <FocusablePressable
          onPress={() => router.back()}
          hasTVPreferredFocus
          ring={{ color: palette.focus, radius: radius.pill }}
          style={styles.backPill}
        >
          <AppText variant="heading">‹ Back</AppText>
        </FocusablePressable>
      </View>
    );
  }

  const video = isVideo(memory);

  // On TV (tvOS + Android TV), wrap the screen in a focus guide with autoFocus
  // so the d-pad can never strand focus in empty space: there is always a
  // focusable target, and navigating up from the controls reaches Back.
  const Root: ComponentType<any> = IS_TV ? TVFocusGuideView : View;
  // The Back bar is its own focus guide on TV so the d-pad can always reach it
  // (autoFocus lands here when navigating up out of the player controls).
  const TopBar: ComponentType<any> = IS_TV ? TVFocusGuideView : SafeAreaView;

  return (
    <Root style={styles.root} autoFocus={IS_TV}>
      {video ? <VideoPlayer memory={memory} /> : <PhotoViewer memory={memory} />}

      <TopBar
        style={styles.topBar}
        pointerEvents="box-none"
        {...(IS_TV ? { autoFocus: true } : { edges: ['top'] })}
      >
        <FocusablePressable
          onPress={() => router.back()}
          hasTVPreferredFocus={!video && IS_TV}
          ring={{ color: palette.focus, radius: radius.pill }}
          style={styles.back}
          accessibilityLabel="Back to library"
        >
          <AppText variant="heading" color={palette.text}>
            ‹ Back
          </AppText>
        </FocusablePressable>
        <View style={styles.titleWrap}>
          <AppText variant="heading" color={palette.text} numberOfLines={1}>
            {memory.title}
          </AppText>
          <AppText variant="caption" color={palette.textMuted} numberOfLines={1}>
            {formatRecordedDate(memory.dateRecorded)} · {video ? 'Video' : 'Photo'}
          </AppText>
        </View>
      </TopBar>
    </Root>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.playerBg },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: metrics.isTV ? metrics.screenPad : spacing.lg,
    paddingTop: metrics.isTV ? metrics.overscanY : spacing.sm,
    paddingBottom: spacing.sm,
  },
  back: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.controlScrim,
  },
  titleWrap: { flex: 1 },
  backPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceHi,
  },
});
