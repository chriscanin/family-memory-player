import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, useTVEventHandler } from 'react-native';
import Animated, { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { FocusablePressable } from '../ui';
import { IS_TV } from '@/core/tv';

/** How long the chrome stays up after the last interaction before it fades. */
const HIDE_MS = 5000;
const FADE_OUT_MS = 260;
const FADE_IN_MS = 180;

interface PlayerChromeValue {
  /** Whether the chrome is in the tree (stays true through the fade-out so the
   * controls can animate before they unmount). Render chrome only when true. */
  rendered: boolean;
  /** Shared opacity for every chrome layer (top bar + bottom controls). Each
   * consumer builds its own `useAnimatedStyle` from this so the fade is shared. */
  chromeOpacity: SharedValue<number>;
  /** Show the chrome and (if auto-hide is armed) restart the hide timer. */
  reveal: () => void;
  /** Fade the chrome out now, regardless of the timer (handheld tap-to-hide). */
  hide: () => void;
  /** Arm/disarm the inactivity auto-hide. Disarming (paused / ended / photo)
   * keeps the chrome up; arming (playing) starts the countdown. */
  setAutoHide: (enabled: boolean) => void;
  /** A chrome control records itself as focused (so it can be restored on the
   * next reveal). */
  noteFocus: (key: string) => void;
  /** On (re)mount, the control matching the last-focused key reclaims focus; if
   * nothing was focused yet, the `isDefault` control (play/pause) does. */
  isRestoreTarget: (key: string, isDefault: boolean) => boolean;
}

const PlayerChromeContext = createContext<PlayerChromeValue | null>(null);

/**
 * Owns the show/hide lifecycle of the player chrome and — critically — keeps the
 * tvOS focus invariant intact while the chrome is hidden.
 *
 * On TV, hidden controls would mean *no focusable element* and focus would be
 * lost (the exact failure class we fixed in the focus spec). So while hidden we
 * mount a single full-screen **reveal catcher** that owns focus, and a global
 * `useTVEventHandler` brings the chrome back on *any* remote action. On handheld
 * there is no focus engine, so the catcher isn't needed — a tap on the video
 * layer reveals.
 */
export function PlayerChromeProvider({ children }: { children: ReactNode }) {
  const opacity = useSharedValue(1);
  const [rendered, setRendered] = useState(true);
  const renderedRef = useRef(true);
  const autoHide = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The chrome control that last held focus. The reveal catcher is not a chrome
  // control and never calls noteFocus, so this survives the hidden state and the
  // remount on reveal restores it (instead of always snapping to play/pause).
  const lastFocusKey = useRef<string | null>(null);

  const noteFocus = useCallback((key: string) => {
    lastFocusKey.current = key;
  }, []);
  const isRestoreTarget = useCallback(
    (key: string, isDefault: boolean) => (lastFocusKey.current ? lastFocusKey.current === key : isDefault),
    [],
  );

  const setRenderedSafe = useCallback((v: boolean) => {
    renderedRef.current = v;
    setRendered(v);
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    opacity.value = withTiming(0, { duration: FADE_OUT_MS });
    // Unmount the chrome only after it has finished fading, so the catcher (TV)
    // takes focus the instant the controls leave the tree — never a gap.
    timer.current = setTimeout(() => setRenderedSafe(false), FADE_OUT_MS);
  }, [clearTimer, opacity, setRenderedSafe]);

  const reveal = useCallback(() => {
    clearTimer();
    setRenderedSafe(true);
    opacity.value = withTiming(1, { duration: FADE_IN_MS });
    if (autoHide.current) timer.current = setTimeout(hide, HIDE_MS);
  }, [clearTimer, hide, opacity, setRenderedSafe]);

  const setAutoHide = useCallback(
    (enabled: boolean) => {
      autoHide.current = enabled;
      clearTimer();
      if (enabled) {
        timer.current = setTimeout(hide, HIDE_MS);
      } else {
        // Disarmed → make sure the chrome is up and stays up.
        setRenderedSafe(true);
        opacity.value = withTiming(1, { duration: FADE_IN_MS });
      }
    },
    [clearTimer, hide, opacity, setRenderedSafe],
  );

  // TV only: any remote action while hidden reveals the chrome. This is what
  // makes "take some action to bring it back" work for d-pad presses that don't
  // move focus (there's only the catcher to focus).
  useTVEventHandler((evt) => {
    if (!IS_TV || !evt) return;
    if (!renderedRef.current) reveal();
  });

  useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <PlayerChromeContext.Provider
      value={{ rendered, chromeOpacity: opacity, reveal, hide, setAutoHide, noteFocus, isRestoreTarget }}
    >
      {children}
      {IS_TV && !rendered ? (
        <FocusablePressable
          hasTVPreferredFocus
          focusScale={1}
          onPress={reveal}
          accessibilityLabel="Show player controls"
          style={styles.catcher}
        >
          <Animated.View style={StyleSheet.absoluteFill} />
        </FocusablePressable>
      ) : null}
    </PlayerChromeContext.Provider>
  );
}

export function usePlayerChrome(): PlayerChromeValue {
  const ctx = useContext(PlayerChromeContext);
  if (!ctx) throw new Error('usePlayerChrome must be used within a PlayerChromeProvider');
  return ctx;
}

const styles = StyleSheet.create({
  catcher: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
