import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppText, FocusablePressable, Screen } from '@/components';
import { palette, radius, spacing } from '@/theme';
import { IS_TV } from '@/core/tv';
import { useFavorites } from '@/hooks/useFavorites';
import { useIntro } from '@/hooks/useIntro';

/**
 * Profile tab. The app is guest-first — there is no account system — so this is a
 * simple summary: a guest identity, the favorites saved on this device, and a way
 * to replay the first-run intro.
 */
export function ProfileScreen() {
  const favCount = useFavorites((s) => s.favorites.length);
  const replayIntro = useIntro((s) => s.reset);

  return (
    <Screen scroll padded edges={IS_TV ? ['top', 'bottom', 'left', 'right'] : ['top']} contentContainerStyle={styles.root}>
      <View style={styles.header}>
        <AppText variant="display">Profile</AppText>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <MaterialIcons name="person-outline" size={IS_TV ? 56 : 44} color={palette.accent} />
        </View>
        <View style={styles.identity}>
          <AppText variant="title">Guest</AppText>
          <AppText variant="body" color={palette.textMuted}>
            {favCount} favorite{favCount === 1 ? '' : 's'} on this device
          </AppText>
        </View>
      </View>

      <View style={styles.note}>
        <MaterialIcons name="info-outline" size={20} color={palette.textMuted} />
        <AppText variant="body" color={palette.textMuted} style={styles.noteText}>
          Favorites and recently-viewed are kept locally on this device.
        </AppText>
      </View>

      <FocusablePressable
        onPress={replayIntro}
        focusScale={1}
        style={styles.replay}
        accessibilityLabel="Replay the intro"
      >
        <AppText variant="body" color={palette.textFaint}>
          Replay intro
        </AppText>
      </FocusablePressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Screen provides the safe-area frame + horizontal padding; this just spaces
  // the sections and adds a little breathing room under the safe-area inset.
  root: { paddingTop: spacing.lg, gap: spacing.xl },
  header: { gap: spacing.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    maxWidth: 560,
  },
  avatar: {
    width: IS_TV ? 96 : 76,
    height: IS_TV ? 96 : 76,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flex: 1, gap: spacing.xs },
  note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', maxWidth: 560 },
  noteText: { flex: 1 },
  replay: { paddingVertical: spacing.sm, alignSelf: 'flex-start' },
});
