'use client';

import { createContext, useContext, useCallback, useSyncExternalStore, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme store for useSyncExternalStore
let listeners: Array<() => void> = [];
let currentTheme: Theme = 'light';

function getThemeSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return 'light';
}

function subscribeToTheme(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

function setTheme(newTheme: Theme) {
  currentTheme = newTheme;
  // Update DOM
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  }
  // Notify listeners
  listeners.forEach(l => l());
}

// Initialize theme from localStorage/system preference
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored) {
    currentTheme = stored;
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    currentTheme = 'dark';
  }
  // Apply initial theme to DOM
  document.documentElement.classList.toggle('dark', currentTheme === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
