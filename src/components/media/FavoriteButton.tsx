import { StyleSheet, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useFavorites } from '@/hooks/useFavorites';

import { palette, radius, spacing } from '@/theme';
import { AppText } from '../ui/AppText';
import { FocusablePressable } from '../ui/FocusablePressable';

interface FavoriteButtonProps {
  memoryId: string;
  size?: number;
  /** Extra style for the pressable (e.g. the card-overlay chip). */
  style?: ViewStyle;
  /** Show a "Favorite"/"Favorited" label beside the heart (10-foot clarity). */
  showLabel?: boolean;
  hasTVPreferredFocus?: boolean;
  onFocus?: () => void;
}

/**
 * A self-contained heart toggle bound to the favorites store. Used as a corner
 * overlay on handheld cards and as a focusable control in the detail top bar
 * (labeled on TV, where a bare corner icon is undiscoverable). As its own
 * pressable it captures the tap, so toggling never triggers the card under it.
 */
export function FavoriteButton({
  memoryId,
  size = 24,
  style,
  showLabel,
  hasTVPreferredFocus,
  onFocus,
}: FavoriteButtonProps) {
  const isFav = useFavorites((s) => s.favorites.some((f) => f.id === memoryId));
  const toggle = useFavorites((s) => s.toggle);

  return (
    <FocusablePressable
      onPress={() => toggle(memoryId)}
      onFocus={onFocus}
      hasTVPreferredFocus={hasTVPreferredFocus}
      accessibilityRole="button"
      accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
      ring={{ color: palette.focus, radius: radius.pill }}
      style={style ? [showLabel ? styles.labeled : styles.button, style] : showLabel ? styles.labeled : styles.button}
    >
      <MaterialIcons
        name={isFav ? 'favorite' : 'favorite-border'}
        size={size}
        color={isFav ? palette.favorite : palette.text}
      />
      {showLabel ? (
        <AppText variant="heading" color={isFav ? palette.favorite : palette.text}>
          {isFav ? 'Favorited' : 'Favorite'}
        </AppText>
      ) : null}
    </FocusablePressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  labeled: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
