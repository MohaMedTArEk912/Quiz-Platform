import type { UserData, BadgeDefinition, Badge } from '../types';

export const calculateLevel = (xp: number): number => {
    // Level = sqrt(XP / 100) + 1
    return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
};

export const calculateXPForQuiz = (score: number, maxScore: number, timeTakenSeconds: number): number => {
    // Base XP = score * 10
    let xp = score * 10;

    // Perfect score bonus
    if (score === maxScore && maxScore > 0) {
        xp += 50;
    }

    // Time bonus: simple boost for finishing quickly with a non-zero score
    if (score > 0 && timeTakenSeconds < 60) {
        xp += 10;
    }

    return Math.round(xp);
};

export const checkNewBadges = (
    user: UserData,
    allBadges: BadgeDefinition[],
    currentAttempt: { score: number; maxScore: number; timeSpent: number }
): Badge[] => {
    // Safety checks for undefined arrays
    if (!allBadges || !Array.isArray(allBadges)) {
        return [];
    }

    const newBadges: Badge[] = [];
    const existingBadgeIds = new Set((user.badges || []).map(b => b.id));

    for (const def of allBadges) {
        if (existingBadgeIds.has(def.id)) continue;

        let earned = false;
        const { type, threshold = 1 } = def.criteria;

        switch (type) {
            case 'total_score':
                earned = (user.totalScore || 0) >= threshold;
                break;
            case 'total_attempts':
                earned = (user.totalAttempts || 0) >= threshold;
                break;
            case 'level':
                earned = (user.level || 1) >= threshold;
                break;
            case 'streak':
                earned = (user.streak || 0) >= threshold;
                break;
            case 'perfect_score':
                // Check if THIS attempt was perfect
                if (currentAttempt.score === currentAttempt.maxScore && currentAttempt.maxScore > 0) {
                    // This type usually means "Earned X perfect scores". 
                    // But if it means "Get a perfect score once", then yes.
                    // If threshold is 1, yes. If threshold > 1, we need to track count of perfect scores.
                    // For simplicity, assuming threshold 1 = "First perfect score".
                    if (threshold === 1) earned = true;
                }
                break;
            case 'speed_demon':
                // Threshold might be seconds? "Finish in under X seconds"?
                // Or "Finish X quizzes quickly?"
                // Let's assume threshold is time limit for THIS quiz? No, threshold is usually count or generic value.
                // logic ambiguous without more context, skipping speed_demon for now or simple check
                if (currentAttempt.timeSpent < 60 && threshold === 1) earned = true;
                break;
        }

        if (earned) {
            newBadges.push({
                id: def.id,
                name: def.name,
                description: def.description,
                icon: def.icon,
                dateEarned: new Date().toISOString()
            });
        }
    }

    return newBadges;
};
