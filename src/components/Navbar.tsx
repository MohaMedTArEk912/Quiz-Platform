import React from 'react';
import { User, Award, LogOut, ArrowLeft } from 'lucide-react';
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
    return (
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10 transition-colors">
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
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                                {title}
                            </h1>
                            {!showBack && <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">Welcome back, {user.name}!</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <ThemeToggle />

                        {showActions && (
                            <>
                                <button
                                    onClick={onViewLeaderboard}
                                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors font-semibold"
                                >
                                    <Award className="w-5 h-5" />
                                    Leaderboard
                                </button>
                                <button
                                    onClick={onViewLeaderboard}
                                    className="md:hidden p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl hover:bg-yellow-200"
                                >
                                    <Award className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={onViewProfile}
                                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-semibold"
                                >
                                    <User className="w-5 h-5" />
                                    Profile
                                </button>
                                <button
                                    onClick={onViewProfile}
                                    className="md:hidden p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-200"
                                >
                                    <User className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={onLogout}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="hidden md:inline">Logout</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
