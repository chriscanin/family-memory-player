import { useEffect, useState, type ComponentType } from 'react';
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

  // The Back button registers itself (via a callback ref) as the destination of
  // the top focus guide, so pressing UP from anywhere in the player controls
  // sends focus to Back — across the video gap — without trapping it.
  const [backNode, setBackNode] = useState<unknown>(null);

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

  // TV focus model:
  // - Root traps focus on all sides → focus can never leave the screen (it is
  //   structurally impossible to lose).
  // - The top bar is a focus guide whose `destinations` is the Back button, so
  //   navigating up from the controls always lands on (and highlights) Back.
  // - Inside the player, rows are plain (no autoFocus guides), so the engine can
  //   move between them and out to the top bar freely.
  const Root: ComponentType<any> = IS_TV ? TVFocusGuideView : View;
  const rootProps = IS_TV
    ? {
        // autoFocus makes this guide ACTIVE (isTVSelectable). Without it the
        // trapFocus props are inert and focus can be lost. On the root, autoFocus
        // only re-homes focus that would otherwise escape the whole screen — it
        // does NOT trap navigation between children (that was the per-row bug).
        autoFocus: true,
        trapFocusUp: true,
        trapFocusDown: true,
        trapFocusLeft: true,
        trapFocusRight: true,
      }
    : {};
  const TopBar: ComponentType<any> = IS_TV ? TVFocusGuideView : SafeAreaView;
  const topBarProps = IS_TV
    ? { destinations: backNode ? [backNode] : undefined }
    : { edges: ['top'] as const };

  return (
    <Root style={styles.root} {...rootProps}>
      {video ? <VideoPlayer memory={memory} /> : <PhotoViewer memory={memory} />}

      <TopBar style={styles.topBar} pointerEvents="box-none" {...topBarProps}>
        <FocusablePressable
          ref={setBackNode}
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
