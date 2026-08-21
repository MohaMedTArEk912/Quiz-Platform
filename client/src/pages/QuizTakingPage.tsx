import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuizTaking from '../components/QuizTaking';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { AttemptData } from '../lib/api';
import type { Quiz, QuizResult, PoolProgressData } from '../types';
import { calculateLevel } from '../lib/gamification';

const QuizTakingPage: React.FC = () => {
    const { quizId: encodedQuizId } = useParams<{ quizId: string }>();
    const { availableQuizzes, userWithRank, refreshData } = useData();
    const { currentUser, updateUser } = useAuth();
    const navigate = useNavigate();

    // Decode the quiz ID to handle special characters
    const quizId = encodedQuizId ? decodeURIComponent(encodedQuizId) : '';

    // Find base quiz from cache/DataContext
    const baseQuiz = availableQuizzes.find(q => q.id === quizId || q._id === quizId);

    // Dynamic session quiz (tailored questions for pool quizzes)
    const [sessionQuiz, setSessionQuiz] = useState<Quiz | null>(null);
    const [poolProgress, setPoolProgress] = useState<PoolProgressData | null>(null);
    const [isLoadingSession, setIsLoadingSession] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadSession = async () => {
            if (!quizId) return;

            const resolvedQuiz = baseQuiz || { id: quizId, title: 'Quiz', description: '', category: '', difficulty: 'Medium', timeLimit: 0, passingScore: 70, icon: '📝', questions: [] } as Quiz;
            const isPool = Boolean(
                resolvedQuiz.isQuestionPool ||
                resolvedQuiz.quizType === 'pool' ||
                (resolvedQuiz.questionsPerAttempt && resolvedQuiz.questionsPerAttempt < (resolvedQuiz.questions?.length || 0))
            );

            if (isPool) {
                try {
                    const sessionData = await api.getQuizSession(quizId, currentUser?.userId);
                    if (isMounted && sessionData && sessionData.quiz) {
                        setSessionQuiz(sessionData.quiz);
                        if (sessionData.isQuestionPool) {
                            setPoolProgress({
                                seenCount: sessionData.seenCount || 0,
                                totalCount: sessionData.totalPoolQuestions || sessionData.quiz.questions.length,
                                percentage: sessionData.poolCompletionPercentage || 0,
                                cycle: sessionData.completedCycles || 0,
                                remainingCount: sessionData.remainingCount
                            });
                        }
                    }
                } catch (err) {
                    console.warn('⚠️ Could not load remote pool session, using fallback:', err);
                    if (isMounted) {
                        setSessionQuiz(resolvedQuiz);
                    }
                } finally {
                    if (isMounted) setIsLoadingSession(false);
                }
            } else {
                if (isMounted) {
                    setSessionQuiz(resolvedQuiz);
                    setIsLoadingSession(false);
                }
            }
        };

        loadSession();

        return () => {
            isMounted = false;
        };
    }, [quizId, baseQuiz, currentUser?.userId]);

    const handlePowerUpUsed = (type: string) => {
        if (!currentUser) return;
        const dbType = type === 'time' ? 'time_freeze' : type;
        const list = [...(currentUser.powerUps || [])];
        const idx = list.findIndex(p => p.type === dbType);
        if (idx >= 0 && list[idx].quantity > 0) {
            list[idx] = { ...list[idx], quantity: list[idx].quantity - 1 };
            updateUser({ powerUps: list });
            api.usePowerUp(dbType, currentUser.userId).catch(console.error);
        }
    };

    const submittingRef = useRef(false);

    const handleComplete = async (result: QuizResult) => {
        const activeQuiz = sessionQuiz || baseQuiz;
        if (!currentUser || !activeQuiz) return;

        // Prevent duplicate submissions
        if (submittingRef.current) {
            console.log('⚠️ Submission already in progress, ignoring duplicate');
            return;
        }

        submittingRef.current = true;

        try {
            const resolvedQuizId = activeQuiz.id || activeQuiz._id || quizId || '';
            const isPool = Boolean(
                activeQuiz.isQuestionPool ||
                activeQuiz.quizType === 'pool' ||
                (activeQuiz.questionsPerAttempt && activeQuiz.questionsPerAttempt < (baseQuiz?.questions?.length || activeQuiz.questions.length))
            );

            const questionIds = activeQuiz.questions.map(q => q.id);

            const attempt: AttemptData = {
                attemptId: crypto.randomUUID(),
                userId: currentUser.userId,
                userName: currentUser.name,
                userEmail: currentUser.email,
                quizId: resolvedQuizId,
                quizTitle: activeQuiz.title,
                score: result.score,
                totalQuestions: result.totalQuestions,
                percentage: result.percentage,
                timeTaken: result.timeTaken || 0,
                answers: result.answers,
                completedAt: new Date().toISOString(),
                passed: result.passed,
                powerUpsUsed: result.powerUpsUsed || [],
                isQuestionPool: isPool,
                questionIds: questionIds,
                attemptQuestions: activeQuiz.questions
            };

            // 1. Save Attempt (backend handles XP, coins, badges, roadmap progress, pool progress)
            const savedAttempt = await api.saveAttempt(attempt);

            // 2. Optimistic local state update for instant feedback
            const xpGained = result.passed ? (activeQuiz.xpReward ?? 50) : Math.floor((activeQuiz.xpReward ?? 50) * 0.1);
            const coinsGained = result.passed ? (activeQuiz.coinsReward ?? 10) : 0;
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

            // Attach final poolProgress and questions to the result
            const finalResult: QuizResult = {
                ...result,
                isQuestionPool: isPool,
                poolProgress: savedAttempt.poolProgress || poolProgress || undefined,
                attemptQuestions: activeQuiz.questions
            };

            // 3. Navigate to results IMMEDIATELY with attempt questions and pool progress
            navigate('/results', {
                state: {
                    result: finalResult,
                    quizId: resolvedQuizId,
                    attemptQuestions: activeQuiz.questions,
                    poolProgress: savedAttempt.poolProgress || poolProgress || undefined
                }
            });

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

    const activeQuiz = sessionQuiz || baseQuiz;

    if (isLoadingSession || !activeQuiz || !currentUser) {
        return (
            <div className="h-screen bg-gray-50 dark:bg-[#080812] flex items-center justify-center text-gray-500">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-600 rounded-full animate-spin" />
                    <span className="text-sm font-bold">Preparing Questions...</span>
                </div>
            </div>
        );
    }

    const mappedPowerUps = currentUser.powerUps?.map(p => ({
        ...p,
        type: p.type === 'time_freeze' ? 'time' : p.type
    })) || [];

    return (
        <QuizTaking
            quiz={activeQuiz}
            user={userWithRank || currentUser}
            onComplete={handleComplete}
            onBack={() => navigate('/')}
            powerUps={mappedPowerUps}
            onPowerUpUsed={handlePowerUpUsed}
            onUserUpdate={(updates) => updateUser(updates)}
            poolProgress={poolProgress || undefined}
        />
    );
};

export default QuizTakingPage;
