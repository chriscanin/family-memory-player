import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TVFocusGuideView, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '../ui/AppText';
import { FocusablePressable } from '../ui/FocusablePressable';
import { palette, radius, spacing } from '@/theme';

export interface NavTab {
  name: string;
  href: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

export const RAIL_COLLAPSED = 96;
const RAIL_EXPANDED = 264;

/**
 * The 10-foot left navigation rail. **Collapsed** (icons only) while focus is in
 * the content, it **expands** to show labels when the d-pad moves focus into it,
 * and collapses again when focus leaves — driven purely by focus, not a timer.
 * It overlays the content's left edge (the content is padded by `RAIL_COLLAPSED`),
 * so expanding doesn't reflow the screen. It is **not** an `autoFocus` guide — an
 * attractor there would trap focus on the rail; geometry handles content↔rail
 * (Left enters, Right leaves) since the rail sits to the left of the content.
 */
export function NavRail({
  tabs,
  activeHref,
  onNavigate,
  onActiveChange,
  focusRequest,
  forceExpanded = false,
}: {
  tabs: NavTab[];
  activeHref: string;
  onNavigate: (href: string) => void;
  /** Fires true when focus enters the rail, false when it leaves (debounced). */
  onActiveChange?: (active: boolean) => void;
  /** Bump this token to pull focus into the rail (the Back/Menu button on TV). */
  focusRequest?: number;
  /** Pin the rail open regardless of focus (e.g. while the exit dialog is up, so
   * it stays expanded behind the dialog and focus can be restored to it). */
  forceExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const focusCount = useRef(0);
  const width = useSharedValue(RAIL_COLLAPSED);
  // The rail is open when focus is in it OR it's pinned open. A ref mirrors the
  // pin so the deferred blur-collapse can read the live value.
  const isExpanded = expanded || forceExpanded;
  const forceRef = useRef(forceExpanded);
  forceRef.current = forceExpanded;

  // Don't let the rail steal initial focus from the content. The rail's items are
  // focusable synchronously, but the content's `hasTVPreferredFocus` card lives in
  // an async FlatList — so the rail would win the first-mount race. Gating the
  // items non-focusable for a beat lets the content claim initial focus; the rail
  // is then reachable by Left as normal.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  // Pulling focus onto the active tab is a ONE-SHOT, not a persistent state.
  // An explicit focus request (the Back/Menu button) remounts the guide with the
  // active item briefly carrying `hasTVPreferredFocus` so focus lands on the
  // *current* tab; `grabbing` then clears. This is critical: a *persistent*
  // hasTVPreferredFocus on the active item re-grabs focus whenever the rail tries
  // to lose it, so the rail would never collapse. (The autoFocus guide otherwise
  // homes to the last-focused tab, which is correct after the first interaction.)
  const [grabKey, setGrabKey] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const prevReq = useRef(focusRequest);
  useEffect(() => {
    if (focusRequest !== undefined && focusRequest !== prevReq.current) {
      prevReq.current = focusRequest;
      setGrabbing(true);
      setGrabKey((k) => k + 1);
    }
  }, [focusRequest]);
  // Release the one-shot once the remount has applied focus, so it can't re-grab
  // on the way out.
  useEffect(() => {
    if (!grabbing) return;
    const t = setTimeout(() => setGrabbing(false), 60);
    return () => clearTimeout(t);
  }, [grabbing, grabKey]);

  useEffect(() => {
    width.value = withTiming(isExpanded ? RAIL_EXPANDED : RAIL_COLLAPSED, { duration: 180 });
  }, [isExpanded, width]);

  const railStyle = useAnimatedStyle(() => ({ width: width.value }));

  const onItemFocus = () => {
    focusCount.current += 1;
    setExpanded(true);
    onActiveChange?.(true);
  };
  const onItemBlur = () => {
    focusCount.current -= 1;
    // Defer: moving between rail items fires blur→focus, so check after the
    // sibling's focus has run. Only collapse once focus has truly left the rail.
    setTimeout(() => {
      // Pinned open (exit dialog up): keep it expanded and stay "active" so focus
      // can be restored to the rail when the dialog closes.
      if (forceRef.current) return;
      if (focusCount.current <= 0) {
        setExpanded(false);
        onActiveChange?.(false);
      }
    }, 60);
  };

  return (
    <Animated.View style={[styles.rail, railStyle]} pointerEvents="box-none">
      {/* Full-height autoFocus attractor. The nav icons sit at the top of the
          rail, but a Left search from a lower content card would miss them (the
          focus search is a vertical cone). The guide's full-height frame
          intercepts that search and homes onto a rail item — the rail half of
          the two-guide pattern (the content guide handles the return + restore). */}
      <TVFocusGuideView autoFocus style={styles.items} key={grabKey}>
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <FocusablePressable
              key={tab.name}
              focusable={ready}
              focusScale={1}
              hasTVPreferredFocus={ready && active && grabbing}
              onFocus={onItemFocus}
              onBlur={onItemBlur}
              onPress={() => onNavigate(tab.href)}
              ring={{ color: palette.focus, radius: radius.lg }}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              style={active ? [styles.item, styles.itemActive] : styles.item}
            >
              {({ focused }) => {
                // Active route → deep-green ink on the sage fill; focused-but-inactive
                // → sage text; otherwise muted sage.
                const tint = active ? palette.accentInk : focused ? palette.accent : palette.textMuted;
                return (
                  <View style={styles.itemRow}>
                    <MaterialIcons name={tab.icon} size={30} color={tint} />
                    {isExpanded ? (
                      <AppText variant="heading" color={tint} numberOfLines={1} style={styles.label}>
                        {tab.label}
                      </AppText>
                    ) : null}
                  </View>
                );
              }}
            </FocusablePressable>
          );
        })}
      </TVFocusGuideView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // In-flow flex child (full height via the row's stretch). NOT absolutely
  // positioned: an overlay both grabs initial focus and occludes the content so
  // the rightward focus search can't reach it. As a horizontal neighbour the
  // focus engine moves Left→rail / Right→content by plain geometry.
  rail: {
    backgroundColor: palette.scrim,
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  // flex:1 makes the autoFocus guide frame span the full rail height so a Left
  // search from any content row is intercepted; the icons still sit at the top.
  items: { flex: 1, gap: spacing.sm },
  item: { borderRadius: radius.lg },
  itemActive: { backgroundColor: palette.accent },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  label: { flexShrink: 1 },
});
