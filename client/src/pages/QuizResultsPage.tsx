import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import QuizResults from '../components/QuizResults';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const QuizResultsPage: React.FC = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { availableQuizzes, userWithRank } = useData();

    if (!state || !state.result || !state.quizId) {
        return <Navigate to="/" replace />;
    }

    const { result, quizId } = state;
    const quiz = availableQuizzes.find(q => q.id === quizId || q._id === quizId);

    if (!currentUser || !quiz) return <Navigate to="/" replace />;

    return (
        <QuizResults
            result={result}
            quiz={quiz}
            user={userWithRank || currentUser}
            onBackToQuizzes={() => navigate('/')}
            onRetake={() => navigate(`/quiz/${quizId}`)}
        />
    );
};

export default QuizResultsPage;
