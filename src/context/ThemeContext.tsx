import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeStorage } from '../lib/utils';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    try {
      safeStorage.set('unlckd_theme', 'dark');
    } catch {
      // ignore
    }

    const root = document.documentElement;
    root.classList.remove('light-theme');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isLight: theme === 'light', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      theme: 'dark',
      isLight: false,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
};
