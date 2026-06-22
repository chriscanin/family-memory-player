/**
 * Favorites store.
 *
 * Like the recently-viewed store, the interesting logic (toggle, ordering)
 * lives in pure, unit-tested `@/core`; this is a thin persisted shell. Favorites
 * are local and independent of auth — a guest can favorite, and favorites
 * survive sign-in/out.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toggleFavorite, type FavoriteEntry } from '@/core';

interface FavoritesState {
  favorites: FavoriteEntry[];
  /** Whether persisted favorites have finished rehydrating from disk. */
  hydrated: boolean;
  toggle: (id: string) => void;
  clear: () => void;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      hydrated: false,
      toggle: (id) => set({ favorites: toggleFavorite(get().favorites, id, Date.now()) }),
      clear: () => set({ favorites: [] }),
    }),
    {
      name: 'legacybox.favorites.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ favorites: state.favorites }),
      onRehydrateStorage: () => () => {
        useFavorites.setState({ hydrated: true });
      },
    },
  ),
);
