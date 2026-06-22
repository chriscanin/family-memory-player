import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  StyleSheet,
  TVFocusGuideView,
  TVEventControl,
  useTVEventHandler,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { AppText, FocusablePressable } from '../ui';
import { NavRail, type NavTab } from './NavRail';
import { palette, radius, spacing } from '@/theme';
import { ContentAutofocusContext } from '@/hooks/useContentAutofocus';

/**
 * The 10-foot navigation shell: a collapsible left rail beside the active tab's
 * content, with TV-specific focus behaviour the d-pad demands.
 *
 * - **Left** out of the content → the rail (geometry; the rail is the left
 *   neighbour) which expands on focus.
 * - **Back/Menu** from the content → also opens the rail (we pull focus in).
 * - **Selecting a tab** in the rail keeps focus **on the rail** (it stays
 *   expanded until you step Right into the content) — every tab behaves the
 *   same, the destination screen does not yank focus to itself.
 * - **Back/Menu** from the rail → an **exit confirmation** dialog, shown over the
 *   still-expanded rail.
 * - **Back/Menu** (or **Stay**) while the dialog is up → dismiss it and restore
 *   focus to the rail; only the in-dialog **Exit** button quits the app.
 * - **Right** back into the content → focus is **restored** to the item you left,
 *   because the content is wrapped in an `autoFocus` `TVFocusGuideView` (it
 *   re-homes to its last-focused descendant).
 * - On the player route (pushed above this shell) Back simply navigates back.
 *
 * `TVEventControl.enableTVMenuKey()` stops the tvOS Menu button from quitting the
 * app so we can route it ourselves (via `useTVEventHandler`); Android TV's Back
 * button is routed the same way via `BackHandler`. The exit dialog is the only
 * path that quits.
 */
export function TvNavShell({ tabs, children }: { tabs: NavTab[]; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [railActive, setRailActive] = useState(false);
  const [focusReq, setFocusReq] = useState(0);
  const [exitVisible, setExitVisible] = useState(false);
  const railActiveRef = useRef(false);
  const exitRef = useRef(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    TVEventControl.enableTVMenuKey();
    return () => TVEventControl.disableTVMenuKey();
  }, []);

  const setRail = (active: boolean) => {
    railActiveRef.current = active;
    setRailActive(active);
  };

  const closeExit = () => {
    exitRef.current = false;
    setExitVisible(false);
    // The rail stayed expanded behind the dialog — pull focus back onto it so the
    // user lands where they were, rather than dropping focus.
    setFocusReq((n) => n + 1);
  };

  // One Back/Menu handler for BOTH surfaces: tvOS delivers the Menu key through
  // `useTVEventHandler('menu')`; Android TV delivers Back through `BackHandler`.
  // A single press can fire both, so we debounce. Kept in a ref so the
  // once-registered BackHandler always runs the latest logic.
  const lastBack = useRef(0);
  const handleBackRef = useRef<() => boolean>(() => false);
  handleBackRef.current = () => {
    const now = Date.now();
    if (now - lastBack.current < 150) return true; // dedupe the double-fire
    lastBack.current = now;
    // On the full-screen player (pushed above the shell), Back = navigate back.
    if (pathRef.current?.startsWith('/memory')) {
      router.back();
      return true;
    }
    if (exitRef.current) {
      // The dialog is up: Back/Menu just dismisses it (only the in-dialog "Exit"
      // button quits the app) and restores focus to the rail.
      closeExit();
      return true;
    }
    if (railActiveRef.current) {
      // Back from the rail → confirm exit (the rail stays expanded behind it).
      exitRef.current = true;
      setExitVisible(true);
    } else {
      // Back from content → open the rail (pull focus into it).
      setFocusReq((n) => n + 1);
    }
    return true;
  };

  useTVEventHandler((evt) => {
    if (evt?.eventType === 'menu') handleBackRef.current();
  });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => handleBackRef.current());
    return () => sub.remove();
  }, []);

  return (
    // row-reverse: the content is the FIRST child (so it wins initial focus over
    // the rail, whose items are otherwise the first synchronous focusables) but
    // still renders on the RIGHT, with the rail on the left.
    <View style={styles.root}>
      {/* Content half of the two-guide pattern: full-height autoFocus attractor.
          A Right search from a rail icon is pulled back into the content and
          re-homed onto the last-focused item (focus restoration). The provider
          tells a freshly-mounted screen whether it may grab focus: only when the
          rail is NOT active (cold start), so switching tabs keeps focus on the
          rail. */}
      <ContentAutofocusContext.Provider value={!railActive}>
        <TVFocusGuideView style={styles.content} autoFocus>
          {children}
        </TVFocusGuideView>
      </ContentAutofocusContext.Provider>
      <NavRail
        tabs={tabs}
        activeHref={pathname}
        onNavigate={(href) => router.navigate(href as never)}
        onActiveChange={setRail}
        focusRequest={focusReq}
        forceExpanded={exitVisible}
      />

      {/* Exit confirmation — an in-tree overlay, NOT a `Modal`. A Modal is a
          separate native window on tvOS where the Menu key escapes
          `enableTVMenuKey` and reverts to backgrounding the app; keeping the
          dialog in the same window lets the Back/Menu handler above dismiss it,
          and lets the rail stay expanded (and re-focusable) behind it. */}
      {exitVisible ? <ExitDialog onStay={closeExit} onExit={() => BackHandler.exitApp()} /> : null}
    </View>
  );
}

