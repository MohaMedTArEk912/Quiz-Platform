import React, { useEffect } from 'react';
import UserRoads from '../components/UserRoads';
import InstallPWA from '../components/InstallPWA';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

const DashboardPage: React.FC = () => {
    const { logout, refreshUser } = useAuth();
    const { availableQuizzes, userWithRank, allAttempts, subjects, skillTracks, studyCards, refreshData } = useData();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();

    // Refresh user data and all data when component mounts to get latest admin updates
    useEffect(() => {
        const loadLatestData = async () => {
            try {
                await Promise.all([refreshUser(), refreshData()]);
            } catch (error) {
                console.error('Failed to refresh data:', error);
            }
        };
        loadLatestData();
    }, []);

    if (!currentUser) return null;

    return (
        <>
            <InstallPWA />
            <UserRoads
                quizzes={availableQuizzes}
                subjects={subjects}
                skillTracks={skillTracks}
                studyCards={studyCards}
                user={userWithRank || currentUser}
                attempts={allAttempts.filter(a => a.userId === currentUser.userId)}
                onRefreshData={async () => {
                    await Promise.all([refreshUser(), refreshData()]);
                }}
                onSelectQuiz={(quiz) => {
                    const quizId = quiz.id || quiz._id;
                    if (!quizId) {
                        console.error('Quiz missing ID:', quiz);
                        showNotification('error', 'This quiz is missing an ID and cannot be opened. Please contact an administrator.');
                        return;
                    }
                    // Encode the quiz ID to handle special characters like slashes
                    const encodedId = encodeURIComponent(quizId);
                    navigate(`/quiz/${encodedId}`);
                }}
                onViewProfile={() => navigate('/profile')}
                onViewLeaderboard={() => navigate('/leaderboard')}
                onLogout={logout}
            />
        </>
    );
};

export default DashboardPage;
