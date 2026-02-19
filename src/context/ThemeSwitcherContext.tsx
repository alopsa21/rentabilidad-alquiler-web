import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { themeAnterior, themeActual, getStoredTheme, setStoredTheme, type ThemeVariant } from '../theme';

interface ThemeSwitcherContextValue {
  variant: ThemeVariant;
  setVariant: (v: ThemeVariant) => void;
  theme: Theme;
}

const ThemeSwitcherContext = createContext<ThemeSwitcherContextValue | null>(null);

export function ThemeSwitcherProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariantState] = useState<ThemeVariant>(getStoredTheme);
  const theme = variant === 'anterior' ? themeAnterior : themeActual;

  const setVariant = useCallback((v: ThemeVariant) => {
    setVariantState(v);
    setStoredTheme(v);
  }, []);

  useEffect(() => {
    setVariantState(getStoredTheme());
  }, []);

  return (
    <ThemeSwitcherContext.Provider value={{ variant, setVariant, theme }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeSwitcherContext.Provider>
  );
}

export function useThemeSwitcher() {
  const ctx = useContext(ThemeSwitcherContext);
  if (!ctx) throw new Error('useThemeSwitcher must be used within ThemeSwitcherProvider');
  return ctx;
}
