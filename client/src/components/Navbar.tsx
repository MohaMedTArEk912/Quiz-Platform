import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    User,
    LogOut,
    ArrowLeft,
    Menu,
    X,
    ChevronDown,
    Sparkles,
    MessageSquare
} from 'lucide-react';
import NotificationCenter from './NotificationCenter.tsx';
import type { UserData } from '../types/index.ts';
import { useNavigate, useLocation } from 'react-router-dom';
import Avatar from './Avatar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useNavArrangement } from '../context/NavArrangementContext';
import { NavbarCustomizerModal } from './nav/NavbarCustomizerModal';

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
    const { isOpen: isChatOpen, openChat, closeChat, unreadCount: chatUnreadCount } = useChat();
    const { primaryItems, secondaryItems } = useNavArrangement();
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
                setIsMenuOpen(false);
            }
        };

        if (isMoreOpen || isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMoreOpen, isMenuOpen]);

    // Automatically close mobile menu and dropdown on route change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMenuOpen(false);
        setIsMoreOpen(false);
    }, [location.pathname]);

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

    const allNavItems = useMemo(() => {
        return [...primaryItems, ...secondaryItems];
    }, [primaryItems, secondaryItems]);

    const isActive = useCallback((path: string) => {
        if (path === '/') {
            return location.pathname === '/' || location.pathname === '/dashboard';
        }
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    }, [location.pathname]);

    const isSecondaryActive = useMemo(() => {
        return secondaryItems.some(item => isActive(item.path));
    }, [isActive, secondaryItems]);

    const activeSecondaryItem = useMemo(() => {
        return secondaryItems.find(item => isActive(item.path));
    }, [isActive, secondaryItems]);

    const hasClanInvites = Boolean(user?.clanInvites && user.clanInvites.length > 0);

    return (
        <header className={`sticky top-0 z-50 pt-safe pl-safe pr-safe transition-colors ${
            isBento
                ? 'bg-white text-black border-b-3 border-black shadow-[0_4px_0px_#000]'
                : 'glass-panel border-b border-slate-200/80 dark:border-white/[0.08]'
        }`}>
            <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5">
                {/* Desktop View (xl:grid) - Strictly Symmetric 3-Column Grid */}
                <div className="hidden xl:grid xl:grid-cols-[1fr_auto_1fr] items-center gap-4 w-full min-h-10">
                    {/* Left Column: Brand & Optional Back Button */}
                    <div className="flex items-center justify-start gap-2.5 min-w-0">
                        {shouldShowBack && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className={`h-9 flex items-center gap-1.5 px-3 rounded-xl transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                                    isBento
                                        ? 'bg-[#fde047] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-white/5'
                                }`}
                                title="Go back to previous page"
                                aria-label="Go back"
                            >
                                <ArrowLeft className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                <span>Back</span>
                            </button>
                        )}

                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate('/')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    navigate('/');
                                }
                            }}
                            className="btn-unstyled flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition-opacity text-left select-none"
                            aria-label="Quiz Platform Home"
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-transform active:scale-95 ${
                                isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                            }`}>
                                Q
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 min-w-0">
                                    <span className="whitespace-nowrap font-black">
                                        Quiz Platform
                                    </span>
                                    {(isRoot || !title || title === "Quiz Platform") && (
                                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse hidden sm:inline-block shrink-0 ${isBento ? 'bg-black' : 'bg-indigo-500'}`} />
                                    )}
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Center Column: Segmented Pill Navigation - 100% Mathematically Centered */}
                    <div className="flex items-center justify-center">
                        <nav className={`flex items-center gap-1 p-1 rounded-2xl shrink-0 ${
                            isBento
                                ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] shadow-inner'
                        }`}>
                            {primaryItems.map((item) => {
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
                                        className={`relative h-8 flex items-center gap-1.5 px-2.5 2xl:px-3 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-150 cursor-pointer border-2 ${
                                            isBento
                                                ? (active
                                                    ? 'bg-[#bef264] text-black border-black shadow-[2px_2px_0px_#000] font-black'
                                                    : 'text-black border-transparent hover:bg-[#fef9c3]')
                                                : (active
                                                    ? 'bg-white dark:bg-indigo-600 border-transparent text-slate-900 dark:text-white shadow-sm shadow-indigo-500/20 dark:shadow-indigo-600/30'
                                                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5')
                                        }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isBento ? 'stroke-[2.5]' : (active ? 'text-indigo-600 dark:text-white' : '')}`} />
                                        <span>{item.label}</span>
                                        {active && (
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBento ? 'bg-black' : 'bg-indigo-600 dark:bg-white'}`} />
                                        )}
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
                                    className={`relative h-8 flex items-center gap-1.5 px-2.5 2xl:px-3 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-150 cursor-pointer border-2 ${
                                        isBento
                                            ? (isSecondaryActive
                                                ? 'bg-[#bef264] text-black border-black shadow-[2px_2px_0px_#000] font-black'
                                                : 'text-black border-transparent hover:bg-[#fef9c3]')
                                            : (isSecondaryActive
                                                ? 'bg-white dark:bg-indigo-600 border-transparent text-slate-900 dark:text-white shadow-sm shadow-indigo-500/20 dark:shadow-indigo-600/30'
                                                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5')
                                    }`}
                                >
                                    <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isBento ? 'stroke-[2.5]' : (isSecondaryActive ? 'text-indigo-600 dark:text-white' : '')}`} />
                                    <span>{isSecondaryActive && activeSecondaryItem ? activeSecondaryItem.shortLabel : 'More'}</span>
                                    {isSecondaryActive && (
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBento ? 'bg-black' : 'bg-indigo-600 dark:bg-white'}`} />
                                    )}
                                    <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`} />
                                    {hasClanInvites && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-black"></span>
                                    )}
                                </button>

                                {/* Dropdown Floating Menu */}
                                {isMoreOpen && (
                                    <div className={`absolute top-full mt-2 right-0 w-64 p-2 rounded-2xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
                                        isBento
                                            ? 'bg-white border-2.5 border-black shadow-[5px_5px_0px_#000]'
                                            : 'bg-white/95 dark:bg-[#0f1422]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl'
                                    }`}>
                                        {secondaryItems.length === 0 ? (
                                            <div className={`p-3 text-center rounded-xl text-xs font-bold ${
                                                isBento ? 'text-black/70 bg-[#fef9c3]' : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5'
                                            }`}>
                                                All tabs are pinned to top bar!
                                            </div>
                                        ) : (
                                            secondaryItems.map((item) => {
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
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </nav>
                    </div>

                    {/* Right Column: User Profile, Logout, Chat Hub, Notification Bell */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                        {showActions && (
                            <>
                                {!isGuest ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleProfileClick}
                                            className={`h-9 flex items-center gap-2 px-3 rounded-xl transition-all font-semibold text-xs active:scale-95 cursor-pointer shrink-0 ${
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
                                            className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 ${
                                                isBento
                                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                                    : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20'
                                            }`}
                                            title="Logout"
                                            aria-label="Logout"
                                        >
                                            <LogOut className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/login')}
                                            className={`h-9 px-3 text-xs font-bold transition-colors cursor-pointer rounded-xl flex items-center justify-center ${
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
                                            className={`h-9 px-3.5 text-xs rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
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
                        {!isGuest && (
                            <button
                                type="button"
                                onClick={() => (isChatOpen ? closeChat() : openChat())}
                                className={`relative h-9 w-9 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                        : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 hover:border-indigo-500/40'
                                }`}
                                title="Chat Hub (Clans & Friends)"
                                aria-label="Open Chat Hub"
                            >
                                <MessageSquare className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                {chatUnreadCount > 0 && (
                                    <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black animate-bounce shadow-sm ${
                                        isBento ? 'bg-[#ef4444] text-white border border-black' : 'bg-rose-500 text-white ring-2 ring-white dark:ring-gray-900'
                                    }`}>
                                        {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                                    </span>
                                )}
                            </button>
                        )}
                        <NotificationCenter currentUser={user} />
                    </div>
                </div>

                {/* Mobile & Tablet Row (< xl) */}
                <div className="flex xl:hidden items-center justify-between gap-3 w-full min-h-10">
                    {/* Left Section: Back button + Brand */}
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
                        {shouldShowBack && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className={`h-9 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl transition-all text-xs active:scale-95 cursor-pointer shrink-0 ${
                                    isBento
                                        ? 'bg-[#fde047] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-white/5'
                                }`}
                                title="Go back to previous page"
                                aria-label="Go back"
                            >
                                <ArrowLeft className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                        )}

                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate('/')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    navigate('/');
                                }
                            }}
                            className="btn-unstyled flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition-opacity text-left select-none"
                            aria-label="Quiz Platform Home"
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-transform active:scale-95 ${
                                isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                            }`}>
                                Q
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 min-w-0">
                                    <span className="whitespace-nowrap font-black">
                                        Quiz Platform
                                    </span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Mobile & Tablet Right Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                        {!isGuest && (
                            <button
                                type="button"
                                onClick={() => (isChatOpen ? closeChat() : openChat())}
                                className={`relative h-9 w-9 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'text-slate-700 dark:text-white bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10'
                                }`}
                                title="Chat Hub"
                                aria-label="Open Chat Hub"
                            >
                                <MessageSquare className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                {chatUnreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-full flex items-center justify-center text-[8px] font-black bg-rose-500 text-white">
                                        {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                                    </span>
                                )}
                            </button>
                        )}
                        <NotificationCenter currentUser={user} />
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 ${
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
                    <>
                        <div
                            className="fixed inset-0 top-[53px] sm:top-[57px] bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs z-40 xl:hidden animate-in fade-in duration-200"
                            onClick={() => setIsMenuOpen(false)}
                            aria-hidden="true"
                        />
                        <div className={`xl:hidden relative z-50 mt-3 p-4 rounded-3xl space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-2xl ${
                            isBento
                                ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                                : 'glass-card shadow-2xl border border-slate-200/90 dark:border-white/10'
                        }`}>
                            {/* Navigation Items Header */}
                            <div className="flex items-center justify-between pb-1">
                                <span className={`text-[11px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-slate-500 dark:text-slate-400'}`}>
                                    Navigation
                                </span>
                            </div>

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
                                            className={`flex items-center gap-2.5 p-2.5 min-h-[44px] rounded-2xl font-semibold text-xs transition-all border cursor-pointer active:scale-95 text-left ${
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
                                            {active && (
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBento ? 'bg-black' : 'bg-white'}`} />
                                            )}
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

                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                openChat();
                                                setIsMenuOpen(false);
                                            }}
                                            className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer active:scale-95 ${
                                                isBento
                                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                                    : 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                            }`}
                                        >
                                            <MessageSquare className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                            <span>Chat</span>
                                            {chatUnreadCount > 0 && (
                                                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black">
                                                    {chatUnreadCount}
                                                </span>
                                            )}
                                        </button>

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
                    </>
                )}
            </div>

            {/* Navbar & Menu Customizer Modal */}
            <NavbarCustomizerModal />
        </header>
    );
};

export default Navbar;
