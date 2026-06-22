import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { recentMemories, type Memory } from '@/core';
import { memories, memoriesById } from '@/core/data/library';
import { AppText, Rail, Screen, SectionHeader } from '@/components';
import { palette, spacing } from '@/theme';
import { IS_TV } from '@/core/tv';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

import { MemoryGrid } from '@/components';

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
        <AppText variant="eyebrow" color={palette.accent}>
          Family Memory Player
        </AppText>
        {IS_TV ? (
          <AppText variant="display" italic>
            Your memories, preserved.
          </AppText>
        ) : (
          <AppText variant="display">All Memories</AppText>
        )}
        <AppText variant="caption" color={palette.textMuted}>
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
            <SectionHeader title="All memories" />
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
});
