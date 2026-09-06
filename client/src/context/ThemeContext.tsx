/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type AppTheme = 'light' | 'dark' | 'bento';

interface ThemeContextType {
    theme: AppTheme;
    isDark: boolean;
    isBento: boolean;
    setTheme: (theme: AppTheme) => void;
    cycleTheme: () => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<AppTheme>(() => {
        // Check localStorage then sessionStorage
        const saved = localStorage.getItem('theme') || sessionStorage.getItem('theme');
        if (saved === 'bento' || saved === 'dark' || saved === 'light') {
            return saved;
        }
        // Check system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        // Apply theme to document
        if (theme === 'bento') {
            document.documentElement.setAttribute('data-layout', 'bento');
            document.documentElement.setAttribute('data-theme', 'bento');
            document.documentElement.classList.remove('dark');
        } else if (theme === 'dark') {
            document.documentElement.removeAttribute('data-layout');
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.removeAttribute('data-layout');
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.remove('dark');
        }

        // Save preference
        localStorage.setItem('theme', theme);
        sessionStorage.setItem('theme', theme);
    }, [theme]);

    const setTheme = (nextTheme: AppTheme) => {
        setThemeState(nextTheme);
    };

    const cycleTheme = () => {
        setThemeState(current => {
            if (current === 'light') return 'dark';
            if (current === 'dark') return 'bento';
            return 'light';
        });
    };

    const isDark = theme === 'dark';
    const isBento = theme === 'bento';

    return (
        <ThemeContext.Provider value={{ theme, isDark, isBento, setTheme, cycleTheme, toggleTheme: cycleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
