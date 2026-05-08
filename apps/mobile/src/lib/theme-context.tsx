import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'clario_theme_preference';

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');

  useEffect(() => {
    void SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      const pref = (stored as ThemePreference | null) ?? 'system';
      setThemeState(pref);
      Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
    });
  }, []);

  function setTheme(newTheme: ThemePreference) {
    setThemeState(newTheme);
    Appearance.setColorScheme(newTheme === 'system' ? 'unspecified' : newTheme);
    void SecureStore.setItemAsync(STORAGE_KEY, newTheme);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
