import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import VSGame from '../components/multiplayer/VSGame';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { QuizResult } from '../types';

const VsGamePage: React.FC = () => {
    const { state } = useLocation(); // Expecting { quizId, opponent, roomId }
    const { currentUser, updateUser } = useAuth();
    const { availableQuizzes } = useData();
    const navigate = useNavigate();

    if (!state || !state.quizId || !state.opponent || !state.roomId) {
        return <Navigate to="/" replace />;
    }

    const { quizId, opponent, roomId } = state;
    const quiz = availableQuizzes.find(q => q.id === quizId || q._id === quizId);

    if (!currentUser || !quiz) return <Navigate to="/" replace />;

    const handlePowerUpUsed = (type: string) => {
        if (!currentUser) return;
        const list = [...(currentUser.powerUps || [])];
        const idx = list.findIndex(p => p.type === type);
        if (idx >= 0 && list[idx].quantity > 0) {
            list[idx] = { ...list[idx], quantity: list[idx].quantity - 1 };
            updateUser({ powerUps: list });
            // api.usePowerUp... (assuming VSGame or logic handles sync, or we do it here)
        }
    };

    return (
        <VSGame
            quiz={quiz}
            currentUser={currentUser}
            opponent={opponent}
            roomId={roomId}
            onComplete={(result: QuizResult) => {
                // Handle completion (Save attempt, etc.)
                // Similar to QuizTakingPage logic.
                // For VS Game, result handling might be different or shared.
                navigate('/results', { state: { result, quizId } });
            }}
            onBack={() => navigate('/')}
            powerUps={currentUser.powerUps}
            onPowerUpUsed={handlePowerUpUsed}
        />
    );
};

export default VsGamePage;
