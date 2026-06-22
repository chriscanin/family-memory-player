import { StyleSheet, useWindowDimensions, View } from 'react-native';

import type { Memory } from '@/core';
import { MemoryCard } from './MemoryCard';
import { metrics, spacing } from '@/theme';

interface MemoryGridProps {
  memories: Memory[];
  onSelect: (memory: Memory) => void;
}

/**
 * Responsive handheld grid: 2 columns on phones, 3 on wider/tablet widths.
 * With a handful of memories a wrapping View is simpler than a virtualized
 * list; at library scale this would become a FlatList (noted in the README).
 */
export function MemoryGrid({ memories, onSelect }: MemoryGridProps) {
  const { width } = useWindowDimensions();
  const columns = width >= 680 ? 3 : 2;
  const gap = spacing.md;
  const available = width - metrics.screenPad * 2 - gap * (columns - 1);
  const cardWidth = Math.floor(available / columns);

  return (
    <View style={[styles.grid, { gap }]}>
      {memories.map((memory) => (
        <MemoryCard key={memory.id} memory={memory} width={cardWidth} onPress={() => onSelect(memory)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
