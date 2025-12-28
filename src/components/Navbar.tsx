import React from 'react';
import { User, Award, LogOut, ArrowLeft, Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle.tsx';
import type { UserData } from '../types/index.ts';

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

    return (
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-50 transition-colors">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {showBack && onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent truncate max-w-[200px] md:max-w-none">
                                {title}
                            </h1>
                            {!showBack && <p className="hidden md:block text-gray-600 dark:text-gray-300 text-sm mt-1">Welcome back, {user.name}!</p>}
                        </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <ThemeToggle />

                        {showActions && (
                            <>
                                <button
                                    onClick={onViewLeaderboard}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors font-semibold"
                                >
                                    <Award className="w-5 h-5" />
                                    Leaderboard
                                </button>

                                <button
                                    onClick={onViewProfile}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-semibold"
                                >
                                    <User className="w-5 h-5" />
                                    Profile
                                </button>

                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>Logout</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Mobile Actions Toggle */}
                    <div className="flex md:hidden items-center gap-2">
                        <ThemeToggle />
                        {showActions && (
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && showActions && (
                <div className="md:hidden border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 animate-in slide-in-from-top-5 duration-200">
                    <div className="px-6 py-4 space-y-3">
                        <div className="pb-3 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-gray-600 dark:text-gray-300 font-medium">Signed in as</p>
                            <p className="font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                        </div>

                        <button
                            onClick={() => {
                                onViewLeaderboard();
                                setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors font-semibold"
                        >
                            <Award className="w-5 h-5" />
                            Leaderboard
                        </button>

                        <button
                            onClick={() => {
                                onViewProfile();
                                setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors font-semibold"
                        >
                            <User className="w-5 h-5" />
                            Profile
                        </button>

                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-semibold"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Navbar;
