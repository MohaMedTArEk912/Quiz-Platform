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
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
    user?: UserData | null;
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
    const { isBento } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const isGuest = !user || user.userId === 'guest' || !user.email;
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
        <header className={`sticky top-0 z-50 pt-safe pl-safe pr-safe transition-colors ${
            isBento
                ? 'bg-white text-black border-b-3 border-black shadow-[0_4px_0px_#000]'
                : 'glass-panel border-b border-slate-200/80 dark:border-white/[0.08]'
        }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center gap-3 sm:gap-4 justify-between">
                    {/* Left Section: Back button + Title */}
                    <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
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

                        <div className="shrink-0">
                            {title === "Quiz Platform" ? (
                                <div
                                    onClick={() => !isRoot && navigate('/')}
                                    className={`flex items-center gap-2 ${!isRoot ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                        isBento
                                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                                    }`}>
                                        Q
                                    </div>
                                    <div>
                                        <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <span>Quiz Platform</span>
                                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse hidden sm:inline-block ${isBento ? 'bg-black' : 'bg-indigo-500'}`} />
                                        </h1>
                                        {!shouldShowBack && (
                                            <p className={`hidden sm:block text-[11px] truncate ${isBento ? 'text-slate-700 font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                                                {isGuest ? (
                                                    <>Explore & test your knowledge</>
                                                ) : (
                                                    <>Welcome back, <span className={`${isBento ? 'text-black font-black' : 'text-slate-800 dark:text-slate-200 font-semibold'}`}>{user?.name || 'Explorer'}</span></>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <h1 className={`text-base sm:text-lg font-extrabold tracking-tight whitespace-nowrap ${isBento ? 'text-black font-black' : 'text-slate-900 dark:text-white'}`}>
                                    {title}
                                </h1>
                            )}
                        </div>
                    </div>

                    {/* Desktop Navigation - Refined Segmented Pill */}
                    <nav className={`hidden xl:flex items-center gap-1 p-1.5 rounded-2xl shrink-0 ${
                        isBento
                            ? 'bg-white border-2.5 border-black shadow-[3px_3px_0px_#000]'
                            : 'bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] shadow-inner'
                    }`}>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            const hasNotifications = item.path === '/clans' && Boolean(user?.clanInvites && user.clanInvites.length > 0);

                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer ${
                                        isBento
                                            ? (active
                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                                : 'text-black hover:bg-[#fef9c3] font-bold')
                                            : (active
                                                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm shadow-indigo-500/20 dark:shadow-indigo-600/30'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5')
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : (active ? 'text-indigo-600 dark:text-white' : '')}`} />
                                    <span>{item.label}</span>
                                    {hasNotifications && (
                                        <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${isBento ? 'bg-rose-600 border border-black' : 'bg-rose-500 ring-2 ring-white dark:ring-[#0f1422]'}`}></span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Desktop Actions */}
                    <div className="hidden xl:flex items-center gap-2 shrink-0">
                        {showActions && (
                            <>
                                <button
                                    onClick={onViewLeaderboard}
                                    className={`h-8 flex items-center gap-1.5 px-2.5 rounded-lg transition-all font-semibold text-xs active:scale-95 cursor-pointer shrink-0 ${
                                        isBento
                                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] font-black uppercase'
                                            : 'bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-white'
                                    }`}
                                    title="Leaderboard"
                                >
                                    <Award className={`w-3.5 h-3.5 ${isBento ? 'text-black stroke-[2.5]' : 'text-indigo-500'}`} />
                                    <span>Rankings</span>
                                </button>

                                {!isGuest ? (
                                    <>
                                        <button
                                            onClick={onViewProfile}
                                            className={`h-8 flex items-center gap-2 px-2.5 rounded-lg transition-all font-semibold text-xs active:scale-95 cursor-pointer shrink-0 ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fef9c3] font-black'
                                                    : 'bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-white'
                                            }`}
                                            title="Profile"
                                        >
                                            <div className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
                                                isBento ? 'border-2 border-black bg-white' : 'ring-1 ring-indigo-500/40 bg-slate-100 dark:bg-[#090d16]'
                                            }`}>
                                                {user?.avatar ? (
                                                    <Avatar config={user.avatar} size="sm" className="w-full h-full" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="hidden 2xl:inline truncate max-w-[100px]">{user?.name || 'Profile'}</span>
                                        </button>

                                        <button
                                            onClick={onLogout}
                                            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 shrink-0 ${
                                                isBento
                                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                                    : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20'
                                            }`}
                                            title="Logout"
                                            aria-label="Logout"
                                        >
                                            <LogOut className={`w-3.5 h-3.5 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1.5 ml-1">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/login')}
                                            className={`px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                                                isBento
                                                    ? 'text-black font-black uppercase hover:underline'
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
                                                    ? 'bg-[#bef264] text-black font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000]'
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

                    {/* Mobile & Tablet Menu Toggle & Theme */}
                    <div className="flex xl:hidden items-center gap-2 shrink-0">
                        <NotificationCenter currentUser={user} />
                        <ThemeToggle />
                        {showActions && (
                            <button
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
                        )}
                    </div>
                </div>

                {/* Mobile & Tablet Navigation Drawer */}
                {isMenuOpen && (
                    <div className={`xl:hidden mt-3 p-4 rounded-3xl space-y-4 animate-in slide-in-from-top-2 duration-200 ${
                        isBento
                            ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                            : 'glass-card shadow-2xl border border-slate-200/80 dark:border-white/10'
                    }`}>
                        {/* Navigation Items */}
                        <div className="grid grid-cols-2 gap-2">
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
                                        className={`flex items-center gap-2.5 p-3 rounded-2xl font-semibold text-xs transition-all border cursor-pointer active:scale-95 ${
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
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* User Actions */}
                        {showActions && (
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
                                                onClick={() => {
                                                    onViewLeaderboard();
                                                    setIsMenuOpen(false);
                                                }}
                                                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer active:scale-95 ${
                                                    isBento
                                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                                        : 'bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                <Award className={`w-4 h-4 ${isBento ? 'text-black stroke-[2.5]' : 'text-indigo-500'}`} />
                                                Rankings
                                            </button>

                                            <button
                                                onClick={() => {
                                                    onViewProfile();
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
                                        </div>

                                        <button
                                            onClick={onLogout}
                                            className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl transition-all font-semibold text-xs cursor-pointer active:scale-95 ${
                                                isBento
                                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000] font-black'
                                                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-500/10'
                                            }`}
                                        >
                                            <LogOut className={`w-4 h-4 ${isBento ? 'stroke-[2.5]' : ''}`} />
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <button
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
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;