/**
 * The exit-confirmation dialog as an in-tree overlay. Because it is NOT a Modal
 * (which would present a view controller that auto-focuses its content), a plain
 * overlay does not pull focus when it appears — focus stays on the rail behind
 * it. So we claim focus explicitly: `hasTVPreferredFocus` is flipped false→true
 * one tick *after* mount, once the buttons are in the view hierarchy. Mounting
 * with it already true is evaluated too early and the rail keeps focus.
 * `trapFocus*` then keeps the d-pad inside the dialog.
 */
function ExitDialog({ onStay, onExit }: { onStay: () => void; onExit: () => void }) {
  const [claimFocus, setClaimFocus] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setClaimFocus(true), 50);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.overlayScrim} />
      <TVFocusGuideView
        style={styles.dialog}
        autoFocus
        trapFocusUp
        trapFocusDown
        trapFocusLeft
        trapFocusRight
      >
        <AppText variant="title">Exit Family Memory Player?</AppText>
        <AppText variant="body" color={palette.textMuted} style={styles.dialogBody}>
          You can reopen it any time from the Home screen.
        </AppText>
        <View style={styles.dialogRow}>
          <FocusablePressable
            hasTVPreferredFocus={claimFocus}
            onPress={onStay}
            ring={{ color: palette.focus, radius: radius.pill }}
            style={[styles.dialogBtn, styles.dialogCancel]}
            accessibilityLabel="Stay in the app"
          >
            <AppText variant="heading">Stay</AppText>
          </FocusablePressable>
          <FocusablePressable
            onPress={onExit}
            ring={{ color: palette.focus, radius: radius.pill }}
            style={[styles.dialogBtn, styles.dialogExit]}
            accessibilityLabel="Exit the app"
          >
            <AppText variant="heading" color={palette.accentInk}>
              Exit
            </AppText>
          </FocusablePressable>
        </View>
      </TVFocusGuideView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row-reverse', backgroundColor: palette.bg },
  content: { flex: 1 },
  // Full-screen overlay above the content + rail. The scrim dims everything
  // (the expanded rail stays visible, dimmed, behind the centered dialog).
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlayScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: palette.scrim },
  dialog: {
    width: 520,
    padding: spacing.xxl,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceHi,
    gap: spacing.sm,
  },
  dialogBody: { marginBottom: spacing.lg },
  dialogRow: { flexDirection: 'row', gap: spacing.md },
  dialogBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  dialogCancel: { backgroundColor: palette.surface },
  dialogExit: { backgroundColor: palette.accent },
});
