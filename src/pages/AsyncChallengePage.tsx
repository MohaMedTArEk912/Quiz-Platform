import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuizTaking from '../components/QuizTaking';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import type { ChallengeData, QuizResult } from '../types';

const AsyncChallengePage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const { currentUser, updateUser } = useAuth();
    const { availableQuizzes, refreshData, loadingQuizzes } = useData();
    const navigate = useNavigate();
    const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadChallenge = async () => {
            if (!token || !currentUser) return;
            try {
                const data = await api.getChallenge(token);
                if (![data.fromId, data.toId].includes(currentUser.userId)) {
                    setError('You are not a participant in this challenge.');
                    return;
                }
                setChallengeData(data);
            } catch (err) {
                console.error(err);
                setError('Challenge link is invalid or expired.');
            } finally {
                setLoading(false);
            }
        };
        loadChallenge();
    }, [token, currentUser]);

    const handlePowerUpUsed = (type: string) => {
        if (!currentUser) return;
        const list = [...(currentUser.powerUps || [])];
        const idx = list.findIndex(p => p.type === type);
        if (idx >= 0 && list[idx].quantity > 0) {
            list[idx] = { ...list[idx], quantity: list[idx].quantity - 1 };
            updateUser({ powerUps: list });
            api.usePowerUp(type, currentUser.userId).catch(console.error);
        }
    };

    const handleComplete = async (result: QuizResult) => {
        if (!token || !currentUser || !challengeData) return;

        // Find quiz again here to be safe
        const quiz = availableQuizzes.find(q => q.id === challengeData.quizId || q._id === challengeData.quizId);
        if (!quiz) return;

        try {
            // 1. Submit Challenge Result
            await api.submitChallengeResult(token, {
                score: result.score,
                percentage: result.percentage,
                timeTaken: result.timeTaken || 0
            }, currentUser.userId);

            // 2. Save Standard Attempt
            const resolvedQuizId = quiz.id || quiz._id || challengeData.quizId || '';
            const attempt = {
                attemptId: crypto.randomUUID(),
                userId: currentUser.userId,
                userName: currentUser.name,
                userEmail: currentUser.email,
                quizId: resolvedQuizId,
                quizTitle: quiz.title,
                score: result.score,
                totalQuestions: result.totalQuestions,
                percentage: result.percentage,
                timeTaken: result.timeTaken || 0,
                answers: result.answers,
                completedAt: new Date().toISOString(),
                passed: result.passed,
                powerUpsUsed: result.powerUpsUsed || []
            };

            // Cast to any if strictly typed API complains, matching QuizTaking logic
            await api.saveAttempt(attempt as any);

            // 3. Update Gamification (Simplified)
            await api.verifySession().then(data => {
                if (data.user) updateUser(data.user);
            });

            await refreshData();

            navigate('/results', { state: { result, quizId: challengeData.quizId } });

        } catch (err) {
            console.error('Challenge submit error:', err);
        }
    };

    if (loading || loadingQuizzes) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-xl">Loading Challenge...</div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-red-500 text-xl">Error: {error}</div>
        </div>
    );

    if (!challengeData) return null;

    const quiz = availableQuizzes.find(q => q.id === challengeData.quizId || q._id === challengeData.quizId);

    if (!quiz) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <div className="text-xl text-yellow-400">Quiz data not available.</div>
            <p className="text-gray-400">The quiz for this challenge might have been deleted or is not accessible.</p>
            <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
            >
                Return to Home
            </button>
        </div>
    );

    return (
        <QuizTaking
            quiz={quiz}
            user={currentUser!}
            onComplete={handleComplete}
            onBack={() => navigate('/')}
            powerUps={currentUser!.powerUps}
            onPowerUpUsed={handlePowerUpUsed}
        />
    );
};

export default AsyncChallengePage;
