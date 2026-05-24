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
        <div className={`fixed top-24 right-4 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 w-80 animate-in slide-in-from-right ${getBgColor()}`}>
            {getIcon()}
            <p className="flex-grow font-medium text-slate-700 dark:text-slate-200">{notification.message}</p>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
            </button>
        </div>
    );
};

export default NotificationToast;
