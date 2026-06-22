import { useEffect, type ComponentType } from 'react';
import { StyleSheet, TVFocusGuideView, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { formatRecordedDate, isVideo } from '@/core';
import { memoriesById } from '@/core/data/library';
import { AppText, FavoriteButton, FocusablePressable, Scrim } from '@/components';
import { fonts, metrics, palette, radius, spacing } from '@/theme';
import { IS_TV } from '@/core/tv';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

import { PhotoViewer, PlayerChromeProvider, usePlayerChrome, VideoPlayer } from '@/components';

export function MemoryDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const memory = memoriesById.get(id);
  const record = useRecentlyViewed((s) => s.recordView);

  // Record the view only AFTER the open transition fully completes. The home
  // screen (with the Recently-viewed list) stays mounted beneath this one during
  // the push, so recording mid-animation reorders that list in plain sight —
  // visible as a "shift" behind the transition. `transitionEnd` fires once this
  // screen has fully covered home, so the reorder lands while it is hidden. A
  // long fallback covers the rare case where no transition event arrives (e.g.
  // reduced motion). expo-router's typed navigation doesn't surface the
  // native-stack 'transitionEnd' event, so we narrow to the shape we use.
  useEffect(() => {
    if (!memory) return;
    let done = false;
    const mark = () => {
      if (done) return;
      done = true;
      record(memory.id);
    };
    const nav = navigation as unknown as {
      addListener: (type: 'transitionEnd', cb: (e: { data?: { closing?: boolean } }) => void) => () => void;
    };
    const unsub = nav.addListener('transitionEnd', (e) => {
      if (e?.data?.closing) return; // ignore the dismiss transition (we already recorded)
      mark();
    });
    const fallback = setTimeout(mark, 1200);
    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, [memory, record, navigation]);

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
  // - The top bar is an autoFocus guide (see DetailTopBar): an upward search from
  //   the controls is attracted to its only focusable child, Back.
  // - The controls cluster is itself an autoFocus guide (see VideoPlayer): a
  //   downward search from Back homes onto a control.
  // The chrome (top bar + controls) auto-hides during playback; while hidden on
  // TV a full-screen reveal catcher (PlayerChromeProvider) owns focus so it is
  // never lost. See PlayerChrome.tsx.
  const Root: ComponentType<any> = IS_TV ? TVFocusGuideView : View;
  const rootProps = IS_TV
    ? {
        trapFocusUp: true,
        trapFocusDown: true,
        trapFocusLeft: true,
        trapFocusRight: true,
      }
    : {};

  return (
    <Root style={styles.root} {...rootProps}>
      <PlayerChromeProvider>
        {video ? <VideoPlayer memory={memory} /> : <PhotoViewer memory={memory} />}
        <DetailTopBar
          memoryId={memory.id}
          title={memory.title}
          subtitle={`${formatRecordedDate(memory.dateRecorded)} · ${video ? 'Video' : 'Photo'}`}
          preferFocus={!video && IS_TV}
          onBack={() => router.back()}
        />
      </PlayerChromeProvider>
    </Root>
  );
}

/** The top bar (Back + branded title) — fades with the chrome and carries the
 * upward autoFocus bridge on TV. Pulled out so it can read the chrome context;
 * returns null while the chrome is hidden (the reveal catcher then owns focus). */
function DetailTopBar({
  memoryId,
  title,
  subtitle,
  preferFocus,
  onBack,
}: {
  memoryId: string;
  title: string;
  subtitle: string;
  preferFocus: boolean;
  onBack: () => void;
}) {
  const { rendered, chromeOpacity, noteFocus, isRestoreTarget } = usePlayerChrome();
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chromeOpacity.value }));
  // onFocus only records the control (a ref write) — it must not reveal(), or the
  // focused control would re-fire onFocus each timeUpdate and block auto-hide.
  const chromeFocus = (key: string, isDefault = false) => ({
    onFocus: () => noteFocus(key),
    hasTVPreferredFocus: IS_TV ? isRestoreTarget(key, isDefault) : undefined,
  });
  if (!rendered) return null;

  const TopBar: ComponentType<any> = IS_TV ? TVFocusGuideView : SafeAreaView;
  const topBarProps = IS_TV ? { autoFocus: true } : { edges: ['top'] as const };

  return (
    <Animated.View style={[styles.topBarWrap, chromeStyle]} pointerEvents="box-none">
      {/* Scrim behind the title so it stays readable over light/daytime footage.
          `max={1}` + a low `power` carry near-opaque ink down through the whole
          title block (not just the very top edge), and the scrim extends well
          below the text — most of our footage is bright, so this is sized for the
          worst case. */}
      <Scrim edge="top" max={1} power={1.3} style={styles.topBarScrim} />
      <TopBar style={styles.topBar} pointerEvents="box-none" {...topBarProps}>
        <FocusablePressable
          onPress={onBack}
          {...chromeFocus('back', preferFocus)}
          ring={{ color: palette.focus, radius: radius.pill }}
          style={styles.back}
          accessibilityLabel="Back to library"
        >
          <AppText variant="heading" color={palette.text} style={styles.onMedia}>
            ‹ Back
          </AppText>
        </FocusablePressable>
        <View style={styles.titleWrap}>
          <AppText variant="caption" color={palette.accent} style={[styles.brandFlourish, styles.onMedia]} numberOfLines={1}>
            Family Memory Player
          </AppText>
          <AppText variant="title" color={palette.text} style={styles.onMedia} numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" color={palette.textMuted} style={styles.onMedia} numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
        <FavoriteButton
          memoryId={memoryId}
          size={IS_TV ? 30 : 26}
          showLabel={IS_TV}
          style={IS_TV ? styles.favoriteTV : styles.favorite}
          {...chromeFocus('favorite')}
        />
      </TopBar>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.playerBg },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  // Extends well past the title block so the gradient has runway to fade out
  // softly below the text rather than cutting off right under it.
  topBarScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: -spacing.xxxl * 2 },
  // Belt-and-suspenders legibility over bright footage: a soft dark halo on the
  // chrome text so it reads even where the gradient is thinnest.
  onMedia: {
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  topBar: {
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
  // The brand flourish — a small italic Newsreader line, per the design (the
  // editorial serif voice in the player chrome).
  brandFlourish: { fontFamily: fonts.serifItalic },
  favorite: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.controlScrim,
  },
  favoriteTV: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.controlScrim,
  },
  backPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceHi,
  },
});
