import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuizTaking from '../components/QuizTaking';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { AttemptData } from '../lib/api';
import type { QuizResult } from '../types';
import { calculateLevel, checkNewBadges } from '../lib/gamification';


const QuizTakingPage: React.FC = () => {
    const { quizId: encodedQuizId } = useParams<{ quizId: string }>();
    const { availableQuizzes, userWithRank, allBadges, refreshData } = useData();
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

            // 1. Save Attempt
            await api.saveAttempt(attempt);

            // 2. Calculate Gamification
            let xpGained = 0;
            let coinsGained = 0;

            if (result.passed) {
                xpGained = quiz.xpReward ?? 50;
                coinsGained = quiz.coinsReward ?? 10;
            } else {
                // Optional: Give simplified participation XP (e.g. 10% of reward) or 0
                xpGained = Math.floor((quiz.xpReward ?? 50) * 0.1);
            }

            const currentXP = currentUser.xp || 0;
            const newXP = currentXP + xpGained;
            const newLevel = calculateLevel(newXP);

            // Coins logic
            const currentCoins = currentUser.coins || 0;
            const newCoins = currentCoins + coinsGained;

            // Check badges
            const tempUserForBadges = {
                ...currentUser,
                totalScore: (currentUser.totalScore || 0) + result.score,
                totalAttempts: (currentUser.totalAttempts || 0) + 1,
                totalTime: (currentUser.totalTime || 0) + (result.timeTaken || 0),
                xp: newXP,
                level: newLevel,
                coins: newCoins
            };

            const newBadges = checkNewBadges(tempUserForBadges, allBadges, {
                score: result.score,
                maxScore: quiz.questions.reduce((sum, q) => sum + q.points, 0),
                timeSpent: result.timeTaken || 0
            });

            // 3. Update User - Include ALL user fields to prevent data loss
            const userUpdates = {
                totalScore: tempUserForBadges.totalScore,
                totalAttempts: tempUserForBadges.totalAttempts,
                totalTime: tempUserForBadges.totalTime,
                xp: newXP,
                level: newLevel,
                badges: [...(currentUser.badges || []), ...newBadges],
                coins: newCoins,
                // Preserve existing data that shouldn't change
                inventory: currentUser.inventory,
                powerUps: currentUser.powerUps,
                streak: currentUser.streak,
                friends: currentUser.friends,
                rank: currentUser.rank
            };

            // Update local state first
            updateUser(userUpdates);

            // Save to backend
            await api.updateUser(currentUser.userId, userUpdates);

            // 4. Unlock next module in skill track if quiz passed
            if (result.passed) {
                try {
                    // Find which subject and skill track this quiz belongs to
                    const subject = quiz.subjectId;
                    if (subject) {
                        // Get all skill tracks to find the one for this subject
                        const allTracks = await api.getSkillTracks();
                        const trackForSubject = allTracks.find((t: any) => t.subjectId === subject);
                        
                        if (trackForSubject) {
                            // Find which module contains this quiz
                            const currentModuleIndex = trackForSubject.modules.findIndex((m: any) =>
                                m.quizIds?.includes(resolvedQuizId)
                            );
                            
                            if (currentModuleIndex >= 0) {
                                // Mark current module as completed
                                const currentModuleId = trackForSubject.modules[currentModuleIndex].moduleId;
                                
                                // Get current progress
                                const currentProgress = await api.getUserRoadmapProgress(currentUser.userId, trackForSubject.trackId, currentUser.userId);
                                
                                const completedModules = new Set(currentProgress?.completedModules || []);
                                const unlockedModules = new Set(currentProgress?.unlockedModules || []);
                                
                                // Add current module to completed
                                completedModules.add(currentModuleId);
                                
                                // Unlock next module if it exists
                                if (currentModuleIndex + 1 < trackForSubject.modules.length) {
                                    const nextModuleId = trackForSubject.modules[currentModuleIndex + 1].moduleId;
                                    unlockedModules.add(nextModuleId);
                                }
                                
                                // Save updated progress
                                await api.updateUserRoadmapProgress(
                                    currentUser.userId,
                                    trackForSubject.trackId,
                                    {
                                        completedModules: Array.from(completedModules),
                                        unlockedModules: Array.from(unlockedModules)
                                    },
                                    currentUser.userId
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to unlock next module:', error);
                    // Don't fail the quiz completion if this fails
                }
            }

            // Fetch fresh user data from backend to ensure we have the latest
            try {
                const freshUserData = await api.verifySession(currentUser.userId);
                if (freshUserData.valid && freshUserData.user) {
                    updateUser(freshUserData.user);
                }
            } catch (error) {
                console.error('Failed to fetch fresh user data:', error);
            }

            // Refresh other data (attempts, leaderboard, etc.)
            await refreshData();

            // Navigate to results
            // Pass result state via Location State or Context?
            // Ideally we pass it in state so we don't need to fetch it or store it in context.
            navigate('/results', { state: { result, quizId: resolvedQuizId } });

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
