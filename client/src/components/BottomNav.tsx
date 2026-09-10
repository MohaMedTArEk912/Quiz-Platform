import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, Trophy, Award, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();
    const { isBento } = useTheme();

    const isGuest = !currentUser || currentUser.userId === 'guest' || !currentUser.email;

    const navItems = [
        {
            path: '/',
            label: 'Home',
            icon: Home,
            isActive: location.pathname === '/' || location.pathname === '/dashboard'
        },
        {
            path: '/tracks',
            label: 'Tracks',
            icon: Compass,
            isActive: location.pathname === '/tracks' || location.pathname.startsWith('/badge-tree')
        },
        {
            path: '/tournaments',
            label: 'Arenas',
            icon: Trophy,
            isActive: location.pathname === '/tournaments'
        },
        {
            path: '/leaderboard',
            label: 'Rankings',
            icon: Award,
            isActive: location.pathname === '/leaderboard'
        },
        currentUser?.role === 'admin'
            ? {
                path: '/admin',
                label: 'Admin',
                icon: Shield,
                isActive: location.pathname === '/admin'
            }
            : {
                path: isGuest ? '/login' : '/profile',
                label: isGuest ? 'Sign In' : 'Profile',
                icon: User,
                isActive: location.pathname === '/profile' || location.pathname === '/login' || location.pathname === '/register'
            }
    ];

    return (
        <nav
            aria-label="Mobile Bottom Navigation"
            className={`fixed bottom-0 left-0 right-0 z-40 xl:hidden pb-safe border-t transition-colors ${
                isBento
                    ? 'bg-white border-t-2 border-black shadow-[0_-2px_0px_#000]'
                    : 'bg-white/90 dark:bg-[#0c101d]/90 backdrop-blur-xl border-slate-200/80 dark:border-white/10 shadow-lg'
            }`}
        >
            <div className="max-w-md mx-auto px-2 py-1 flex items-center justify-around">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.isActive;

                    return (
                        <button
                            key={item.path}
                            type="button"
                            onClick={() => navigate(item.path)}
                            aria-label={`Navigate to ${item.label}`}
                            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[54px] py-1 px-2 rounded-xl transition-all cursor-pointer relative touch-target active:scale-95 ${
                                isBento
                                    ? (active
                                        ? 'bg-[#bef264] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]'
                                        : 'text-black hover:bg-[#fef9c3] font-bold')
                                    : (active
                                        ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium')
                            }`}
                        >
                            <Icon
                                className={`w-5 h-5 transition-transform ${
                                    active ? 'scale-110' : ''
                                } ${isBento ? 'stroke-[2.5]' : ''}`}
                            />
                            <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                                {item.label}
                            </span>
                            {!isBento && active && (
                                <span className="absolute -top-1 w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
