import type { UserData, Badge, BadgeDefinition } from '../types';

export const XP_PER_LEVEL = 1000;
export const XP_PER_QUIZ_POINT = 10;
export const XP_BONUS_FULL_SCORE = 500;
export const XP_STREAK_BONUS = 50;

export function calculateLevel(xp: number): number {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function calculateXPForQuiz(score: number, maxScore: number, timeSpentSeconds: number): number {
    let xp = score * XP_PER_QUIZ_POINT;

    // Bonus for perfect score
    if (score === maxScore && maxScore > 0) {
        xp += XP_BONUS_FULL_SCORE;
    }

    // Bonus for speed (if decent score and fast)
    if (score > (maxScore * 0.5) && timeSpentSeconds < 60) {
        xp += 100;
    }

    return Math.round(xp);
}

export function checkNewBadges(user: UserData, allBadges: BadgeDefinition[], currentQuizState?: { score: number, maxScore: number, timeSpent: number }): Badge[] {
    const newBadges: Badge[] = [];
    const existingBadgeIds = new Set(user.badges.map(b => b.id));

    allBadges.forEach(badge => {
        if (existingBadgeIds.has(badge.id)) return;

        let earned = false;
        const { type, threshold } = badge.criteria;

        switch (type) {
            case 'total_attempts': {
                // Check if user has reach attempts
                // Include current attempt if coming from quiz complete
                const currentAttempts = user.totalAttempts; // User object should already have updated attempts if optimistic, or check flow
                if (currentAttempts >= threshold) earned = true;
                break;
            }
            case 'total_score':
                if (user.totalScore >= threshold) earned = true;
                break;
            case 'streak':
                if (user.streak >= threshold) earned = true;
                break;
            case 'level':
                if (user.level >= threshold) earned = true;
                break;
            case 'perfect_score':
                if (currentQuizState) {
                    const { score, maxScore } = currentQuizState;
                    if (score === maxScore && maxScore > 0) earned = true;
                }
                break;
            case 'speed_demon':
                if (currentQuizState) {
                    const { score, timeSpent } = currentQuizState;
                    // Assuming speed demon threshold is in seconds (e.g. 60)
                    // And implies a "pass" or >0 score usually
                    if (timeSpent <= threshold && score > 0) earned = true;
                }
                break;
        }

        if (earned) {
            newBadges.push({
                id: badge.id,
                name: badge.name,
                description: badge.description,
                icon: badge.icon,
                dateEarned: new Date().toISOString()
            });
        }
    });

    return newBadges;
}
