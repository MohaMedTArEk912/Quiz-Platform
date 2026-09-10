import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    User,
    Award,
    LogOut,
    ArrowLeft,
    Menu,
    X,
    Settings,
    ChevronDown,
    Home,
    Compass,
    BookOpen,
    Trophy,
    Calendar,
    ShoppingBag,
    Shield,
    Users,
    Sparkles
} from 'lucide-react';
import ThemeToggle from './ThemeToggle.tsx';
import NotificationCenter from './NotificationCenter.tsx';
import type { UserData } from '../types/index.ts';
import { useNavigate, useLocation } from 'react-router-dom';
import Avatar from './Avatar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
    user?: UserData | null;
    onBack?: () => void;
    onViewProfile?: () => void;
    onViewLeaderboard?: () => void;
    onLogout?: () => void;
    showBack?: boolean;
    title?: string;
    showActions?: boolean;
}

interface NavItemDef {
    path: string;
    label: string;
    shortLabel?: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
}

const PRIMARY_NAV_ITEMS: NavItemDef[] = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/tracks', label: 'Tracks', icon: Compass },
    { path: '/study', label: 'Study', icon: BookOpen },
    { path: '/tournaments', label: 'Arenas', icon: Trophy },
    { path: '/leaderboard', label: 'Rankings', icon: Award },
];

const BASE_SECONDARY_NAV_ITEMS: NavItemDef[] = [
    { path: '/daily', label: 'Daily Challenge', shortLabel: 'Daily', icon: Calendar, description: 'Daily quests & streak rewards' },
    { path: '/clans', label: 'Clans & Guilds', shortLabel: 'Clans', icon: Shield, description: 'Team challenges & squad quests' },
    { path: '/shop', label: 'Reward Shop', shortLabel: 'Shop', icon: ShoppingBag, description: 'Avatars, badges & power-ups' },
    { path: '/social', label: 'Social Hub', shortLabel: 'Social', icon: Users, description: 'Find rivals & real-time 1v1 duels' },
];

