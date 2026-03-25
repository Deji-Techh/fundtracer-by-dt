import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Theme = 'dark' | 'dim' | 'light';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    isDark: boolean;
    isDim: boolean;
    isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'fundtracer_theme';

const THEMES: Theme[] = ['dark', 'dim', 'light'];

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored === 'dark' || stored === 'dim' || stored === 'light') return stored;
        return 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => {
            const currentIndex = THEMES.indexOf(prev);
            const nextIndex = (currentIndex + 1) % THEMES.length;
            return THEMES[nextIndex];
        });
    }, []);

    const value: ThemeContextType = {
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        isDim: theme === 'dim',
        isLight: theme === 'light',
    };

    return (
        <ThemeContext.Provider value={value}>
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
