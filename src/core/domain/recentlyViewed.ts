/**
 * Recently-viewed tracking.
 *
 * Pure, side-effect-free logic so it can be exhaustively unit-tested without a
 * store, a clock, or a renderer. The caller supplies the timestamp (`viewedAt`)
 * which keeps the function deterministic and testable.
 */

import type { Memory } from './types';

export interface RecentView {
  id: string;
  /** Epoch ms when the memory was opened. */
  viewedAt: number;
}

export const RECENTLY_VIEWED_LIMIT = 5;

/**
 * Returns a new history with `id` recorded as the most-recent view.
 *
 * Rules:
 *  - most-recent-first ordering
 *  - an id already present is moved to the front (deduped), not duplicated
 *  - the list is capped at `limit`, evicting the oldest entries
 *  - the input array is never mutated
 */
export function recordView(
  history: RecentView[],
  id: string,
  viewedAt: number,
  limit: number = RECENTLY_VIEWED_LIMIT,
): RecentView[] {
  const withoutId = history.filter((view) => view.id !== id);
  return [{ id, viewedAt }, ...withoutId].slice(0, Math.max(0, limit));
}

/**
 * Resolves a history into the matching `Memory` objects, in view order.
 * Unknown ids (e.g. a memory removed from the library) are dropped.
 */
export function recentMemories(
  history: RecentView[],
  byId: Map<string, Memory>,
): Memory[] {
  return history
    .map((view) => byId.get(view.id))
    .filter((memory): memory is Memory => memory != null);
}
