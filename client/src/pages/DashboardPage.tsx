import React, { useState } from 'react';
import UserRoads from '../components/UserRoads';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { LoginPromptModal } from '../components/LoginPromptModal';
import { GUEST_USER } from '../constants/appDefaults';
import type { Quiz } from '../types';

const DashboardPage: React.FC = () => {
    const { logout, refreshUser, currentUser } = useAuth();
    const { availableQuizzes, userWithRank, allAttempts, subjects, skillTracks, studyCards, refreshData } = useData();
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
    const [loginPromptRedirect, setLoginPromptRedirect] = useState<string | undefined>(undefined);

    // Defensive fallbacks to avoid runtime crashes when backend returns unexpected shapes
    const safeQuizzes = Array.isArray(availableQuizzes) ? availableQuizzes : [];
    const safeSubjects = Array.isArray(subjects) ? subjects : [];
    const safeSkillTracks = Array.isArray(skillTracks) ? skillTracks : [];
    const safeStudyCards = Array.isArray(studyCards) ? studyCards : [];
    const safeAttempts = Array.isArray(allAttempts) ? allAttempts : [];

    const activeUser = userWithRank || currentUser || GUEST_USER;
    const userAttempts = currentUser ? safeAttempts.filter(a => a.userId === currentUser.userId) : [];

    const handleSelectQuiz = (quiz: Quiz) => {
        const quizId = quiz.id || quiz._id;
        if (!quizId) {
            console.error('Quiz missing ID:', quiz);
            showNotification('error', 'This quiz is missing an ID and cannot be opened. Please contact an administrator.');
            return;
        }

        const encodedId = encodeURIComponent(quizId);
        const quizPath = `/quiz/${encodedId}`;

        if (!currentUser) {
            setLoginPromptRedirect(quizPath);
            setIsLoginPromptOpen(true);
            return;
        }

        navigate(quizPath);
    };

    const handleViewProfile = () => {
        if (!currentUser) {
            setLoginPromptRedirect('/profile');
            setIsLoginPromptOpen(true);
            return;
        }
        navigate('/profile');
    };

    return (
        <>
            <UserRoads
                quizzes={safeQuizzes}
                subjects={safeSubjects}
                skillTracks={safeSkillTracks}
                studyCards={safeStudyCards}
                user={activeUser}
                attempts={userAttempts}
                onRefreshData={async () => {
                    if (currentUser) {
                        await Promise.all([refreshUser(), refreshData()]);
                    } else {
                        await refreshData();
                    }
                }}
                onSelectQuiz={handleSelectQuiz}
                onViewProfile={handleViewProfile}
                onViewLeaderboard={() => navigate('/leaderboard')}
                onLogout={logout}
            />

            <LoginPromptModal
                isOpen={isLoginPromptOpen}
                onClose={() => setIsLoginPromptOpen(false)}
                redirectPath={loginPromptRedirect}
            />
        </>
    );
};

export default DashboardPage;

