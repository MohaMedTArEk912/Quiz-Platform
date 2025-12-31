import React from 'react';
import DailyChallenge from '../components/engage/DailyChallenge';
import PageLayout from '../layouts/PageLayout';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';

const DailyChallengePage: React.FC = () => {
    const { currentUser, updateUser } = useAuth();
    const { availableQuizzes } = useData();
    const navigate = useNavigate();

    if (!currentUser) return null;

    return (
        <PageLayout title="Daily Challenge">
            <DailyChallenge
                user={currentUser}
                quizzes={availableQuizzes}
                onStart={(quiz) => {
                    const quizId = quiz.id || quiz._id;
                    if (!quizId) return;
                    const encodedId = encodeURIComponent(quizId);
                    navigate(`/quiz/${encodedId}`);
                }}
                onUserUpdate={(u) => updateUser(u)}
            />
        </PageLayout>
    );
};

export default DailyChallengePage;