const Navbar: React.FC<NavbarProps> = ({
    user,
    onBack,
    onViewProfile,
    onViewLeaderboard,
    onLogout,
    showBack,
    title = "Quiz Platform",
    showActions = true
}) => {
    const { isBento } = useTheme();
    const { logout: authLogout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const moreDropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const isGuest = !user || user.userId === 'guest' || !user.email;
    const isRoot = location.pathname === '/' || location.pathname === '/dashboard';
    const shouldShowBack = showBack !== undefined ? showBack : !isRoot;

    // Close "More" dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
                setIsMoreOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMoreOpen(false);
            }
        };

        if (isMoreOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMoreOpen]);

    const handleProfileClick = () => {
        if (onViewProfile) onViewProfile();
        else navigate('/profile');
    };

    const handleLeaderboardClick = () => {
        if (onViewLeaderboard) onViewLeaderboard();
        else navigate('/leaderboard');
    };

    const handleLogoutClick = () => {
        if (onLogout) onLogout();
        else authLogout();
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
            return;
        }
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    const secondaryNavItems = useMemo(() => {
        const items = [...BASE_SECONDARY_NAV_ITEMS];
        if (user?.role === 'admin') {
            items.push({
                path: '/admin',
                label: 'Admin Console',
                shortLabel: 'Admin',
                icon: Settings,
                description: 'Manage quizzes, users & analytics'
            });
        }
        return items;
    }, [user?.role]);

    const allNavItems = useMemo(() => {
        return [...PRIMARY_NAV_ITEMS, ...secondaryNavItems];
    }, [secondaryNavItems]);

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/' || location.pathname === '/dashboard';
        }
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    const isSecondaryActive = useMemo(() => {
        return secondaryNavItems.some(item => isActive(item.path));
    }, [location.pathname, secondaryNavItems]);

    const activeSecondaryItem = useMemo(() => {
        return secondaryNavItems.find(item => isActive(item.path));
    }, [location.pathname, secondaryNavItems]);

    const hasClanInvites = Boolean(user?.clanInvites && user.clanInvites.length > 0);

    return (
        <header className={`sticky top-0 z-50 pt-safe pl-safe pr-safe transition-colors ${
            isBento
                ? 'bg-white text-black border-b-3 border-black shadow-[0_4px_0px_#000]'
                : 'glass-panel border-b border-slate-200/80 dark:border-white/[0.08]'
        }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
                <div className="flex items-center gap-3 justify-between">
                    {/* Left Section: Back button + Brand */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {shouldShowBack && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all text-xs sm:text-sm active:scale-95 cursor-pointer shrink-0 ${
                                    isBento
                                        ? 'bg-[#fde047] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-white/5'
                                }`}
                                title="Go back to previous page"
                                aria-label="Go back"
                            >
                                <ArrowLeft className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity text-left bg-transparent border-0 p-0"
                            aria-label="Quiz Platform Home"
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-transform active:scale-95 ${
                                isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                            }`}>
                                Q
                            </div>
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>Quiz Platform</span>
                                    {!isRoot && title && title !== "Quiz Platform" && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-600">/</span>
                                            <span className={`text-sm sm:text-base font-bold tracking-tight truncate max-w-[130px] sm:max-w-xs ${isBento ? 'text-black font-black' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                {title}
                                            </span>
                                        </>
                                    )}
                                    {(isRoot || !title || title === "Quiz Platform") && (
                                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse hidden sm:inline-block ${isBento ? 'bg-black' : 'bg-indigo-500'}`} />
                                    )}
                                </h1>
                            </div>
                        </button>
                    </div>

                    {/* Desktop Center Navigation - Segmented Pill (Clean 5 Core Tabs + More Dropdown) */}
                    <nav className={`hidden xl:flex items-center gap-1 p-1 rounded-2xl shrink-0 ${
                        isBento
                            ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                            : 'bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] shadow-inner'
                    }`}>
                        {PRIMARY_NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);

                            return (
                                <button
                                    key={item.path}
                                    type="button"
                                    onClick={() => {
                                        if (item.path === '/leaderboard') {
                                            handleLeaderboardClick();
                                        } else {
                                            navigate(item.path);
                                        }
                                    }}
                                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-150 cursor-pointer ${
                                        isBento
                                            ? (active
                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                                : 'text-black hover:bg-[#fef9c3]')
                                            : (active
                                                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm shadow-indigo-500/20 dark:shadow-indigo-600/30'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5')
                                    }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${isBento ? 'stroke-[2.5]' : (active ? 'text-indigo-600 dark:text-white' : '')}`} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}

                        {/* More Dropdown */}
                        <div className="relative" ref={moreDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsMoreOpen(prev => !prev)}
                                aria-expanded={isMoreOpen}
                                aria-haspopup="true"
                                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-150 cursor-pointer ${
                                    isBento
                                        ? (isSecondaryActive
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                            : 'text-black hover:bg-[#fef9c3]')
                                        : (isSecondaryActive
                                            ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm shadow-indigo-500/20 dark:shadow-indigo-600/30'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5')
                                }`}
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${isBento ? 'stroke-[2.5]' : (isSecondaryActive ? 'text-indigo-600 dark:text-white' : '')}`} />
                                <span>{isSecondaryActive && activeSecondaryItem ? activeSecondaryItem.shortLabel : 'More'}</span>
                                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`} />
                                {hasClanInvites && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-black"></span>
                                )}
                            </button>

                            {/* Dropdown Floating Menu */}
                            {isMoreOpen && (
                                <div className={`absolute top-full mt-2 right-0 w-60 p-2 rounded-2xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
                                    isBento
                                        ? 'bg-white border-2.5 border-black shadow-[5px_5px_0px_#000]'
                                        : 'bg-white/95 dark:bg-[#0f1422]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl'
                                }`}>
                                    {secondaryNavItems.map((item) => {
                                        const Icon = item.icon;
                                        const active = isActive(item.path);
                                        const showDot = item.path === '/clans' && hasClanInvites;

                                        return (
                                            <button
                                                key={item.path}
                                                type="button"
                                                onClick={() => {
                                                    navigate(item.path);
                                                    setIsMoreOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                                    isBento
                                                        ? (active
                                                            ? 'bg-[#bef264] text-black border-2 border-black font-black'
                                                            : 'text-black hover:bg-[#fef9c3] font-bold')
                                                        : (active
                                                            ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-semibold'
                                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5')
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                    isBento
                                                        ? 'bg-white border border-black shadow-[1px_1px_0px_#000]'
                                                        : 'bg-slate-100 dark:bg-white/10 text-indigo-600 dark:text-indigo-400'
                                                }`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold truncate">{item.label}</span>
                                                        {showDot && (
                                                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                                        )}
                                                    </div>
                                                    {item.description && (
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </nav>

                    {/* Desktop Right Actions */}
                    <div className="hidden xl:flex items-center gap-2 shrink-0">
                        {showActions && (
                            <>
                                {!isGuest ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleProfileClick}
                                            className={`h-8 flex items-center gap-2 px-2.5 rounded-xl transition-all font-semibold text-xs active:scale-95 cursor-pointer shrink-0 ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fef9c3] font-black'
                                                    : 'bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-white'
                                            }`}
                                            title="Profile"
                                        >
                                            <div className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
                                                isBento ? 'border border-black bg-white' : 'ring-1 ring-indigo-500/40 bg-slate-100 dark:bg-[#090d16]'
                                            }`}>
                                                {user?.avatar ? (
                                                    <Avatar config={user.avatar} size="sm" className="w-full h-full" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="truncate max-w-[100px]">{user?.name || 'Profile'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleLogoutClick}
                                            className={`h-8 w-8 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 ${
                                                isBento
                                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                                    : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20'
                                            }`}
                                            title="Logout"
                                            aria-label="Logout"
                                        >
                                            <LogOut className={`w-3.5 h-3.5 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/login')}
                                            className={`px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer rounded-xl ${
                                                isBento
                                                    ? 'text-black font-black uppercase hover:bg-black/5'
                                                    : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-white'
                                            }`}
                                        >
                                            Log In
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/register')}
                                            className={`px-3.5 py-1.5 text-xs rounded-xl transition-all active:scale-95 cursor-pointer ${
                                                isBento
                                                    ? 'bg-[#bef264] text-black font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm shadow-indigo-600/25'
                                            }`}
                                        >
                                            Sign Up
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        <NotificationCenter currentUser={user} />
                        <ThemeToggle />
                    </div>

                    {/* Mobile & Tablet Toggle */}
                    <div className="flex xl:hidden items-center gap-2 shrink-0">
                        <NotificationCenter currentUser={user} />
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'text-slate-700 dark:text-white bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                            }`}
                            aria-label="Toggle navigation menu"
                        >
                            {isMenuOpen ? <X className={`w-5 h-5 ${isBento ? 'stroke-[2.5]' : ''}`} /> : <Menu className={`w-5 h-5 ${isBento ? 'stroke-[2.5]' : ''}`} />}
                        </button>
                    </div>
                </div>

                {/* Mobile & Tablet Navigation Drawer */}
                {isMenuOpen && (
                    <div className={`xl:hidden mt-3 p-4 rounded-3xl space-y-4 animate-in slide-in-from-top-2 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                            : 'glass-card shadow-2xl border border-slate-200/80 dark:border-white/10'
                    }`}>
                        {/* Navigation Items Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            {allNavItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);
                                const showBadge = item.path === '/clans' && hasClanInvites;

                                return (
                                    <button
                                        key={item.path}
                                        type="button"
                                        onClick={() => {
                                            if (item.path === '/leaderboard') {
                                                handleLeaderboardClick();
                                            } else {
                                                navigate(item.path);
                                            }
                                            setIsMenuOpen(false);
                                        }}
                                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl font-semibold text-xs transition-all border cursor-pointer active:scale-95 text-left ${
                                            isBento
                                                ? (active
                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] font-black'
                                                    : 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] font-bold hover:bg-[#fef9c3]')
                                                : (active
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/25'
                                                    : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white')
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                        <span className="truncate flex-1">{item.label}</span>
                                        {showBadge && (
                                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Mobile User Actions */}
                        <div className={`space-y-3 pt-3 ${isBento ? 'border-t-2 border-black' : 'border-t border-slate-200 dark:border-white/5'}`}>
                            {!isGuest ? (
                                <>
                                    <div className={`flex items-center gap-3 p-2.5 rounded-2xl ${
                                        isBento
                                            ? 'bg-[#fef9c3] border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5'
                                    }`}>
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 ${
                                            isBento ? 'border-2 border-black bg-white' : 'bg-white dark:bg-[#090d16] border border-slate-200 dark:border-white/10 text-white'
                                        }`}>
                                            {user?.avatar ? (
                                                <Avatar config={user.avatar} size="sm" className="w-full h-full" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-[10px] uppercase font-bold tracking-wider ${isBento ? 'text-slate-600' : 'text-slate-400'}`}>Signed in as</p>
                                            <p className={`text-xs truncate ${isBento ? 'font-black text-black' : 'font-semibold text-slate-900 dark:text-white'}`}>{user?.name || 'User'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleProfileClick();
                                                setIsMenuOpen(false);
                                            }}
                                            className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer active:scale-95 ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                                    : 'bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            <User className={`w-4 h-4 ${isBento ? 'text-black stroke-[2.5]' : 'text-indigo-500'}`} />
                                            Profile
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleLogoutClick();
                                                setIsMenuOpen(false);
                                            }}
                                            className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl transition-all font-semibold text-xs cursor-pointer active:scale-95 ${
                                                isBento
                                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-500/10'
                                            }`}
                                        >
                                            <LogOut className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                            Logout
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigate('/login');
                                            setIsMenuOpen(false);
                                        }}
                                        className={`w-full py-2.5 font-bold text-xs rounded-xl transition-all text-center cursor-pointer ${
                                            isBento
                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                                        }`}
                                    >
                                        Log In
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigate('/register');
                                            setIsMenuOpen(false);
                                        }}
                                        className={`w-full py-2.5 font-bold text-xs rounded-xl transition-all text-center cursor-pointer ${
                                            isBento
                                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                                : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        Create Free Account
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;
