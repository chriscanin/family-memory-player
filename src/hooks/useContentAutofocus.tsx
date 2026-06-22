import { createContext, useContext } from 'react';

/**
 * Whether a freshly-mounted content screen may auto-claim TV focus on its first
 * item (via `hasTVPreferredFocus`).
 *
 * - **true** on a cold app start / direct entry: the content owns focus, so the
 *   first card should grab it and the user can start navigating immediately.
 * - **false** while the user is navigating *in the rail*: selecting a tab swaps
 *   the content behind the rail, and we want focus to **stay on the rail** (the
 *   rail stays expanded until the user explicitly steps Right into the content)
 *   — so the new screen must NOT pull focus to itself.
 *
 * Consumers read this **once at mount** (the value is frozen) because
 * `hasTVPreferredFocus` only acts on a false→true transition; a value that
 * flipped back to true later (when focus returns to the content) would otherwise
 * yank focus to the first card instead of restoring the last-focused one.
 *
 * Defaults to `true` so non-TV surfaces, tests, and screens rendered outside the
 * nav shell keep their existing behaviour.
 */
export const ContentAutofocusContext = createContext(true);

export const useContentAutofocus = () => useContext(ContentAutofocusContext);
