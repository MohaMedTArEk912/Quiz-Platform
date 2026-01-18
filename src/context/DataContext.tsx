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
    subjects: any[];
    skillTracks: any[];
    studyCards: any[];
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
    const [subjects, setSubjects] = useState<any[]>([]);
    const [skillTracks, setSkillTracks] = useState<any[]>([]);
    const [studyCards, setStudyCards] = useState<any[]>([]);
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
                const { users, attempts, badges, subjects: adminSubjects } = await api.getData(currentUser.userId);

                // Admins also need skill tracks and study cards
                try {
                    const [sTracks, sCards] = await Promise.all([
                        api.getSkillTracks(),
                        api.getStudyCards()
                    ]);
                    setSkillTracks(sTracks || []);
                    setStudyCards(sCards || []);
                } catch (e) {
                    console.error('Failed to load admin extra data:', e);
                }

                setAllUsers(users || []);
                setAllAttempts(attempts || []);
                setAllBadges(badges || []);
                setSubjects(adminSubjects || []);
                setChallenges([]);
            } else {
                // Regular user fetches optimized set
                const { attempts, badges, users, challenges: userChallenges } = await api.getUserData(currentUser.userId);

                // Also fetch subjects, skill tracks, and study cards for regular users
                try {
                    const [subjectsRes, tracksRes, cardsRes] = await Promise.all([
                        api.getAllSubjects(currentUser.userId),
                        api.getSkillTracks(),
                        api.getStudyCards()
                    ]);
                    setSubjects(subjectsRes.data || []);
                    setSkillTracks(tracksRes || []);
                    setStudyCards(cardsRes || []);
                } catch (e) {
                    console.error('Failed to load user extra data:', e);
                }

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
            setSubjects([]);
        }
    }, [currentUser, isAdmin, refreshData]);

    const userWithRank = useMemo(() => {
        if (!currentUser) return null;
        if (currentUser.rank) return currentUser;
        if (allUsers.length === 0) return currentUser;

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
            subjects,
            skillTracks,
            studyCards,
            loadingData,
            refreshData,
            userWithRank
        }}>
            {children}
        </DataContext.Provider>
    );
};
