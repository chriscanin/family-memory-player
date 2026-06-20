import { FlatList, View, type ListRenderItem } from 'react-native';

import type { Memory } from '@/core';

import { metrics, spacing } from '../tokens';
import { MemoryCard } from './MemoryCard';
import { SectionHeader } from './SectionHeader';

interface RailProps {
  title: string;
  subtitle?: string;
  memories: Memory[];
  onSelect: (memory: Memory) => void;
  /** Give the first item initial TV focus (only one rail should set this). */
  preferFirstFocus?: boolean;
}

/**
 * Horizontal "swimlane" of memory cards. A FlatList so it virtualizes and, on
 * TV, the d-pad walks the row natively. The same rail is used for Recently
 * Viewed on every surface and for the main library on TV.
 */
export function Rail({ title, subtitle, memories, onSelect, preferFirstFocus = false }: RailProps) {
  const renderItem: ListRenderItem<Memory> = ({ item, index }) => (
    <MemoryCard
      memory={item}
      onPress={() => onSelect(item)}
      hasTVPreferredFocus={preferFirstFocus && index === 0}
    />
  );

  return (
    <View>
      <SectionHeader title={title} subtitle={subtitle} />
      <FlatList
        horizontal
        data={memories}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: metrics.railGap, paddingVertical: spacing.sm }}
      />
    </View>
  );
}
