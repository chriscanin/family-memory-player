import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TVFocusGuideView, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { formatDuration, type VideoMemory } from '@/core';
import { resolveAsset } from '@/data/assetMap';
import { AppText, Badge, FocusablePressable, metrics, palette, radius, spacing } from '@/design-system';
import { IS_TV } from '@/platform/tv';

import { ControlButton } from './ControlButton';
import { Scrubber } from './Scrubber';
import { usePlaybackState } from './usePlaybackState';

/** PiP is an iOS-handheld feature. On tvOS `Platform.OS` is also 'ios', so the
 * TV guard is essential here. */
const CAN_PIP = !IS_TV && Platform.OS === 'ios';

export function VideoPlayer({ memory }: { memory: VideoMemory }) {
  const source = useMemo(() => resolveAsset(memory.assetURL), [memory.assetURL]);
  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });
  const view = useRef<VideoView>(null);
  const resumeAfterScrub = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isPlaying, currentTime, duration } = usePlaybackState(player);
  const [controlsVisible, setControlsVisible] = useState(true);

  const seekTo = (t: number) => {
    player.currentTime = Math.max(0, Math.min(duration || 0, t));
  };
  const togglePlay = () => (isPlaying ? player.pause() : player.play());

  // On TV the controls cluster is an autoFocus focus guide: a downward d-pad
  // search from the Back button (across the full-screen video gap) is attracted
  // here and homes onto a control, which is how Back returns focus to the player.
  // It only attracts focus *entering* it, so vertical navigation between the rows
  // inside — and the upward exit back to Back — is unaffected. On handheld it's a
  // plain View. (The matching upward bridge is the top bar's autoFocus guide in
  // MemoryDetailScreen.)
  const Controls: ComponentType<any> = IS_TV ? TVFocusGuideView : View;
  const controlsProps = IS_TV ? { autoFocus: true } : {};

  const scheduleHide = () => {
    if (IS_TV) return; // TV always shows controls — focus needs a target.
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (isPlaying) hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
  };
  const reveal = () => {
    setControlsVisible(true);
    scheduleHide();
  };

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const activeChapter = useMemo(() => {
    const chapters = memory.chapters ?? [];
    let index = -1;
    chapters.forEach((c, i) => {
      if (currentTime >= c.startTime) index = i;
    });
    return index;
  }, [memory.chapters, currentTime]);

  const chapterChips = memory.chapters?.map((chapter, i) => (
    <FocusablePressable
      key={`${chapter.title}-${chapter.startTime}`}
      onPress={() => {
        seekTo(chapter.startTime);
        reveal();
      }}
      ring={{ color: palette.focus, radius: radius.pill }}
      accessibilityLabel={`Chapter: ${chapter.title}`}
    >
      <Badge
        label={`${chapter.title} · ${formatDuration(chapter.startTime)}`}
        tone={i === activeChapter ? 'video' : 'scrim'}
      />
    </FocusablePressable>
  ));

  const videoView = (
    <VideoView
      ref={view}
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
      allowsPictureInPicture={CAN_PIP}
      startsPictureInPictureAutomatically={false}
    />
  );

  return (
    <View style={styles.container}>
      {/* On TV the video is wrapped in a `pointerEvents="none"` layer. The
          native AVPlayerViewController behind expo-video's VideoView is focusable
          on tvOS and absorbs the d-pad's directional search, stranding focus in
          the controls (it can't travel up to Back). A non-interactive wrapper
          takes the whole native subtree out of the focus system while keeping it
          visible. Handheld keeps the tap-to-toggle Pressable instead. */}
      {IS_TV ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {videoView}
        </View>
      ) : (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (controlsVisible) setControlsVisible(false);
            else reveal();
          }}
        >
          {videoView}
        </Pressable>
      )}

      {controlsVisible ? (
        <Controls style={styles.controls} pointerEvents="box-none" {...controlsProps}>
          {/* Plain rows of focusable items; the tvOS focus engine navigates
              between them by geometry. The cluster's own autoFocus guide (see
              `Controls` above) only attracts focus *arriving* from Back, so it
              doesn't trap movement between the rows or the upward exit to Back. */}
          {memory.chapters?.length ? (
            // On TV the chapters render in a plain centered row, NOT a
            // horizontal ScrollView: on tvOS a ScrollView traps directional
            // focus — you can enter it from below but can't navigate up out of
            // it, which strands focus on the chapters. A plain View lets the
            // focus engine move up to the Back button freely. (Handheld keeps
            // the ScrollView so long chapter lists stay swipeable.)
            IS_TV ? (
              <View style={styles.chaptersRowTV}>{chapterChips}</View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chapters}
              >
                {chapterChips}
              </ScrollView>
            )
          ) : null}

          <View style={styles.scrubRow}>
            <AppText variant="caption" color={palette.text}>
              {formatDuration(currentTime)}
            </AppText>
            <View style={styles.scrubber}>
              <Scrubber
                progress={duration > 0 ? currentTime / duration : 0}
                duration={duration}
                onScrubStart={() => {
                  resumeAfterScrub.current = isPlaying;
                  player.pause();
                }}
                onScrub={(t) => {
                  seekTo(t);
                  // Only resume if a drag actually paused us; a bare tap-to-seek
                  // never calls onScrubStart, so it won't wake a paused video.
                  if (resumeAfterScrub.current) player.play();
                  resumeAfterScrub.current = false;
                  reveal();
                }}
              />
            </View>
            <AppText variant="caption" color={palette.textMuted}>
              {formatDuration(duration)}
            </AppText>
          </View>

          <View style={styles.transport}>
            <View style={styles.transportPrimary}>
              <ControlButton glyph="«10" label="Back 10 seconds" onPress={() => { seekTo(currentTime - 10); reveal(); }} />
              <ControlButton
                glyph={isPlaying ? '❚❚' : '▶'}
                label={isPlaying ? 'Pause' : 'Play'}
                size="lg"
                hasTVPreferredFocus
                onPress={() => { togglePlay(); reveal(); }}
              />
              <ControlButton glyph="10»" label="Forward 10 seconds" onPress={() => { seekTo(currentTime + 10); reveal(); }} />
            </View>
            {CAN_PIP ? (
              <View style={styles.transportSecondary}>
                <ControlButton glyph="⧉" label="Picture in Picture" onPress={() => view.current?.startPictureInPicture()} />
              </View>
            ) : null}
          </View>
        </Controls>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.playerBg },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: metrics.isTV ? metrics.screenPad : spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: metrics.isTV ? metrics.overscanY : spacing.xl,
    gap: spacing.md,
    backgroundColor: palette.controlScrim,
  },
  chapters: { gap: spacing.sm, paddingVertical: spacing.xs },
  // TV: a plain centered row (no ScrollView) so a chapter chip sits directly
  // above the centered transport and the focus engine moves Pause↔chapter —
  // and chapter↑Back — by geometry alone.
  chaptersRowTV: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scrubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scrubber: { flex: 1 },
  // Primary controls are centered on every surface; the secondary group (PiP,
  // iOS only) floats to the right so it never pulls the main controls off-center.
  transport: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  transportPrimary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  transportSecondary: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
});
