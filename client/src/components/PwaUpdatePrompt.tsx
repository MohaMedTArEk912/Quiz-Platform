import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X, ArrowUpCircle } from 'lucide-react';
import { pwaUpdater, type PwaUpdateState } from '../lib/pwaUpdater';
import { useLocation } from 'react-router-dom';

const PwaUpdatePrompt: React.FC = () => {
    const [pwaState, setPwaState] = useState<PwaUpdateState>(() => pwaUpdater.getState());
    const [isUpdating, setIsUpdating] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const unsubscribe = pwaUpdater.subscribe((state) => {
            setPwaState(state);
        });
        return () => unsubscribe();
    }, []);

    // If currently taking a live quiz or VS match, avoid intrusive popups to prevent distraction
    const isInsideQuiz = location.pathname.startsWith('/quiz/') || location.pathname.startsWith('/game/vs');

    const handleUpdate = async () => {
        try {
            setIsUpdating(true);
            await pwaUpdater.updateApp();
        } catch (err) {
            console.error('Update failed:', err);
            setIsUpdating(false);
            window.location.reload();
        }
    };

    const handleDismiss = () => {
        pwaUpdater.dismissRefresh();
    };

    if (!pwaState.needRefresh || isInsideQuiz) {
        return null;
    }

    return (
        <aside
            aria-label="Application update available"
            className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-[100] animate-in slide-in-from-bottom-5 duration-300 pb-safe"
        >
            <div className="bg-white/95 dark:bg-[#12131f]/95 backdrop-blur-2xl border border-indigo-500/30 dark:border-indigo-500/40 p-4 rounded-3xl shadow-2xl shadow-indigo-500/20 max-w-full sm:max-w-md flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 ring-1 ring-black/5 dark:ring-white/10">
                {/* Left Icon Badge */}
                <div className="flex items-center gap-3 sm:gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/30 relative">
                        <ArrowUpCircle className={`w-6 h-6 ${isUpdating ? 'animate-spin' : 'animate-bounce'}`} />
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                Update Available
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-300 text-[10px] font-black tracking-wide uppercase">
                                New Version
                            </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 font-medium leading-tight mt-0.5">
                            Quiz Platform has been improved with new features and performance fixes.
                        </p>
                    </div>

                    {/* Mobile Dismiss Button */}
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="sm:hidden p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Dismiss update banner"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 sm:pt-0 sm:shrink-0 justify-end">
                    <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                        <span>{isUpdating ? 'Updating...' : 'Update Now'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="hidden sm:flex p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Dismiss"
                        aria-label="Dismiss update notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default PwaUpdatePrompt;
