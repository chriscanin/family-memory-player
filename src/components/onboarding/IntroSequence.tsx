import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { AppText, FocusablePressable } from '../ui';
import { palette, px, radius, spacing } from '@/theme';
import { IS_TV } from '@/core/tv';

/** How long the brand holds before the call-to-action (handheld) / auto-advance. */
const BRAND_MS = 2800;
const TV_DISMISS_MS = 5000;
/** Cross-fade duration when the intro hands off to the home screen. */
const EXIT_MS = 700;

/**
 * First-run intro: a ~5s branded moment, then it hands off to the app. The app is
 * guest-first — there's no account to create — so on handheld it offers a single
 * "Get started", and everywhere it auto-advances on its own. It can always be
 * skipped (tap on handheld) and never traps the user.
 *
 * `onDone()` lets the caller mark the intro seen and reveal the app.
 */
export function IntroSequence({ onDone }: { onDone: () => void }) {
  const [showOffer, setShowOffer] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowOffer(true), BRAND_MS);
    return () => clearTimeout(t);
  }, []);

  // Guest-first: the intro auto-advances into the app; nothing to sign into.
  useEffect(() => {
    const t = setTimeout(() => onDone(), TV_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  const skip = () => setShowOffer(true);

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(EXIT_MS)} style={styles.root}>
      {/* Tap anywhere during the brand to skip ahead (handheld). */}
      <FocusablePressable focusScale={1} onPress={skip} style={StyleSheet.absoluteFill} accessibilityLabel="Skip intro">
        <View />
      </FocusablePressable>

      <Animated.View entering={FadeInDown.duration(700)} style={styles.brand} pointerEvents="none">
        <View style={styles.logo}>
          <MaterialIcons name="auto-stories" size={IS_TV ? 72 : 56} color={palette.accent} />
        </View>
        <AppText variant="eyebrow" color={palette.accent}>
          Family Memory Player
        </AppText>
        <AppText variant="display" italic style={styles.tagline}>
          Your memories, preserved.
        </AppText>
      </Animated.View>

      {showOffer && !IS_TV ? (
        <Animated.View entering={FadeInDown.duration(500)} style={styles.offer}>
          <FocusablePressable
            onPress={() => onDone()}
            ring={{ color: palette.focus, radius: radius.pill }}
            style={[styles.btn, styles.btnPrimary]}
            accessibilityLabel="Get started"
          >
            <AppText variant="heading" color={palette.accentInk}>
              Get started
            </AppText>
          </FocusablePressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxxl,
    padding: spacing.xl,
  },
  brand: { alignItems: 'center', gap: spacing.sm },
  tagline: { textAlign: 'center' },
  logo: {
    width: IS_TV ? px(132) : 104,
    height: IS_TV ? px(132) : 104,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  offer: { alignSelf: 'stretch', gap: spacing.md, maxWidth: 420, width: '100%' },
  btn: { paddingVertical: spacing.md, borderRadius: radius.pill, alignItems: 'center' },
  btnPrimary: { backgroundColor: palette.accent },
});
