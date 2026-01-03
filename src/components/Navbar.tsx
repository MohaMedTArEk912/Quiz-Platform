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
    showBack = false,
    title = "Quiz Platform",
    showActions = true
}) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const navigate = useNavigate();
    const location = useLocation();

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
        // Home button should be active for both / and /dashboard
        if (path === '/') {
            return location.pathname === '/' || location.pathname === '/dashboard';
        }
        return location.pathname === path;
    };

    return (
        <div className="bg-white/80 dark:bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 sticky top-0 z-50">
            <div className="w-full px-4 sm:px-6 py-4">
                <div className="flex items-center gap-4">
                    {/* Left Section */}
                    <div className="flex items-center gap-4">
                        {showBack && onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            {title === "Quiz Platform" ? (
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-500 dark:to-pink-500">
                                        Quiz Platform
                                    </span>
                                </h1>
                            ) : (
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {title}
                                </h1>
                            )}

                            {!showBack && (
                                <p className="hidden sm:block text-gray-500 dark:text-gray-400 text-xs font-medium">
                                    Welcome, <span className="text-gray-900 dark:text-white">{user?.name || 'User'}</span>!
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="hidden lg:block w-px h-8 bg-gray-300 dark:bg-gray-700"></div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex flex-1 items-center gap-1 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/5">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            const hasNotifications = item.path === '/clans' && user.clanInvites && user.clanInvites.length > 0;

                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 ${active
                                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${active ? 'animate-pulse' : ''}`} />
                                    <span className="hidden xl:inline">{item.label}</span>
                                    {hasNotifications && (
                                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#13141f]"></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Separator */}
                    <div className="hidden lg:block w-px h-8 bg-gray-300 dark:bg-gray-700"></div>

                    {/* Desktop Actions */}
                    <div className="hidden lg:flex items-center gap-3">
                        {showActions && (
                            <>
                                <button
                                    onClick={onViewLeaderboard}
                                    className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 rounded-xl hover:border-purple-500/50 hover:text-purple-600 dark:hover:text-white hover:shadow-lg transition-all font-bold text-sm"
                                    title="Leaderboard"
                                >
                                    <Award className="w-4 h-4 group-hover:text-purple-400 transition-colors" />
                                    <span className="hidden xl:inline">Leaderboard</span>
                                </button>

                                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700"></div>

                                <button
                                    onClick={onViewProfile}
                                    className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 rounded-xl hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-white hover:shadow-lg transition-all font-bold text-sm"
                                    title="Profile"
                                >
                                    <div className="w-8 h-8 rounded-full ring-2 ring-indigo-500/50 shadow-sm overflow-hidden bg-white dark:bg-[#0a0a0b]">
                                        {user.avatar ? (
                                            <Avatar config={user.avatar} size="sm" className="w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <span className="hidden xl:inline">Profile</span>
                                </button>

                                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700"></div>

                                <button
                                    onClick={onLogout}
                                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>

                                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700"></div>
                            </>
                        )}
                        <ThemeToggle />
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="flex lg:hidden items-center gap-3 ml-auto">
                        <ThemeToggle />
                        {showActions && (
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2.5 text-gray-600 dark:text-white bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all"
                            >
                                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="lg:hidden mt-4 p-4 bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-3xl space-y-4 animate-in slide-in-from-top-5 duration-200 shadow-2xl">
                        {/* Navigation Items */}
                        <div className="grid grid-cols-2 gap-3">
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
                                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl font-bold text-sm transition-all border ${active
                                            ? `bg-gradient-to-br ${item.color} border-transparent text-white shadow-lg`
                                            : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/10 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                    >
                                        <Icon className="w-6 h-6" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* User Actions */}
                        {showActions && (
                            <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-white/5">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/5">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0a0a0b] flex items-center justify-center font-bold text-white text-lg overflow-hidden border border-gray-200 dark:border-white/10">
                                        {user.avatar ? (
                                            <Avatar config={user.avatar} size="md" className="w-full h-full" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Signed in as</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{user?.name || 'User'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            onViewLeaderboard();
                                            setIsMenuOpen(false);
                                        }}
                                        className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 font-bold transition-all"
                                    >
                                        <Award className="w-4 h-4" />
                                        Leaderboard
                                    </button>

                                    <button
                                        onClick={() => {
                                            onViewProfile();
                                            setIsMenuOpen(false);
                                        }}
                                        className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 font-bold transition-all"
                                    >
                                        <User className="w-4 h-4" />
                                        Profile
                                    </button>
                                </div>

                                <button
                                    onClick={onLogout}
                                    className="w-full flex items-center justify-center gap-2 p-3 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all font-bold"
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
