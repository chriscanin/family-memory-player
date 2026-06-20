import { type ComponentType } from 'react';
import { FlatList, TVFocusGuideView, View, type ListRenderItem } from 'react-native';

import type { Memory } from '@/core';
import { IS_TV } from '@/platform/tv';

import { metrics, spacing } from '../tokens';
import { MemoryCard } from './MemoryCard';
import { SectionHeader } from './SectionHeader';

// On TV the rail is a focus guide with autoFocus, so moving up/down between
// rails lands on the nearest card instead of stranding focus between them.
const FocusRail: ComponentType<any> = IS_TV ? TVFocusGuideView : View;

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
      <FocusRail autoFocus={IS_TV}>
        <FlatList
          horizontal
          data={memories}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: metrics.railGap, paddingVertical: spacing.sm }}
        />
      </FocusRail>
    </View>
  );
}
