import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Info,
    Sparkles,
    X
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'update';

export interface NotificationItem {
    id: string;
    type: NotificationType;
    message: string;
    title?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

// Backward compatibility type alias
export interface Notification {
    type: NotificationType;
    message: string;
    title?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastCardProps {
    notification: NotificationItem;
    onClose: (id: string) => void;
}

export const ToastCard: React.FC<ToastCardProps> = ({ notification, onClose }) => {
    const { id, type, message, title, duration = 4500, action } = notification;
    const [progress, setProgress] = useState(100);
    const [isPaused, setIsPaused] = useState(false);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [touchOffsetX, setTouchOffsetX] = useState(0);
    const [isDismissing, setIsDismissing] = useState(false);

    const startTimeRef = useRef<number>(0);
    const remainingTimeRef = useRef<number>(duration);
    const timerRef = useRef<number | null>(null);

    const handleDismiss = useCallback(() => {
        setIsDismissing(true);
        setTimeout(() => {
            onClose(id);
        }, 200);
    }, [id, onClose]);

    // Haptic feedback on mobile if supported
    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
            try {
                navigator.vibrate(20);
            } catch {
                // Ignore unsupported vibration
            }
        }
    }, []);

    // Progress and Auto-Dismiss Timer
    useEffect(() => {
        if (duration <= 0) return;

        const updateInterval = 50; // ms

        const tick = () => {
            if (!isPaused) {
                const elapsed = Date.now() - startTimeRef.current;
                const newRemaining = Math.max(0, remainingTimeRef.current - elapsed);
                const newPercent = (newRemaining / duration) * 100;

                setProgress(newPercent);

                if (newRemaining <= 0) {
                    handleDismiss();
                    return;
                }
            }
            timerRef.current = window.setTimeout(tick, updateInterval);
        };

        startTimeRef.current = Date.now();
        timerRef.current = window.setTimeout(tick, updateInterval);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [duration, isPaused, handleDismiss]);

    const handleMouseEnter = () => {
        setIsPaused(true);
        if (startTimeRef.current) {
            remainingTimeRef.current = Math.max(0, remainingTimeRef.current - (Date.now() - startTimeRef.current));
        }
    };

    const handleMouseLeave = () => {
        startTimeRef.current = Date.now();
        setIsPaused(false);
    };

    // Mobile Swipe-to-Dismiss Handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
        setTouchStartY(e.touches[0].clientY);
        handleMouseEnter();
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const currentX = e.touches[0].clientX;
        const diffX = currentX - touchStartX;
        setTouchOffsetX(diffX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        handleMouseLeave();
        if (touchStartX === null || touchStartY === null) return;

        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;

        // Dismiss if swiped horizontally > 80px or swiped up > 40px
        if (Math.abs(diffX) > 80 || diffY < -40) {
            handleDismiss();
        } else {
            setTouchOffsetX(0);
        }
        setTouchStartX(null);
        setTouchStartY(null);
    };

    const getIconConfig = () => {
        switch (type) {
            case 'success':
                return {
                    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
                    bgGradient: 'from-emerald-500/15 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/15',
                    borderColor: 'border-emerald-500/30 dark:border-emerald-500/40',
                    progressBar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
                    glow: 'shadow-emerald-500/10',
                    defaultTitle: 'Success'
                };
            case 'error':
                return {
                    icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
                    bgGradient: 'from-rose-500/15 to-red-500/10 dark:from-rose-500/20 dark:to-red-500/15',
                    borderColor: 'border-rose-500/30 dark:border-rose-500/40',
                    progressBar: 'bg-gradient-to-r from-rose-500 to-red-400',
                    glow: 'shadow-rose-500/10',
                    defaultTitle: 'Error'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
                    bgGradient: 'from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/15',
                    borderColor: 'border-amber-500/30 dark:border-amber-500/40',
                    progressBar: 'bg-gradient-to-r from-amber-500 to-orange-400',
                    glow: 'shadow-amber-500/10',
                    defaultTitle: 'Attention'
                };
            case 'update':
                return {
                    icon: <Sparkles className="w-5 h-5 text-purple-500 shrink-0 animate-pulse" />,
                    bgGradient: 'from-purple-500/15 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/15',
                    borderColor: 'border-purple-500/30 dark:border-purple-500/40',
                    progressBar: 'bg-gradient-to-r from-purple-500 to-indigo-400',
                    glow: 'shadow-purple-500/10',
                    defaultTitle: 'New Update'
                };
            default:
                return {
                    icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
                    bgGradient: 'from-blue-500/15 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/15',
                    borderColor: 'border-blue-500/30 dark:border-blue-500/40',
                    progressBar: 'bg-gradient-to-r from-blue-500 to-indigo-400',
                    glow: 'shadow-blue-500/10',
                    defaultTitle: 'Information'
                };
        }
    };

    const config = getIconConfig();

    return (
        <div
            role="alert"
            aria-live="polite"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: `translateX(${touchOffsetX}px) scale(${isDismissing ? 0.96 : 1})`,
                opacity: isDismissing ? 0 : 1 - Math.abs(touchOffsetX) / 200,
                transition: touchOffsetX === 0 ? 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
            }}
            className={`pointer-events-auto relative overflow-hidden bg-white/95 dark:bg-[#12131f]/95 backdrop-blur-2xl border ${config.borderColor} rounded-2xl sm:rounded-3xl shadow-2xl ${config.glow} p-3.5 sm:p-4 w-full transition-all duration-200 ring-1 ring-black/5 dark:ring-white/10`}
        >
            <div className="flex items-start gap-3">
                {/* Left Icon with rounded soft gradient container */}
                <div className={`p-2 rounded-xl sm:rounded-2xl bg-gradient-to-br ${config.bgGradient} flex items-center justify-center shrink-0 shadow-inner`}>
                    {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                    {title && (
                        <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-0.5 truncate">
                            {title}
                        </h4>
                    )}
                    <p className="text-xs sm:text-[13px] font-medium text-gray-700 dark:text-gray-200 leading-snug break-words">
                        {message}
                    </p>

                    {/* Optional Action Button */}
                    {action && (
                        <button
                            type="button"
                            onClick={() => {
                                action.onClick();
                                handleDismiss();
                            }}
                            className="mt-2 inline-flex items-center px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                        >
                            {action.label}
                        </button>
                    )}
                </div>

                {/* Close Button with generous touch hit area */}
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="p-1.5 -mr-1 -mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
                    aria-label="Close notification"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Visual countdown progress bar at bottom */}
            {duration > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-white/5 overflow-hidden">
                    <div
                        className={`h-full ${config.progressBar} transition-all duration-75 ease-linear`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
};

interface NotificationToastContainerProps {
    notifications: NotificationItem[];
    onClose: (id: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
    notifications,
    onClose
}) => {
    if (!notifications || notifications.length === 0) return null;

    return (
        <div
            aria-live="polite"
            aria-atomic="false"
            style={{
                top: 'max(64px, calc(env(safe-area-inset-top, 0px) + 16px))'
            }}
            className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:!top-6 sm:w-[380px] z-[9999] pointer-events-none flex flex-col gap-2.5"
        >
            {notifications.map((notif) => (
                <ToastCard key={notif.id} notification={notif} onClose={onClose} />
            ))}
        </div>
    );
};

// Default export for single notification compatibility
const NotificationToast: React.FC<{ notification: Notification; onClose: () => void }> = ({
    notification,
    onClose
}) => {
    const item: NotificationItem = {
        id: 'single',
        ...notification
    };
    return (
        <div
            style={{
                top: 'max(64px, calc(env(safe-area-inset-top, 0px) + 16px))'
            }}
            className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:!top-6 sm:w-[380px] z-[9999] pointer-events-none"
        >
            <ToastCard notification={item} onClose={onClose} />
        </div>
    );
};

export default NotificationToast;
