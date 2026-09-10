import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Compass, Trophy, ArrowLeft, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AmbientBackground } from '../components/AmbientBackground';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const { isBento } = useTheme();

    return (
        <div className={`min-h-screen flex flex-col justify-between transition-colors ${
            isBento
                ? 'bg-white text-black'
                : 'bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100'
        }`}>
            <AmbientBackground />

            {/* Navbar */}
            <Navbar
                user={currentUser}
                title="Page Not Found"
                onViewProfile={() => navigate('/profile')}
                onViewLeaderboard={() => navigate('/leaderboard')}
                onLogout={logout}
                showActions={true}
                showBack={true}
                onBack={() => navigate('/')}
            />

            {/* Main 404 Hero */}
            <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 relative z-10">
                <div className={`max-w-xl w-full p-8 sm:p-12 rounded-3xl text-center relative overflow-hidden ${
                    isBento
                        ? 'bg-white border-3 border-black shadow-[8px_8px_0px_#000]'
                        : 'glass-card border border-slate-200/80 dark:border-white/10 shadow-2xl'
                }`}>
                    {/* Glowing Number Pill */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-6 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Search className="w-3.5 h-3.5" />
                        Error 404: Not Found
                    </div>

                    {/* Massive 404 Hero Display */}
                    <div className="relative mb-6">
                        <h1 className={`text-7xl sm:text-9xl font-black tracking-tighter select-none ${
                            isBento
                                ? 'text-black font-mono'
                                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent'
                        }`}>
                            404
                        </h1>
                        <p className={`text-base sm:text-xl font-bold tracking-tight mt-2 ${
                            isBento ? 'text-black font-mono' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                            Question Not Found In This Dimension
                        </p>
                    </div>

                    <p className={`text-xs sm:text-sm leading-relaxed mb-8 max-w-md mx-auto ${
                        isBento ? 'text-slate-700 font-medium' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                        The learning track, quiz, or resource you are trying to access might have been renamed, removed, or never existed in the database.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className={`w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] font-black uppercase'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25'
                            }`}
                        >
                            <Home className="w-4 h-4" />
                            Return Home
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/tracks')}
                            className={`w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-[#fef9c3] font-black'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10'
                            }`}
                        >
                            <Compass className="w-4 h-4 text-indigo-500" />
                            Explore Tracks
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/leaderboard')}
                            className={`w-full sm:w-auto flex-1 py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                                isBento
                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] font-black'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10'
                            }`}
                        >
                            <Trophy className="w-4 h-4 text-amber-500" />
                            Leaderboard
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 font-semibold cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Go back to previous page
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default NotFoundPage;
