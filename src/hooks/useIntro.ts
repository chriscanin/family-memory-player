/**
 * Tracks whether the first-run intro has played, so it shows once and not on
 * every launch. Tiny persisted flag, same idiom as the other stores.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface IntroState {
  seen: boolean;
  hydrated: boolean;
  markSeen: () => void;
  reset: () => void;
}

export const useIntro = create<IntroState>()(
  persist(
    (set) => ({
      seen: false,
      hydrated: false,
      markSeen: () => set({ seen: true }),
      reset: () => set({ seen: false }),
    }),
    {
      name: 'legacybox.intro-seen.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ seen: state.seen }),
      onRehydrateStorage: () => () => {
        useIntro.setState({ hydrated: true });
      },
    },
  ),
);
