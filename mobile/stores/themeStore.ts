import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type ThemeMode = 'dark' | 'light';

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  loadThemePreference: () => Promise<void>;
}

const THEME_KEY = 'kontrol_app_theme_mode';

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'dark',
  setThemeMode: async (mode: ThemeMode) => {
    set({ themeMode: mode });
    try {
      await SecureStore.setItemAsync(THEME_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  },
  loadThemePreference: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      if (saved === 'dark' || saved === 'light') {
        set({ themeMode: saved });
      }
    } catch (e) {
      console.warn('Failed to load theme preference:', e);
    }
  },
}));
