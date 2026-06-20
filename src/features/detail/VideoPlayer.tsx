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

// On TV, each control row is its own focus guide with autoFocus, so moving the
// d-pad up/down between rows lands on the nearest item without needing columns
// to line up — and focus can never fall into the gap between rows.
const FocusRow: ComponentType<any> = IS_TV ? TVFocusGuideView : View;

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

  return (
    <View style={styles.container}>
      <Pressable
        style={StyleSheet.absoluteFill}
        focusable={!IS_TV}
        onPress={() => {
          if (IS_TV) return; // TV keeps controls up; the d-pad needs a focus target.
          if (controlsVisible) setControlsVisible(false);
          else reveal();
        }}
      >
        <VideoView
          ref={view}
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
          allowsPictureInPicture={CAN_PIP}
          startsPictureInPictureAutomatically={false}
        />
      </Pressable>

      {controlsVisible ? (
        <View style={styles.controls} pointerEvents="box-none">
          {memory.chapters?.length ? (
            <FocusRow autoFocus={IS_TV}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chapters}
            >
              {memory.chapters.map((chapter, i) => (
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
              ))}
            </ScrollView>
            </FocusRow>
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

          <FocusRow style={styles.transport} autoFocus={IS_TV}>
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
          </FocusRow>
        </View>
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
  scrubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scrubber: { flex: 1 },
  // Primary controls are centered on every surface; the secondary group (PiP,
  // iOS only) floats to the right so it never pulls the main controls off-center
  // (on TV there is no secondary group, so the transport stays truly centered).
  transport: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  transportPrimary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  transportSecondary: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
});
