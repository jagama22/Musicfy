import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { plainStorage } from '@/utils/storage';

/** 0 = original (sin transcodificar). */
export type Bitrate = 0 | 96 | 128 | 192 | 256 | 320;

export interface RecentSearch {
  kind: 'song' | 'album' | 'artist' | 'playlist';
  id: string;
  title: string;
  subtitle?: string;
  coverArt?: string;
}

interface SettingsState {
  maxBitrate: Bitrate;
  recentSearches: RecentSearch[];
  setMaxBitrate: (b: Bitrate) => void;
  addRecentSearch: (r: RecentSearch) => void;
  removeRecentSearch: (id: string) => void;
  clearRecentSearches: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      maxBitrate: 0,
      recentSearches: [],
      setMaxBitrate: (maxBitrate) => set({ maxBitrate }),
      addRecentSearch: (r) =>
        set((s) => ({
          recentSearches: [r, ...s.recentSearches.filter((x) => x.id !== r.id)].slice(0, 20),
        })),
      removeRecentSearch: (id) =>
        set((s) => ({ recentSearches: s.recentSearches.filter((x) => x.id !== id) })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    { name: 'musicfy-settings', storage: createJSONStorage(() => plainStorage) },
  ),
);
