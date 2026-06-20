/**
 * Recently-viewed store.
 *
 * The interesting logic (dedupe, cap, ordering) lives in the pure, unit-tested
 * `recordView` in `@/core`. This store is a thin, persisted shell around it:
 * Zustand for ergonomics, AsyncStorage so history survives app restarts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { recordView, type RecentView } from '@/core';

interface RecentlyViewedState {
  history: RecentView[];
  /** Whether persisted history has finished rehydrating from disk. */
  hydrated: boolean;
  recordView: (id: string) => void;
  clear: () => void;
}

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      history: [],
      hydrated: false,
      recordView: (id) => set({ history: recordView(get().history, id, Date.now()) }),
      clear: () => set({ history: [] }),
    }),
    {
      name: 'legacybox.recently-viewed.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the data, never the action functions or the hydration flag.
      partialize: (state) => ({ history: state.history }),
      onRehydrateStorage: () => () => {
        useRecentlyViewed.setState({ hydrated: true });
      },
    },
  ),
);
