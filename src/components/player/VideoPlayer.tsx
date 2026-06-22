import { useEffect, useMemo, useRef, type ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, TVFocusGuideView, useTVEventHandler, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { formatDuration, type VideoMemory } from '@/core';
import { resolveAsset } from '@/core/data/assetMap';
import { AppText, Badge, FocusablePressable, Scrim } from '../ui';
import { metrics, palette, radius, spacing } from '@/theme';
import { IS_TV } from '@/core/tv';

import { ControlButton } from './ControlButton';
import { usePlayerChrome } from './PlayerChrome';
import { Scrubber } from './Scrubber';
import { usePlaybackState } from '@/hooks/usePlaybackState';

/** PiP is a handheld feature on BOTH iOS and Android (the expo-video config
 * plugin sets `supportsPictureInPicture` on each native project, so a regenerated
 * build has the iOS background mode + the Android `supportsPictureInPicture`
 * activity flag). We show the affordance on every handheld and let expo-video do
 * the right thing per platform: `startPictureInPicture()` enters PiP on real iOS
 * devices and on Android, and is a harmless no-op on the iOS Simulator (Apple
 * doesn't support PiP there) — so the button is always discoverable rather than
 * vanishing on the sim. `!IS_TV` keeps it off the 10-foot surfaces (where
 * `Platform.OS` is 'ios'/'android' too). */
const CAN_PIP = !IS_TV;

export function VideoPlayer({ memory }: { memory: VideoMemory }) {
  const source = useMemo(() => resolveAsset(memory.assetURL), [memory.assetURL]);
  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = 0.25;
    // Keep the player alive when the app backgrounds so PiP continues playing
    // in the floating window instead of pausing.
    p.staysActiveInBackground = true;
    p.play();
  });
  const view = useRef<VideoView>(null);
  const resumeAfterScrub = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrubFocused = useRef(false);
  const lastLiveSeek = useRef(0);
  const { isPlaying, currentTime, duration, ended } = usePlaybackState(player);
  const { rendered, chromeOpacity, reveal, hide, setAutoHide, noteFocus, isRestoreTarget } = usePlayerChrome();
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chromeOpacity.value }));

  // Focus-restore plumbing: each control records itself when focused and reclaims
  // focus on the next reveal (so the chrome doesn't snap back to play/pause).
  // `noteFocus` only writes a ref (no re-render, no timer reset) — crucially it
  // must NOT call reveal(), or the focused control (which carries
  // hasTVPreferredFocus) would re-fire onFocus on every timeUpdate and the chrome
  // would never auto-hide.
  const chromeFocus = (key: string, isDefault = false) => ({
    onFocus: () => noteFocus(key),
    hasTVPreferredFocus: IS_TV ? isRestoreTarget(key, isDefault) : undefined,
  });

  const seekTo = (t: number) => {
    player.currentTime = Math.max(0, Math.min(duration || 0, t));
  };
  const togglePlay = () => (isPlaying ? player.pause() : player.play());
  const replay = () => {
    seekTo(0);
    player.play();
    reveal();
  };

  // Arm inactivity auto-hide only while actually playing; pausing or reaching the
  // end keeps the chrome up (you're not watching anything to obscure).
  useEffect(() => {
    setAutoHide(isPlaying && !ended);
  }, [isPlaying, ended, setAutoHide]);

  // Press-and-hold continuous seek (fast-forward / rewind). A short press does a
  // single ±10s jump and releases before the first repeat tick; a held press
  // keeps seeking until release — standard transport behaviour on both surfaces.
  const clearHold = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const beginHold = (dir: 1 | -1) => {
    reveal();
    seekTo((player.currentTime ?? 0) + dir * 10);
    clearHold();
    holdTimer.current = setInterval(() => {
      seekTo((player.currentTime ?? 0) + dir * 5);
      reveal();
    }, 220);
  };
  useEffect(() => () => clearHold(), []);

  // TV scrubbing: while the scrub bar holds focus, d-pad Left/Right seeks. The
  // bar is full-width with no horizontal neighbours, so those presses don't move
  // focus — they're free to drive seeking, and holding the d-pad auto-repeats the
  // event for a continuous fast-forward / rewind. (Touch scrubbing is the drag
  // gesture inside Scrubber.)
  useTVEventHandler((evt) => {
    if (!IS_TV || !evt || !scrubFocused.current) return;
    const step = Math.max(2, (player.duration || 0) * 0.04);
    const t = (evt as { eventType?: string }).eventType;
    if (t === 'right' || t === 'swipeRight') {
      seekTo((player.currentTime ?? 0) + step);
      reveal();
    } else if (t === 'left' || t === 'swipeLeft') {
      seekTo((player.currentTime ?? 0) - step);
      reveal();
    }
  });

  // On TV the controls cluster is an autoFocus focus guide: a downward d-pad
  // search from the Back button (across the full-screen video gap) is attracted
  // here and homes onto a control. It only attracts focus *entering* it, so
  // vertical navigation between rows — and the upward exit to Back — is
  // unaffected. On handheld it's a plain View. (The upward bridge is the top
  // bar's autoFocus guide in MemoryDetailScreen.)
  const Controls: ComponentType<any> = IS_TV ? TVFocusGuideView : View;
  const controlsProps = IS_TV ? { autoFocus: true } : {};

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
      {...chromeFocus(`chapter-${i}`)}
      ring={{ color: palette.focus, radius: radius.pill }}
      accessibilityLabel={`Chapter: ${chapter.title}`}
    >
      <Badge
        label={`${chapter.title} · ${formatDuration(chapter.startTime)}`}
        tone={i === activeChapter ? 'video' : 'outline'}
        textVariant="caption"
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
      // Also pop into PiP automatically when the user backgrounds the app mid-play.
      startsPictureInPictureAutomatically={CAN_PIP}
    />
  );

  return (
    <View style={styles.container}>
      {/* On TV the video is wrapped in a `pointerEvents="none"` layer. The native
          AVPlayerViewController behind expo-video's VideoView is focusable on
          tvOS and absorbs the d-pad's directional search; a non-interactive
          wrapper takes that native subtree out of the focus system while keeping
          it visible. Handheld keeps a tap-to-toggle Pressable instead. */}
      {IS_TV ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {videoView}
        </View>
      ) : (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => (rendered ? hide() : reveal())}
        >
          {videoView}
        </Pressable>
      )}

      {rendered ? (
        <Animated.View style={[styles.controlsWrap, chromeStyle]} pointerEvents="box-none">
          {/* Scrim — clear at the top, darkening downward — keeps the controls
              legible over both dark and bright footage. */}
          <Scrim edge="bottom" />
          <Controls style={styles.controls} pointerEvents="box-none" {...controlsProps}>
            {memory.chapters?.length ? (
              // TV: a plain LEFT-aligned row (not a ScrollView). A ScrollView
              // traps directional focus on tvOS — you can enter from below but
              // can't navigate up out of it. A plain View lets focus move up to
              // Back freely. Handheld keeps the ScrollView so long chapter lists
              // stay swipeable.
              IS_TV ? (
                // A plain LEFT-aligned row. Reachable via the full-width focusable
                // scrubber directly below it (chapters ↕ scrubber ↕ transport) —
                // the scrubber's full width overlaps both the left chapters and
                // the centered transport, so geometry connects all three rows. No
                // autoFocus guide here (it would *trap* the downward exit — the
                // spec-0 reverse-trap lesson).
                <View style={styles.chaptersRowTV}>{chapterChips}</View>
              ) : (
                // Mask the horizontal scroll so chapters dissolve at the
                // container edges instead of being hard-clipped. The mask is
                // alpha-only, so it fades cleanly over any footage.
                <MaskedView style={styles.chaptersMask} maskElement={<ChaptersEdgeMask />}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chapters}
                  >
                    {chapterChips}
                  </ScrollView>
                </MaskedView>
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
                  {...chromeFocus('scrub')}
                  onFocusChange={(f) => {
                    scrubFocused.current = f;
                  }}
                  onScrubStart={() => {
                    resumeAfterScrub.current = isPlaying;
                    player.pause();
                  }}
                  onScrubMove={(t) => {
                    // Throttle the live preview seek to ~25fps so the frame
                    // updates as you drag without flooding the player.
                    const now = Date.now();
                    if (now - lastLiveSeek.current < 40) return;
                    lastLiveSeek.current = now;
                    seekTo(t);
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
                <ControlButton
                  icon="replay-10"
                  label="Back 10 seconds"
                  onPressIn={() => beginHold(-1)}
                  onPressOut={clearHold}
                  {...chromeFocus('skip-back')}
                />
                {ended ? (
                  <ControlButton icon="replay" label="Replay" size="lg" onPress={replay} {...chromeFocus('play', true)} />
                ) : (
                  <ControlButton
                    icon={isPlaying ? 'pause' : 'play-arrow'}
                    label={isPlaying ? 'Pause' : 'Play'}
                    size="lg"
                    onPress={() => {
                      togglePlay();
                      reveal();
                    }}
                    {...chromeFocus('play', true)}
                  />
                )}
                <ControlButton
                  icon="forward-10"
                  label="Forward 10 seconds"
                  onPressIn={() => beginHold(1)}
                  onPressOut={clearHold}
                  {...chromeFocus('skip-forward')}
                />
              </View>
              {CAN_PIP ? (
                <View style={styles.transportSecondary}>
                  <ControlButton
                    icon="picture-in-picture"
                    label="Picture in Picture"
                    onPress={async () => {
                      try {
                        await view.current?.startPictureInPicture();
                      } catch {
                        // PiP can be unavailable (e.g. another PiP session) — no-op.
                      }
                    }}
                  />
                </View>
              ) : null}
            </View>
          </Controls>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Width (px) of the fade at each edge of the chapter row — kept thin so it's a
 * subtle edge detail and the first chip at rest isn't visibly clipped. */
const CHAPTER_FADE = 12;

/** Alpha mask for the mobile chapter row: transparent at both edges, opaque
 * through the middle, so chips fade out at the container edges instead of cutting
 * off. MaskedView reads only the alpha channel, so this fades over any footage. */
function ChaptersEdgeMask() {
  const bands = 8;
  return (
    <View style={styles.maskRow}>
      <View style={styles.maskFade}>
        {Array.from({ length: bands }).map((_, i) => (
          <View key={`l${i}`} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${i / (bands - 1)})` }} />
        ))}
      </View>
      <View style={styles.maskSolid} />
      <View style={styles.maskFade}>
        {Array.from({ length: bands }).map((_, i) => (
          <View key={`r${i}`} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${1 - i / (bands - 1)})` }} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.playerBg },
  // The fade layer + gradient host. Padding-top gives the gradient room to ramp
  // above the controls.
  controlsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.xxxl,
  },
  controls: {
    paddingHorizontal: metrics.isTV ? metrics.screenPad : spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: metrics.isTV ? metrics.overscanY : spacing.xl,
    gap: spacing.md,
  },
  chapters: { gap: spacing.sm, paddingVertical: spacing.xs },
  // The MaskedView wrapping the chapter ScrollView; `alignSelf: flex-start` lets
  // it size to the chip row's height (rather than stretching) so the alpha mask
  // lines up with the chips.
  chaptersMask: { alignSelf: 'flex-start', width: '100%' },
  maskRow: { flex: 1, flexDirection: 'row' },
  maskFade: { width: CHAPTER_FADE, flexDirection: 'row' },
  maskSolid: { flex: 1, backgroundColor: 'black' },
  // TV: a LEFT-aligned plain row (no ScrollView) so the chapter chips sit on the
  // left while the focus engine still moves Pause↔chapter and chapter↑Back.
  chaptersRowTV: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scrubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scrubber: { flex: 1 },
  // Transport is CENTERED. Focus still reaches the left chapters because the
  // full-width focusable scrubber sits between them and bridges the gap
  // (transport ↑ scrubber ↑ chapters), so no chapter↔transport alignment is
  // needed. The secondary group (PiP, iOS only) floats to the right.
  transport: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  transportPrimary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  transportSecondary: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
});
