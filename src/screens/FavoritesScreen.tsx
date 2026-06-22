import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { favoriteMemories, type Memory } from '@/core';
import { memoriesById } from '@/core/data/library';
import { AppText, Rail, Screen } from '@/components';
import { palette, spacing } from '@/theme';
import { IS_TV } from '@/core/tv';
import { useFavorites } from '@/hooks/useFavorites';

import { MemoryGrid } from '@/components';

/** The Favorites tab: every memory the user has hearted, newest first. */
export function FavoritesScreen() {
  const router = useRouter();
  const favorites = useFavorites((s) => s.favorites);
  const hydrated = useFavorites((s) => s.hydrated);
  const items = useMemo(() => favoriteMemories(favorites, memoriesById), [favorites]);

  const open = (memory: Memory) => router.push({ pathname: '/memory/[id]', params: { id: memory.id } });

  return (
    <Screen scroll padded edges={IS_TV ? ['top', 'bottom', 'left', 'right'] : ['top']}>
      <View style={styles.header}>
        <AppText variant="display">Favorites</AppText>
        <AppText variant="body" color={palette.textMuted}>
          {items.length > 0
            ? `${items.length} favorite${items.length === 1 ? '' : 's'}`
            : 'Tap the heart on any memory to save it here.'}
        </AppText>
      </View>

      {hydrated && items.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="favorite-border" size={IS_TV ? 88 : 64} color={palette.textFaint} />
          <AppText variant="heading" color={palette.textMuted}>
            No favorites yet
          </AppText>
        </View>
      ) : null}

      {items.length > 0 ? (
        IS_TV ? (
          <Rail title="Your favorites" memories={items} onSelect={open} preferFirstFocus={IS_TV} />
        ) : (
          <MemoryGrid memories={items} onSelect={open} />
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.md, marginBottom: spacing.xl, gap: spacing.xs },
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
});
