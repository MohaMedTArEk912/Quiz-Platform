import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface ThemeContextType {
    isDark: boolean;
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
    const [isDark, setIsDark] = useState(() => {
        // Check localStorage first
        const saved = localStorage.getItem('theme');
        if (saved) {
            return saved === 'dark';
        }
        // Check system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        console.log('🌓 Theme useEffect triggered. isDark:', isDark);
        // Apply theme to document
        if (isDark) {
            console.log('🌙 Adding dark class to <html>');
            document.documentElement.classList.add('dark');
        } else {
            console.log('☀️ Removing dark class from <html>');
            document.documentElement.classList.remove('dark');
        }
        // Save preference
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        console.log('💾 Saved theme to localStorage:', isDark ? 'dark' : 'light');
        console.log('📋 Current html classes:', document.documentElement.className);
    }, [isDark]);

    const toggleTheme = () => {
        console.log('🎨 Toggle theme clicked! Current isDark:', isDark);
        setIsDark(!isDark);
        console.log('🎨 Setting isDark to:', !isDark);
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
