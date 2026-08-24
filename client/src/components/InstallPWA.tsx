import React, { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA: React.FC = () => {
    const [isDismissed, setIsDismissed] = useState(() => {
        return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
    });

    const [isIOS] = useState(() => {
        if (typeof window === 'undefined') return false;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
        return isIOSDevice && !isStandalone;
    });

    const [supportsPWA, setSupportsPWA] = useState(() => {
        if (typeof window === 'undefined') return false;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
        return isIOSDevice && !isStandalone;
    });

    const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);
    const [showIOSModal, setShowIOSModal] = useState(false);

    useEffect(() => {
        // Standard beforeinstallprompt for Chromium & Android
        const handler = (e: Event) => {
            e.preventDefault();
            setSupportsPWA(true);
            setPromptInstall(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // App installed handler
        const handleAppInstalled = () => {
            setSupportsPWA(false);
            setPromptInstall(null);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async (evt: React.MouseEvent) => {
        evt.preventDefault();
        if (isIOS) {
            setShowIOSModal(true);
            return;
        }

        if (!promptInstall) return;

        await promptInstall.prompt();
        const { outcome } = await promptInstall.userChoice;
        if (outcome === 'accepted') {
            setSupportsPWA(false);
        }
    };

    const handleDismiss = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        setIsDismissed(true);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!supportsPWA || isDismissed) {
        return null;
    }

    return (
        <>
            {/* Floating Install Prompt Banner */}
            <div className="fixed bottom-5 right-5 z-[80] animate-in slide-in-from-bottom-5 duration-300">
                <div className="bg-white/95 dark:bg-[#13141f]/95 backdrop-blur-2xl border border-purple-500/30 p-3.5 sm:p-4 rounded-2xl shadow-2xl shadow-purple-500/20 max-w-xs sm:max-w-sm flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-purple-500/30">
                        <Download className="w-5 h-5 animate-pulse" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 dark:text-white">
                            <span>Install App</span>
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium line-clamp-1">
                            {isIOS ? 'Add to Home Screen for best experience' : 'Fast, offline ready, and fullscreen'}
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={handleInstallClick}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md shadow-purple-500/25 cursor-pointer"
                        >
                            Install
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            aria-label="Dismiss install banner"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* iOS Instructions Modal */}
            {showIOSModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                    onClick={() => setShowIOSModal(false)}
                >
                    <div
                        className="bg-white dark:bg-[#13141f] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    <Download className="w-5 h-5" />
                                </div>
                                <h3 className="font-black text-base text-gray-900 dark:text-white">Install on iOS</h3>
                            </div>
                            <button
                                onClick={() => setShowIOSModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-xs text-gray-600 dark:text-gray-300">
                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black flex items-center justify-center shrink-0 text-xs">1</span>
                                <p className="pt-0.5">
                                    Tap the <span className="font-bold inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">Share button <Share className="w-3.5 h-3.5 inline" /></span> in Safari's bottom toolbar.
                                </p>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black flex items-center justify-center shrink-0 text-xs">2</span>
                                <p className="pt-0.5">
                                    Scroll down and tap <span className="font-bold inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline" /></span>.
                                </p>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black flex items-center justify-center shrink-0 text-xs">3</span>
                                <p className="pt-0.5">
                                    Tap <span className="font-bold text-gray-900 dark:text-white">Add</span> in the top right corner to install Quiz Platform!
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="w-full mt-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallPWA;
