import React, { createContext, useContext, useState, useEffect, type ReactNode, useMemo, useCallback } from 'react';
import { api } from '../lib/api';
import type { Quiz, UserData, AttemptData, BadgeDefinition, ChallengeData, Subject, SkillTrack, StudyCard } from '../lib/api';
import { useAuth } from './AuthContext';

interface DataContextType {
    availableQuizzes: Quiz[];
    allUsers: UserData[];
    allAttempts: AttemptData[];
    allBadges: BadgeDefinition[];
    challenges: ChallengeData[];
    subjects: Subject[];
    skillTracks: SkillTrack[];
    studyCards: StudyCard[];
    loadingData: boolean;
    loadingQuizzes: boolean;
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
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [skillTracks, setSkillTracks] = useState<SkillTrack[]>([]);
    const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [loadingQuizzes, setLoadingQuizzes] = useState(true);

    // Load Foundation Data (Available for all users, including guests)
    useEffect(() => {
        const loadPublicData = async () => {
            setLoadingQuizzes(true);
            try {
                const [quizzesRes, subjectsRes, tracksRes, cardsRes, leaderboardRes] = await Promise.allSettled([
                    isAdmin ? api.getQuizzes(undefined, true) : api.getQuizzes(),
                    api.getSubjects(),
                    api.getSkillTracks(),
                    api.getStudyCards(),
                    api.getLeaderboard()
                ]);

                if (quizzesRes.status === 'fulfilled' && Array.isArray(quizzesRes.value)) {
                    setAvailableQuizzes(quizzesRes.value);
                }
                if (subjectsRes.status === 'fulfilled' && Array.isArray(subjectsRes.value)) {
                    setSubjects(subjectsRes.value);
                }
                if (tracksRes.status === 'fulfilled' && Array.isArray(tracksRes.value)) {
                    setSkillTracks(tracksRes.value);
                }
                if (cardsRes.status === 'fulfilled' && Array.isArray(cardsRes.value)) {
                    setStudyCards(cardsRes.value);
                }
                if (leaderboardRes.status === 'fulfilled' && Array.isArray(leaderboardRes.value)) {
                    setAllUsers(prev => (prev.length > 0 ? prev : leaderboardRes.value));
                }
            } catch (error) {
                console.error('[DataContext] Failed to load foundation data:', error);
            } finally {
                setLoadingQuizzes(false);
            }
        };

        loadPublicData();
    }, [isAdmin]);

    // Load User Data (Authenticated)
    const refreshData = useCallback(async () => {
        const uid = currentUser?.userId;
        if (!uid) return;
        setLoadingData(true);
        try {
            if (isAdmin) {
                // Admin fetches everything
                const { users, attempts, badges, subjects: adminSubjects } = await api.getData(uid);

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
                const { attempts, badges, users, challenges: userChallenges } = await api.getUserData(uid);

                // Also fetch skill tracks, study cards, and subjects for regular users
                try {
                    const [tracksRes, cardsRes, subjectsRes] = await Promise.all([
                        api.getSkillTracks(),
                        api.getStudyCards(),
                        api.getSubjects()
                    ]);
                    setSkillTracks(tracksRes || []);
                    setStudyCards(cardsRes || []);
                    setSubjects(subjectsRes || []);
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
    }, [currentUser?.userId, isAdmin]);

    useEffect(() => {
        if (currentUser?.userId) {
            refreshData();
        } else {
            // Clear data on logout
            setAllUsers([]);
            setAllAttempts([]);
            setChallenges([]);
            setSubjects([]);
        }
    }, [currentUser?.userId, isAdmin, refreshData]);

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
            loadingQuizzes,
            refreshData,
            userWithRank
        }}>
            {children}
        </DataContext.Provider>
    );
};
