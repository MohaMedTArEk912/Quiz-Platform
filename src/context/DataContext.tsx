import React, { createContext, useContext, useState, useEffect, type ReactNode, useMemo, useCallback } from 'react';
import { api } from '../lib/api';
import type { Quiz, UserData, AttemptData, BadgeDefinition, ChallengeData } from '../lib/api';
import { useAuth } from './AuthContext';

interface DataContextType {
    availableQuizzes: Quiz[];
    allUsers: UserData[];
    allAttempts: AttemptData[];
    allBadges: BadgeDefinition[];
    challenges: ChallengeData[];
    loadingData: boolean;
    refreshData: () => Promise<void>;
    userWithRank: UserData | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser, isAdmin } = useAuth();
    const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [allAttempts, setAllAttempts] = useState<AttemptData[]>([]);
    const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
    const [challenges, setChallenges] = useState<ChallengeData[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Load Quizzes (Public)
    useEffect(() => {
        const loadQuizzes = async () => {
            try {
                const quizzes = await api.getQuizzes();
                setAvailableQuizzes(quizzes);
            } catch (error) {
                console.error('Failed to load quizzes:', error);
            }
        };
        loadQuizzes();
    }, []);

    // Load User Data (Authenticated)
    const refreshData = useCallback(async () => {
        if (!currentUser) return;
        setLoadingData(true);
        try {
            if (isAdmin) {
                // Admin fetches everything
                const { users, attempts, badges } = await api.getData(currentUser.userId); // Pass ID even if admin? verifySession used token. 
                // api.getData usually takes userId, but server checks role.
                setAllUsers(users || []);
                setAllAttempts(attempts || []);
                setAllBadges(badges || []);
                setChallenges([]); // Admin might not see personal challenges here or doesn't need them
            } else {
                // Regular user fetches optimized set
                const { attempts, badges, users, challenges: userChallenges } = await api.getUserData(currentUser.userId);
                // Note: getUserData returns 'user' which is self (with rank maybe?), and 'users' which is leaderboard.
                // We might want to update currentUser in AuthContext if it changed?
                // For now, let's just store the list data.
                setAllUsers(users || []);
                setAllAttempts(attempts || []);
                setAllBadges(badges || []);
                setChallenges(userChallenges || []);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoadingData(false);
        }
    }, [currentUser, isAdmin]);

    useEffect(() => {
        if (currentUser) {
            refreshData();
        } else {
            // Clear data on logout
            setAllUsers([]);
            setAllAttempts([]);
            setChallenges([]);
        }
    }, [currentUser, isAdmin, refreshData]);

    const userWithRank = useMemo(() => {
        if (!currentUser) return null;
        if (currentUser.rank) return currentUser; // If API returned it in currentUser object (it doesn't usually, unless specifically mapped)
        if (allUsers.length === 0) return currentUser;

        // Fallback rank calculation if not provided by backend on self object
        // But api.getUserData returns user with rank! 
        // However, AuthContext's currentUser might be from session storage (stale).
        // Ideally we should update AuthContext's currentUser when we fetch fresh data.
        // For now, let's calculate rank from leaderboard if possible.

        const sortedUsers = [...allUsers].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        const rank = sortedUsers.findIndex((u: UserData) => u.userId === currentUser.userId) + 1;
        return { ...currentUser, rank: rank > 0 ? rank : undefined };
    }, [currentUser, allUsers]);

    return (
        <DataContext.Provider value={{
            availableQuizzes,
            allUsers,
            allAttempts,
            allBadges,
            challenges,
            loadingData,
            refreshData,
            userWithRank
        }}>
            {children}
        </DataContext.Provider>
    );
};
