import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { recentMemories, type Memory } from '@/core';
import { memories, memoriesById } from '@/data/library';
import { AppText, palette, Rail, Screen, spacing } from '@/design-system';
import { IS_TV } from '@/platform/tv';
import { useRecentlyViewed } from '@/state/recentlyViewedStore';

import { MemoryGrid } from './MemoryGrid';

export function LibraryScreen() {
  const router = useRouter();
  const history = useRecentlyViewed((s) => s.history);
  const hydrated = useRecentlyViewed((s) => s.hydrated);
  const recents = useMemo(() => recentMemories(history, memoriesById), [history]);

  const videoCount = memories.filter((m) => m.type === 'video').length;
  const photoCount = memories.filter((m) => m.type === 'photo').length;

  const open = (memory: Memory) =>
    router.push({ pathname: '/memory/[id]', params: { id: memory.id } });

  return (
    <Screen scroll padded edges={IS_TV ? ['top', 'bottom', 'left', 'right'] : ['top']}>
      <View style={styles.header}>
        <AppText variant="display">Family Memories</AppText>
        <AppText variant="heading" color={palette.accent}>
          Preserved by Legacybox
        </AppText>
        <AppText variant="body" color={palette.textMuted}>
          {memories.length} memories · {videoCount} videos · {photoCount} photos
        </AppText>
      </View>

      {hydrated && recents.length > 0 ? (
        <View style={styles.section}>
          <Rail title="Recently viewed" memories={recents} onSelect={open} preferFirstFocus={IS_TV} />
        </View>
      ) : null}

      <View style={styles.section}>
        {IS_TV ? (
          <Rail
            title="All memories"
            memories={memories}
            onSelect={open}
            preferFirstFocus={IS_TV && recents.length === 0}
          />
        ) : (
          <>
            <AppText variant="title" style={styles.gridHeading}>
              All memories
            </AppText>
            <MemoryGrid memories={memories} onSelect={open} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.md, marginBottom: spacing.xl, gap: spacing.xs },
  section: { marginBottom: spacing.xxl },
  gridHeading: { marginBottom: spacing.md },
});
