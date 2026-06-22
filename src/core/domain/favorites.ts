/**
 * Favorites tracking.
 *
 * Pure, side-effect-free logic — the mirror of `recentlyViewed.ts` — so toggle,
 * ordering, and resolution can be exhaustively unit-tested without a store or a
 * renderer. The caller supplies the timestamp (`favoritedAt`) to keep it
 * deterministic.
 */

import type { Memory } from './types';

export interface FavoriteEntry {
  id: string;
  /** Epoch ms when the memory was favorited. */
  favoritedAt: number;
}

/** Whether `id` is currently a favorite. */
export function isFavorite(list: FavoriteEntry[], id: string): boolean {
  return list.some((f) => f.id === id);
}

/**
 * Returns a new list with `id` toggled: removed if present, otherwise added to
 * the front (newest-first). The input array is never mutated.
 */
export function toggleFavorite(list: FavoriteEntry[], id: string, favoritedAt: number): FavoriteEntry[] {
  if (isFavorite(list, id)) return list.filter((f) => f.id !== id);
  return [{ id, favoritedAt }, ...list];
}

/**
 * Resolves a favorites list into the matching `Memory` objects, newest-favorited
 * first. Unknown ids (e.g. a memory removed from the library) are dropped.
 */
export function favoriteMemories(list: FavoriteEntry[], byId: Map<string, Memory>): Memory[] {
  return list.map((f) => byId.get(f.id)).filter((memory): memory is Memory => memory != null);
}
