import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { metrics, palette } from '../tokens';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a vertical ScrollView. */
  scroll?: boolean;
  /** Apply the surface's horizontal padding (handheld 16 / TV overscan 48). */
  padded?: boolean;
  edges?: readonly Edge[];
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
}

/** App background + safe-area frame. The one place screen chrome is defined. */
export function Screen({
  children,
  scroll = false,
  padded = false,
  edges = ['top', 'bottom'],
  contentContainerStyle,
  style,
}: ScreenProps) {
  const pad = padded
    ? {
        paddingHorizontal: metrics.screenPad,
        // TV overscan top/bottom (no-op on handheld where overscanY is 0).
        paddingTop: metrics.overscanY,
        paddingBottom: metrics.overscanY,
      }
    : null;

  return (
    <View style={[styles.root, style]}>
      <SafeAreaView style={styles.flex} edges={edges}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[pad, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, pad, contentContainerStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
});
