import { useState } from 'react';
import { FlatList, TVFocusGuideView, View, type ListRenderItem } from 'react-native';

import type { Memory } from '@/core';
import { IS_TV } from '@/core/tv';
import { useContentAutofocus } from '@/hooks/useContentAutofocus';

import { metrics, spacing } from '@/theme';
import { MemoryCard } from './MemoryCard';
import { SectionHeader } from '../ui/SectionHeader';

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
  // Freeze the autofocus decision at mount: only claim initial focus when the
  // content (not the rail) owns focus at the moment this screen appears. This is
  // what keeps tab-switching from yanking focus off the rail — see
  // `ContentAutofocusContext`.
  const [mayClaimFocus] = useState(useContentAutofocus());
  const renderItem: ListRenderItem<Memory> = ({ item, index }) => (
    <MemoryCard
      memory={item}
      onPress={() => onSelect(item)}
      hasTVPreferredFocus={preferFirstFocus && index === 0 && mayClaimFocus}
    />
  );

  const Frame = IS_TV ? TVFocusGuideView : View;
  const frameProps = IS_TV ? { autoFocus: true } : {};

  return (
    <View>
      <SectionHeader title={title} subtitle={subtitle} />
      {/* Full-bleed: cancel the screen's horizontal padding so a focused card at
          the edge can scale up without the list frame clipping it ("black bar").
          The inset is reapplied as content padding, and extra vertical padding
          leaves room for the focus scale.

          On TV this full-width frame is an `autoFocus` guide so vertical
          navigation between swimlanes is robust to uneven row lengths: pressing
          Up/Down from a card with no card directly above/below it (e.g. the 4th
          card of a 5-card row, above a 2-card row) still lands in the adjacent
          lane — the guide attracts the search across the full width and homes
          onto that lane's last-focused card. */}
      <Frame style={{ marginHorizontal: -metrics.screenPad }} {...frameProps}>
        <FlatList
          horizontal
          data={memories}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: metrics.railGap,
            paddingHorizontal: metrics.screenPad,
            paddingVertical: metrics.isTV ? spacing.lg : spacing.sm,
          }}
        />
      </Frame>
    </View>
  );
}
