import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { PublicUserProfileModal } from '../components/profile/PublicUserProfileModal';

interface UserProfileModalContextType {
    openUserProfile: (userId: string) => void;
    closeUserProfile: () => void;
    selectedUserId: string | null;
    isOpen: boolean;
}

const UserProfileModalContext = createContext<UserProfileModalContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useUserProfileModal = () => {
    const context = useContext(UserProfileModalContext);
    if (!context) {
        throw new Error('useUserProfileModal must be used within a UserProfileModalProvider');
    }
    return context;
};

export const UserProfileModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const openUserProfile = useCallback((userId: string) => {
        if (!userId || userId === 'undefined') return;
        setSelectedUserId(userId);
        setIsOpen(true);
    }, []);

    const closeUserProfile = useCallback(() => {
        setIsOpen(false);
        setSelectedUserId(null);
    }, []);

    return (
        <UserProfileModalContext.Provider
            value={{
                openUserProfile,
                closeUserProfile,
                selectedUserId,
                isOpen
            }}
        >
            {children}
            <PublicUserProfileModal
                userId={selectedUserId}
                isOpen={isOpen}
                onClose={closeUserProfile}
            />
        </UserProfileModalContext.Provider>
    );
};
