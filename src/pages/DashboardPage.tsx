import React from 'react';
import QuizList from '../components/QuizList';
import InstallPWA from '../components/InstallPWA';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

const DashboardPage: React.FC = () => {
    const { logout } = useAuth();
    const { availableQuizzes, userWithRank, allAttempts } = useData();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();

    if (!currentUser) return null;

    return (
        <>
            <InstallPWA />
            <QuizList
                quizzes={availableQuizzes}
                user={userWithRank || currentUser}
                attempts={allAttempts.filter(a => a.userId === currentUser.userId)}
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
