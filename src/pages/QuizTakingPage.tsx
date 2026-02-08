import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuizTaking from '../components/QuizTaking';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { AttemptData } from '../lib/api';
import type { QuizResult } from '../types';
import { calculateLevel } from '../lib/gamification';


const QuizTakingPage: React.FC = () => {
    const { quizId: encodedQuizId } = useParams<{ quizId: string }>();
    const { availableQuizzes, userWithRank, refreshData } = useData();
    const { currentUser, updateUser } = useAuth();
    const navigate = useNavigate();

    // Decode the quiz ID to handle special characters
    const quizId = encodedQuizId ? decodeURIComponent(encodedQuizId) : '';

    // Find quiz
    const quiz = availableQuizzes.find(q => q.id === quizId || q._id === quizId);

    // If quiz not found (and data loaded), redirect or show error
    // But data might not be loaded yet? DataContext handles loading state. 
    // We can add loading check from useData later if needed.

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

    const submittingRef = useRef(false);

    const handleComplete = async (result: QuizResult) => {
        if (!currentUser || !quiz) return;

        // Prevent duplicate submissions
        if (submittingRef.current) {
            console.log('⚠️ Submission already in progress, ignoring duplicate');
            return;
        }

        submittingRef.current = true;

        try {
            const resolvedQuizId = quiz.id || quiz._id || quizId || '';
            const attempt: AttemptData = {
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

            // 1. Save Attempt (backend handles XP, coins, badges, roadmap progress)
            const savedAttempt = await api.saveAttempt(attempt);

            // 2. Optimistic local state update for instant feedback
            const xpGained = result.passed ? (quiz.xpReward ?? 50) : Math.floor((quiz.xpReward ?? 50) * 0.1);
            const coinsGained = result.passed ? (quiz.coinsReward ?? 10) : 0;
            const newXP = (currentUser.xp || 0) + xpGained;
            const newCoins = (currentUser.coins || 0) + coinsGained;

            const userUpdates = {
                totalScore: (currentUser.totalScore || 0) + result.score,
                totalAttempts: (currentUser.totalAttempts || 0) + 1,
                totalTime: (currentUser.totalTime || 0) + (result.timeTaken || 0),
                xp: newXP,
                level: calculateLevel(newXP),
                coins: newCoins,
                badges: [
                    ...(currentUser.badges || []),
                    ...(savedAttempt.newBadges || [])
                ],
            };
            updateUser(userUpdates);

            // 3. Navigate to results IMMEDIATELY — user sees results fast
            navigate('/results', { state: { result, quizId: resolvedQuizId } });

            // 4. Background sync — refresh data without blocking the user
            Promise.all([
                api.verifySession(currentUser.userId).then(fresh => {
                    if (fresh.valid && fresh.user) updateUser(fresh.user);
                }),
                refreshData()
            ]).catch(err => console.error('Background sync error:', err));

        } catch (error) {
            console.error('Error submitting quiz:', error);
            submittingRef.current = false; // Reset on error to allow retry
        }

    };

    if (!quiz || !currentUser) return <div>Loading...</div>; // Or not found

    return (
        <>
            <QuizTaking
                quiz={quiz}
                user={userWithRank || currentUser}
                onComplete={handleComplete}
                onBack={() => navigate('/')}
                powerUps={currentUser.powerUps}
                onPowerUpUsed={handlePowerUpUsed}
            />

        </>
    );
};

export default QuizTakingPage;
