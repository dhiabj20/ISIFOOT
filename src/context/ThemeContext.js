import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { DEFAULT_THEME_MODE, THEMES, THEME_MODES } from '../theme';

const STORAGE_KEY = '@isifoot_theme_mode';

const ThemeContext = createContext({
  mode: DEFAULT_THEME_MODE,
  isDark: true,
  colors: THEMES[DEFAULT_THEME_MODE].colors,
  glass: THEMES[DEFAULT_THEME_MODE].glass,
  setThemeMode: async () => {},
  toggleThemeMode: async () => {},
});

function resolveInitialMode() {
  const system = Appearance.getColorScheme();
  if (system === THEME_MODES.light) {
    return THEME_MODES.light;
  }
  return DEFAULT_THEME_MODE;
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(resolveInitialMode);

  useEffect(() => {
    let active = true;

    const loadStoredMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) {
          return;
        }
        if (stored === THEME_MODES.dark || stored === THEME_MODES.light) {
          setMode(stored);
        }
      } catch {
        // Keep default mode if storage is unavailable.
      }
    };

    loadStoredMode();
    return () => {
      active = false;
    };
  }, []);

  const setThemeMode = useCallback(async (nextMode) => {
    if (nextMode !== THEME_MODES.dark && nextMode !== THEME_MODES.light) {
      return;
    }
    setMode(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // Best effort persistence.
    }
  }, []);

  const toggleThemeMode = useCallback(async () => {
    const next = mode === THEME_MODES.dark ? THEME_MODES.light : THEME_MODES.dark;
    await setThemeMode(next);
  }, [mode, setThemeMode]);

  const value = useMemo(() => {
    const theme = THEMES[mode] || THEMES[DEFAULT_THEME_MODE];
    return {
      mode,
      isDark: mode === THEME_MODES.dark,
      colors: theme.colors,
      glass: theme.glass,
      setThemeMode,
      toggleThemeMode,
    };
  }, [mode, setThemeMode, toggleThemeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
