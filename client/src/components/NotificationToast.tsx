import React, { useEffect } from 'react';
// Force refresh

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface Notification {
    type: 'success' | 'error' | 'info';
    message: string;
}

interface NotificationToastProps {
    notification: Notification;
    onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = () => {
        switch (notification.type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBgColor = () => {
        switch (notification.type) {
            case 'success': return 'bg-white dark:bg-slate-800 border-l-4 border-green-500';
            case 'error': return 'bg-white dark:bg-slate-800 border-l-4 border-red-500';
            default: return 'bg-white dark:bg-slate-800 border-l-4 border-blue-500';
        }
    };

    return (
        <div className={`fixed top-16 sm:top-24 right-3 left-3 sm:left-auto sm:right-4 sm:w-96 max-w-[calc(100vw-1.5rem)] z-[100] p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-200/60 dark:border-white/10 backdrop-blur-xl animate-in slide-in-from-top-2 sm:slide-in-from-right duration-200 ${getBgColor()}`}>
            <div className="shrink-0">{getIcon()}</div>
            <p className="flex-grow font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 break-words leading-relaxed">{notification.message}</p>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors shrink-0 cursor-pointer" aria-label="Close notification">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-white" />
            </button>
        </div>
    );
};

export default NotificationToast;
