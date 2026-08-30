import React from 'react';
import {
    User,
    Award,
    LogOut,
    ArrowLeft,
    Menu,
    X,
    Settings
} from 'lucide-react';
import ThemeToggle from './ThemeToggle.tsx';
import NotificationCenter from './NotificationCenter.tsx';
import type { UserData } from '../types/index.ts';
import { useNavigate, useLocation } from 'react-router-dom';
import Avatar from './Avatar';
import { NAV_ITEMS } from '../constants/appDefaults';

interface NavbarProps {
    user: UserData;
    onBack?: () => void;
    onViewProfile: () => void;
    onViewLeaderboard: () => void;
    onLogout: () => void;
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
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const isRoot = location.pathname === '/' || location.pathname === '/dashboard';
    const shouldShowBack = showBack !== undefined ? showBack : !isRoot;

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

    const navItems = React.useMemo(() => {
        const items = [...NAV_ITEMS];
        if (user?.role === 'admin') {
            items.push({
                path: '/admin',
                icon: Settings,
                label: 'Admin',
                color: 'from-red-600 to-rose-600'
            });
        }
        return items;
    }, [user?.role]);

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/' || location.pathname === '/dashboard';
        }
        return location.pathname === path;
    };

    return (
        <div className="bg-white/80 dark:bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 sticky top-0 z-50 pt-safe pl-safe pr-safe">
            <div className="w-full px-4 sm:px-6 py-3.5 sm:py-4">
                <div className="flex items-center gap-3 sm:gap-4 justify-between">
                    {/* Left Section: Back button + Title */}
                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                        {shouldShowBack && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 bg-gray-100/80 hover:bg-gray-200/80 dark:bg-white/10 dark:hover:bg-white/20 rounded-xl text-gray-700 dark:text-gray-200 transition-all font-bold text-xs sm:text-sm hover:scale-105 active:scale-95 shadow-sm border border-gray-200/50 dark:border-white/5 cursor-pointer shrink-0"
                                title="Go back to previous page"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                <span className="hidden sm:inline">Back</span>
                            </button>
                        )}

                        <div className="min-w-0 truncate">
                            {title === "Quiz Platform" ? (
                                <h1
                                    onClick={() => !isRoot && navigate('/')}
                                    className={`text-lg sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate ${!isRoot ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                                >
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-500 dark:to-pink-500 truncate">
                                        Quiz Platform
                                    </span>
                                </h1>
                            ) : (
                                <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight truncate">
                                    {title}
                                </h1>
                            )}

                            {!shouldShowBack && (
                                <p className="hidden sm:block text-gray-500 dark:text-gray-400 text-xs font-medium truncate">
                                    Welcome, <span className="text-gray-900 dark:text-white font-bold">{user?.name || 'User'}</span>!
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="hidden lg:block w-px h-8 bg-gray-300 dark:bg-gray-700 shrink-0"></div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex flex-1 items-center gap-1 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/5 max-w-2xl mx-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            const hasNotifications = item.path === '/clans' && user.clanInvites && user.clanInvites.length > 0;

                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`relative flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold text-xs xl:text-sm transition-all duration-300 cursor-pointer ${active
                                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${active ? 'animate-pulse' : ''}`} />
                                    <span>{item.label}</span>
                                    {hasNotifications && (
                                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#13141f]"></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Separator */}
                    <div className="hidden lg:block w-px h-8 bg-gray-300 dark:bg-gray-700 shrink-0"></div>

                    {/* Desktop Actions */}
                    <div className="hidden lg:flex items-center gap-2.5 shrink-0">
                        {showActions && (
                            <>
                                <button
                                    onClick={onViewLeaderboard}
                                    className="group flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 rounded-xl hover:border-purple-500/50 hover:text-purple-600 dark:hover:text-white hover:shadow-lg transition-all font-bold text-xs xl:text-sm cursor-pointer"
                                    title="Leaderboard"
                                >
                                    <Award className="w-4 h-4 group-hover:text-purple-400 transition-colors" />
                                    <span>Leaderboard</span>
                                </button>

                                <button
                                    onClick={onViewProfile}
                                    className="group flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 rounded-xl hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-white hover:shadow-lg transition-all font-bold text-xs xl:text-sm cursor-pointer"
                                    title="Profile"
                                >
                                    <div className="w-7 h-7 rounded-full ring-2 ring-indigo-500/50 shadow-sm overflow-hidden bg-white dark:bg-[#0a0a0b] flex items-center justify-center">
                                        {user.avatar ? (
                                            <Avatar config={user.avatar} size="sm" className="w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <span className="hidden xl:inline">{user?.name || 'Profile'}</span>
                                </button>

                                <button
                                    onClick={onLogout}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/30 cursor-pointer"
                                    title="Logout"
                                    aria-label="Logout"
                                >
                                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </>
                        )}
                        <NotificationCenter currentUser={user} />
                        <ThemeToggle />
                    </div>

                    {/* Mobile Menu Toggle & Theme */}
                    <div className="flex lg:hidden items-center gap-2 shrink-0">
                        <NotificationCenter currentUser={user} />
                        <ThemeToggle />
                        {showActions && (
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 text-gray-600 dark:text-white bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                                aria-label="Toggle navigation menu"
                            >
                                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Navigation Drawer */}
                {isMenuOpen && (
                    <div className="lg:hidden mt-3 p-4 bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-3xl space-y-4 animate-in slide-in-from-top-3 duration-200 shadow-2xl">
                        {/* Navigation Items */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            navigate(item.path);
                                            setIsMenuOpen(false);
                                        }}
                                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl font-bold text-xs transition-all border cursor-pointer ${active
                                            ? `bg-gradient-to-br ${item.color} border-transparent text-white shadow-lg`
                                            : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* User Actions */}
                        {showActions && (
                            <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-white/5">
                                <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/5">
                                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#0a0a0b] flex items-center justify-center font-bold text-white text-base overflow-hidden border border-gray-200 dark:border-white/10">
                                        {user.avatar ? (
                                            <Avatar config={user.avatar} size="md" className="w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-gray-400 text-[10px] uppercase font-black tracking-wider">Signed in as</p>
                                        <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{user?.name || 'User'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        onClick={() => {
                                            onViewLeaderboard();
                                            setIsMenuOpen(false);
                                        }}
                                        className="flex items-center justify-center gap-2 p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 font-bold text-xs transition-all cursor-pointer"
                                    >
                                        <Award className="w-4 h-4" />
                                        Leaderboard
                                    </button>

                                    <button
                                        onClick={() => {
                                            onViewProfile();
                                            setIsMenuOpen(false);
                                        }}
                                        className="flex items-center justify-center gap-2 p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 font-bold text-xs transition-all cursor-pointer"
                                    >
                                        <User className="w-4 h-4" />
                                        Profile
                                    </button>
                                </div>

                                <button
                                    onClick={onLogout}
                                    className="w-full flex items-center justify-center gap-2 p-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-bold text-xs cursor-pointer border border-red-500/10"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Navbar;
