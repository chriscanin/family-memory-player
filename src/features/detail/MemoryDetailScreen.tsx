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

  // TV focus model — the player's controls sit at the bottom and Back sits
  // top-left, separated by a focus void (the full-screen video). tvOS's focus
  // engine won't cross that void by geometry, so we bridge it with two
  // `autoFocus` focus guides (attractors), which — unlike tag-based
  // `destinations`/`nextFocus` — reliably pull focus across the gap on Fabric:
  // - Root traps focus on all sides → focus can never leave the screen (it is
  //   structurally impossible to lose). It is NOT autoFocus: a root attractor
  //   re-homes to Back and strands it (the original "can't go down" bug).
  // - The top bar is an autoFocus guide: an upward search from the controls is
  //   attracted here and homes onto its only focusable child, Back.
  // - The controls cluster is itself an autoFocus guide (see VideoPlayer): a
  //   downward search from Back is attracted there and homes onto a control.
  //   Each guide only attracts focus *entering* it, so neither direction traps.
  const Root: ComponentType<any> = IS_TV ? TVFocusGuideView : View;
  const rootProps = IS_TV
    ? {
        trapFocusUp: true,
        trapFocusDown: true,
        trapFocusLeft: true,
        trapFocusRight: true,
      }
    : {};
  const TopBar: ComponentType<any> = IS_TV ? TVFocusGuideView : SafeAreaView;
  const topBarProps = IS_TV ? { autoFocus: true } : { edges: ['top'] as const };

  return (
    <Root style={styles.root} {...rootProps}>
      {video ? <VideoPlayer memory={memory} /> : <PhotoViewer memory={memory} />}

      <TopBar style={styles.topBar} pointerEvents="box-none" {...topBarProps}>
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
          <AppText variant="heading" color={palette.accent} numberOfLines={1}>
            Preserved by Legacybox
          </AppText>
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
