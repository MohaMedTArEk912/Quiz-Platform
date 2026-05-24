import React, { createContext, useContext, useState, type ReactNode } from 'react';
// NotificationToast component handles the UI for notifications
import NotificationToast, { type Notification } from '../components/NotificationToast.tsx';

interface NotificationContextType {
    showNotification: (type: Notification['type'], message: string) => void;
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
    const [notification, setNotification] = useState<Notification | null>(null);

    const showNotification = (type: Notification['type'], message: string) => {
        setNotification({ type, message });
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            {notification && (
                <NotificationToast notification={notification} onClose={() => setNotification(null)} />
            )}
        </NotificationContext.Provider>
    );
};
