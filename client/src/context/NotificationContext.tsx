import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
    NotificationToastContainer,
    type NotificationItem,
    type NotificationType
} from '../components/NotificationToast.tsx';

export interface ShowNotificationOptions {
    title?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface NotificationContextType {
    showNotification: (
        type: NotificationType,
        message: string,
        options?: ShowNotificationOptions
    ) => string;
    dismissNotification: (id: string) => void;
    clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    const dismissNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const showNotification = useCallback((
        type: NotificationType,
        message: string,
        options?: ShowNotificationOptions
    ): string => {
        const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newItem: NotificationItem = {
            id,
            type,
            message,
            title: options?.title,
            duration: options?.duration ?? 4500,
            action: options?.action
        };

        setNotifications((prev) => {
            // Keep at most 3 active notifications to prevent viewport crowding on mobile
            const updated = [...prev, newItem];
            if (updated.length > 3) {
                return updated.slice(updated.length - 3);
            }
            return updated;
        });

        return id;
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                showNotification,
                dismissNotification,
                clearAllNotifications
            }}
        >
            {children}
            <NotificationToastContainer
                notifications={notifications}
                onClose={dismissNotification}
            />
        </NotificationContext.Provider>
    );
};
