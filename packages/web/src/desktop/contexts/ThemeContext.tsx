import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'dim' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_ORDER: Theme[] = ['dark', 'dim', 'light'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('fundtracer_theme');
      if (saved === 'dark' || saved === 'dim' || saved === 'light') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('fundtracer_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => setThemeState(t => {
    const idx = THEME_ORDER.indexOf(t);
    return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
  });
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { ThemeContext };
