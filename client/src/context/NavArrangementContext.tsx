import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import {
    Home,
    Compass,
    BookOpen,
    Trophy,
    Award,
    Gamepad2,
    Calendar,
    Shield,
    ShoppingBag,
    Users,
    Settings,
    BarChart3
} from 'lucide-react';
import { useAuth } from './AuthContext';

export interface NavItemDef {
    path: string;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    category?: 'core' | 'learning' | 'multiplayer' | 'social' | 'system';
}

export const ALL_NAV_REGISTRY: Record<string, NavItemDef> = {
    '/': {
        path: '/',
        label: 'Home',
        shortLabel: 'Home',
        icon: Home,
        description: 'Dashboard, daily overview & quick start',
        category: 'core'
    },
    '/tracks': {
        path: '/tracks',
        label: 'Skill Tracks',
        shortLabel: 'Tracks',
        icon: Compass,
        description: 'Guided curriculum trees & learning roads',
        category: 'learning'
    },
    '/study': {
        path: '/study',
        label: 'Study Cards',
        shortLabel: 'Study',
        icon: BookOpen,
        description: 'Spaced repetition flashcards & rapid review',
        category: 'learning'
    },
    '/tournaments': {
        path: '/tournaments',
        label: 'Arenas & Cups',
        shortLabel: 'Arenas',
        icon: Trophy,
        description: 'Scheduled tournament brackets & live events',
        category: 'multiplayer'
    },
    '/leaderboard': {
        path: '/leaderboard',
        label: 'Rankings',
        shortLabel: 'Rankings',
        icon: Award,
        description: 'Global leaderboard & division standings',
        category: 'core'
    },
    '/classroom': {
        path: '/classroom',
        label: 'Live Classroom',
        shortLabel: 'Classroom',
        icon: Gamepad2,
        description: 'Turn-based live duels & classroom host games',
        category: 'multiplayer'
    },
    '/daily': {
        path: '/daily',
        label: 'Daily Challenge',
        shortLabel: 'Daily',
        icon: Calendar,
        description: 'Daily quests, word puzzles & streak bonuses',
        category: 'core'
    },
    '/clans': {
        path: '/clans',
        label: 'Clans & Guilds',
        shortLabel: 'Clans',
        icon: Shield,
        description: 'Guild alliances, emblem studio & clan XP',
        category: 'social'
    },
    '/shop': {
        path: '/shop',
        label: 'Reward Shop',
        shortLabel: 'Shop',
        icon: ShoppingBag,
        description: 'Avatars, titles, badges & power-ups',
        category: 'core'
    },
    '/social': {
        path: '/social',
        label: 'Social Hub',
        shortLabel: 'Social',
        icon: Users,
        description: 'Friends directory & direct 1v1 challenge duel',
        category: 'social'
    },
    '/analytics': {
        path: '/analytics',
        label: 'Analytics & Stats',
        shortLabel: 'Analytics',
        icon: BarChart3,
        description: 'Performance radar, score trends & accuracy',
        category: 'learning'
    },
    '/admin': {
        path: '/admin',
        label: 'Admin Console',
        shortLabel: 'Admin',
        icon: Settings,
        description: 'System management, questions & users',
        category: 'system'
    }
};

export const DEFAULT_PRIMARY_PATHS = ['/', '/tracks', '/study', '/tournaments', '/leaderboard'];
export const DEFAULT_SECONDARY_PATHS = ['/classroom', '/daily', '/clans', '/shop', '/social', '/analytics'];

export interface NavArrangementConfig {
    primaryPaths: string[];
    secondaryPaths: string[];
    hiddenPaths: string[];
    syncWithBottomNav: boolean;
}

export type PresetKey = 'default' | 'competitor' | 'scholar' | 'completionist';

export const NAV_PRESETS: Record<PresetKey, { title: string; description: string; primary: string[]; secondary: string[] }> = {
    default: {
        title: 'Platform Balanced (Default)',
        description: 'Standard balance between curriculum, study, arenas, and leaderboards',
        primary: ['/', '/tracks', '/study', '/tournaments', '/leaderboard'],
        secondary: ['/classroom', '/daily', '/clans', '/shop', '/social', '/analytics']
    },
    competitor: {
        title: '⚔️ Arenas & Clans',
        description: 'Optimized for players focused on duels, clan wars, and leaderboard climbing',
        primary: ['/', '/tournaments', '/clans', '/social', '/leaderboard'],
        secondary: ['/daily', '/tracks', '/study', '/classroom', '/shop', '/analytics']
    },
    scholar: {
        title: '📚 Academic & Study',
        description: 'Focused on tracks, study flashcards, classroom duels, and analytics',
        primary: ['/', '/study', '/tracks', '/classroom', '/analytics'],
        secondary: ['/daily', '/tournaments', '/leaderboard', '/clans', '/shop', '/social']
    },
    completionist: {
        title: '⭐ Daily & Rewards',
        description: 'Tailored for streak hunters, shop collectors, and daily quest grinders',
        primary: ['/', '/daily', '/shop', '/tracks', '/leaderboard'],
        secondary: ['/tournaments', '/clans', '/social', '/study', '/classroom', '/analytics']
    }
};

