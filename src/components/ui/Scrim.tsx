import { StyleSheet, View, type ViewStyle } from 'react-native';

import { palette } from '@/theme';

interface ScrimProps {
  /** Which edge is darkest: `bottom` darkens downward (controls), `top` darkens
   * upward (title bar). */
  edge?: 'top' | 'bottom';
  /** Peak opacity at the dark edge. */
  max?: number;
  /** Number of bands — more is smoother. */
  bands?: number;
  /** Easing exponent for the falloff. Higher (e.g. 2) concentrates the darkness
   * tight against the edge and clears quickly; lower (e.g. 1.3) carries the
   * darkness further from the edge so text sitting away from it stays legible.
   * The title bar sits below the very top, so it wants a low power. */
  power?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * A vertical scrim approximated with stacked opacity bands — a gradient without
 * a native module (so it hot-reloads and adds no build dependency). The band
 * count is high enough (~2px steps, <0.02 alpha per step) that the stepping is
 * imperceptible: it reads as a smooth gradient, not visible bars. The `power`
 * ease keeps the dark edge from starting too abruptly. Used behind the player
 * chrome so controls and the title stay legible over bright footage.
 */
export function Scrim({ edge = 'bottom', max = 0.92, bands = 48, power = 2, style }: ScrimProps) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {Array.from({ length: bands }).map((_, i) => {
        const tTop = i / (bands - 1); // 0 at the top … 1 at the bottom
        const t = edge === 'bottom' ? tTop : 1 - tTop; // 0 (clear) … 1 (dark edge)
        return <View key={i} style={{ flex: 1, backgroundColor: palette.scrimInk, opacity: Math.pow(t, power) * max }} />;
      })}
    </View>
  );
}