interface NavArrangementContextType {
    config: NavArrangementConfig;
    isCustomizerOpen: boolean;
    openCustomizer: () => void;
    closeCustomizer: () => void;
    primaryItems: NavItemDef[];
    secondaryItems: NavItemDef[];
    hiddenItems: NavItemDef[];
    bottomNavItems: NavItemDef[];
    allAvailableItems: NavItemDef[];
    movePrimaryItem: (index: number, direction: 'left' | 'right') => void;
    moveSecondaryItem: (index: number, direction: 'up' | 'down') => void;
    pinToPrimary: (path: string, targetIndex?: number) => void;
    unpinToSecondary: (path: string, targetIndex?: number) => void;
    toggleHideItem: (path: string) => void;
    setSyncWithBottomNav: (sync: boolean) => void;
    applyPreset: (presetKey: PresetKey) => void;
    resetToDefault: () => void;
}

const NavArrangementContext = createContext<NavArrangementContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useNavArrangement = () => {
    const context = useContext(NavArrangementContext);
    if (!context) {
        throw new Error('useNavArrangement must be used within a NavArrangementProvider');
    }
    return context;
};

export const NavArrangementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const storageKey = currentUser?.userId ? `quiz_nav_config_${currentUser.userId}` : 'quiz_nav_config_guest';

    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

    // Initial load from localStorage
    const [config, setConfig] = useState<NavArrangementConfig>(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.primaryPaths) && Array.isArray(parsed.secondaryPaths)) {
                    return {
                        primaryPaths: parsed.primaryPaths,
                        secondaryPaths: parsed.secondaryPaths,
                        hiddenPaths: Array.isArray(parsed.hiddenPaths) ? parsed.hiddenPaths : [],
                        syncWithBottomNav: parsed.syncWithBottomNav ?? true
                    };
                }
            }
        } catch {
            // Ignore parse errors
        }

        return {
            primaryPaths: DEFAULT_PRIMARY_PATHS,
            secondaryPaths: DEFAULT_SECONDARY_PATHS,
            hiddenPaths: [],
            syncWithBottomNav: true
        };
    });

    // Save to localStorage whenever config or storageKey changes
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(config));
        } catch {
            // Ignore quota issues
        }
    }, [config, storageKey]);

    // Available items filtered by role
    const allAvailableItems = useMemo(() => {
        const paths = Object.keys(ALL_NAV_REGISTRY);
        return paths
            .filter(path => path !== '/admin' || isAdmin)
            .map(path => ALL_NAV_REGISTRY[path])
            .filter((item): item is NavItemDef => Boolean(item));
    }, [isAdmin]);

    // Resolve primary items
    const primaryItems = useMemo(() => {
        return config.primaryPaths
            .filter(path => !config.hiddenPaths.includes(path))
            .filter(path => path !== '/admin' || isAdmin)
            .map(path => ALL_NAV_REGISTRY[path])
            .filter((item): item is NavItemDef => Boolean(item));
    }, [config.primaryPaths, config.hiddenPaths, isAdmin]);

    // Resolve secondary items ("More" dropdown)
    const secondaryItems = useMemo(() => {
        const explicitSecondary = config.secondaryPaths
            .filter(path => !config.primaryPaths.includes(path))
            .filter(path => !config.hiddenPaths.includes(path))
            .filter(path => path !== '/admin' || isAdmin)
            .map(path => ALL_NAV_REGISTRY[path])
            .filter((item): item is NavItemDef => Boolean(item));

        // Always ensure admin console appears if admin and not already placed
        if (isAdmin && !config.primaryPaths.includes('/admin') && !config.secondaryPaths.includes('/admin') && !config.hiddenPaths.includes('/admin')) {
            explicitSecondary.push(ALL_NAV_REGISTRY['/admin']);
        }

        return explicitSecondary;
    }, [config.secondaryPaths, config.primaryPaths, config.hiddenPaths, isAdmin]);

    // Resolve hidden items
    const hiddenItems = useMemo(() => {
        return config.hiddenPaths
            .filter(path => path !== '/admin' || isAdmin)
            .map(path => ALL_NAV_REGISTRY[path])
            .filter((item): item is NavItemDef => Boolean(item));
    }, [config.hiddenPaths, isAdmin]);

    // Resolve Mobile Bottom Nav Items
    const bottomNavItems = useMemo(() => {
        if (!config.syncWithBottomNav) {
            // Default 4 core paths + profile
            return [
                ALL_NAV_REGISTRY['/'],
                ALL_NAV_REGISTRY['/tracks'],
                ALL_NAV_REGISTRY['/tournaments'],
                ALL_NAV_REGISTRY['/leaderboard']
            ].filter((i): i is NavItemDef => Boolean(i));
        }

        // Take the user's customized primary items (up to 4 items)
        const userSelection = primaryItems.slice(0, 4);
        if (userSelection.length < 4) {
            // Backfill from secondary if primary has fewer than 4 items
            const needed = 4 - userSelection.length;
            const fillers = secondaryItems.slice(0, needed);
            return [...userSelection, ...fillers];
        }
        return userSelection;
    }, [config.syncWithBottomNav, primaryItems, secondaryItems]);

    // Reorder Primary Items (Left / Right)
    const movePrimaryItem = useCallback((index: number, direction: 'left' | 'right') => {
        setConfig(prev => {
            const list = [...prev.primaryPaths];
            const targetIndex = direction === 'left' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= list.length) return prev;

            const temp = list[index];
            list[index] = list[targetIndex];
            list[targetIndex] = temp;

            return { ...prev, primaryPaths: list };
        });
    }, []);

    // Reorder Secondary Items (Up / Down)
    const moveSecondaryItem = useCallback((index: number, direction: 'up' | 'down') => {
        setConfig(prev => {
            const list = [...prev.secondaryPaths];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= list.length) return prev;

            const temp = list[index];
            list[index] = list[targetIndex];
            list[targetIndex] = temp;

            return { ...prev, secondaryPaths: list };
        });
    }, []);

    // Pin a tab to Primary Bar (Max 6 to prevent layout overflow)
    const pinToPrimary = useCallback((path: string, targetIndex?: number) => {
        setConfig(prev => {
            if (prev.primaryPaths.includes(path)) return prev;
            if (prev.primaryPaths.length >= 7) {
                return prev; // Cap at 7 items max
            }

            const newPrimary = [...prev.primaryPaths];
            if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= newPrimary.length) {
                newPrimary.splice(targetIndex, 0, path);
            } else {
                newPrimary.push(path);
            }

            const newSecondary = prev.secondaryPaths.filter(p => p !== path);
            const newHidden = prev.hiddenPaths.filter(p => p !== path);

            return {
                ...prev,
                primaryPaths: newPrimary,
                secondaryPaths: newSecondary,
                hiddenPaths: newHidden
            };
        });
    }, []);

    // Unpin a tab to Secondary ("More" Dropdown)
    const unpinToSecondary = useCallback((path: string, targetIndex?: number) => {
        setConfig(prev => {
            if (prev.primaryPaths.length <= 1) {
                return prev; // Keep at least 1 primary tab (e.g. Home)
            }

            const newPrimary = prev.primaryPaths.filter(p => p !== path);
            const newSecondary = [...prev.secondaryPaths.filter(p => p !== path)];

            if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= newSecondary.length) {
                newSecondary.splice(targetIndex, 0, path);
            } else {
                newSecondary.push(path);
            }

            return {
                ...prev,
                primaryPaths: newPrimary,
                secondaryPaths: newSecondary
            };
        });
    }, []);

    // Toggle Hide Item
    const toggleHideItem = useCallback((path: string) => {
        setConfig(prev => {
            const isHidden = prev.hiddenPaths.includes(path);
            if (isHidden) {
                // Unhide -> Put back into secondary
                return {
                    ...prev,
                    hiddenPaths: prev.hiddenPaths.filter(p => p !== path),
                    secondaryPaths: prev.secondaryPaths.includes(path) ? prev.secondaryPaths : [...prev.secondaryPaths, path]
                };
            }

            // Cannot hide if it would leave 0 primary items
            if (prev.primaryPaths.includes(path) && prev.primaryPaths.length <= 1) {
                return prev;
            }

            return {
                ...prev,
                primaryPaths: prev.primaryPaths.filter(p => p !== path),
                secondaryPaths: prev.secondaryPaths.filter(p => p !== path),
                hiddenPaths: [...prev.hiddenPaths, path]
            };
        });
    }, []);

    // Toggle Mobile Bottom Nav Sync
    const setSyncWithBottomNav = useCallback((sync: boolean) => {
        setConfig(prev => ({ ...prev, syncWithBottomNav: sync }));
    }, []);

    // Apply Preset
    const applyPreset = useCallback((presetKey: PresetKey) => {
        const preset = NAV_PRESETS[presetKey];
        if (!preset) return;

        setConfig({
            primaryPaths: [...preset.primary],
            secondaryPaths: [...preset.secondary],
            hiddenPaths: [],
            syncWithBottomNav: true
        });
    }, []);

    // Reset to platform defaults
    const resetToDefault = useCallback(() => {
        setConfig({
            primaryPaths: [...DEFAULT_PRIMARY_PATHS],
            secondaryPaths: [...DEFAULT_SECONDARY_PATHS],
            hiddenPaths: [],
            syncWithBottomNav: true
        });
    }, []);

    const openCustomizer = useCallback(() => setIsCustomizerOpen(true), []);
    const closeCustomizer = useCallback(() => setIsCustomizerOpen(false), []);

    return (
        <NavArrangementContext.Provider
            value={{
                config,
                isCustomizerOpen,
                openCustomizer,
                closeCustomizer,
                primaryItems,
                secondaryItems,
                hiddenItems,
                bottomNavItems,
                allAvailableItems,
                movePrimaryItem,
                moveSecondaryItem,
                pinToPrimary,
                unpinToSecondary,
                toggleHideItem,
                setSyncWithBottomNav,
                applyPreset,
                resetToDefault
            }}
        >
            {children}
        </NavArrangementContext.Provider>
    );
};
