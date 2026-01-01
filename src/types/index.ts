export interface Quiz {
    id: string;
    _id?: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    timeLimit: number;
    passingScore: number;
    coinsReward?: number;
    xpReward?: number;
    icon: string;
    isTournamentOnly?: boolean;
    linkedTrackId?: string;
    linkedModuleId?: string;
    questions: Question[];
}

export interface Question {
    id: number;
    type?: 'multiple-choice' | 'text';
    part: string;
    question: string;
    options?: string[];
    correctAnswer?: number;
    explanation: string;
    points: number;
    imageUrl?: string;
    codeSnippet?: string;
    audioUrl?: string;
}

export interface DetailedAnswer {
    selected: string | number;
    isCorrect: boolean;
    type: string;
}

export type AttemptAnswers = Record<number, DetailedAnswer | string | number | null | undefined>;

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    dateEarned: string;
}

export interface BadgeCriteria {
    type: 'total_attempts' | 'total_score' | 'streak' | 'level' |
    'perfect_score' | 'speed_demon' | 'quiz_completion' |
    'exam_pass' | 'tournament_win' | 'tournament_participate' |
    'track_completion' | 'module_completion' | 'friend_count' |
    'challenge_wins' | 'manual';
    threshold?: number;
    quizId?: string;
    trackId?: string;
    tournamentId?: string;
    operator?: '>=' | '>' | '=' | '<' | '<=';
}

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    criteria: BadgeCriteria;
}

export interface UserData {
    userId: string;
    name: string;
    email: string;
    role?: 'user' | 'admin';
    totalScore: number;
    totalTime: number; // in seconds
    totalAttempts: number;
    rank?: number; // Optional, calculated dynamically

    // Gamification
    xp: number;
    level: number;
    streak: number;
    lastLoginDate: string;
    badges: Badge[];
    avatar?: AvatarConfig;
    unlockedItems?: string[];
    createdAt?: string;
    friends?: string[]; // userIds
    friendRequests?: {
        from: string;
        to: string;
        status: 'pending' | 'accepted' | 'rejected';
        createdAt: string;
    }[];
    coins?: number;
    inventory?: { itemId: string; quantity: number }[];
    powerUps?: { type: string; quantity: number }[];
    dailyChallengeDate?: string;
    dailyChallengeCompleted?: boolean;
    dailyChallengeStreak?: number;
    skillTracks?: {
        trackId: string;
        unlockedModules: string[];
        completedModules: string[];
    }[];
    clanId?: string;
}

export interface AvatarConfig {
    skinColor: string;
    hairStyle: string;
    hairColor: string;
    accessory: string;
    backgroundColor: string;
    mood: 'happy' | 'neutral' | 'cool' | 'excited';
    gender: 'male' | 'female';
    clothing: 'shirt' | 'hoodie' | 'blazer' | 'dress' | 'tshirt';
}

export interface AttemptData {
    id?: number;
    attemptId: string;
    userId: string;
    userName: string;
    userEmail: string;
    quizId: string;
    quizTitle: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    timeTaken: number;
    answers: AttemptAnswers; // questionId -> optionId (for multiple choice) or answer text or answer object
    reviewStatus?: 'completed' | 'pending' | 'reviewed';
    feedback?: Record<string, unknown>;
    completedAt: string;
    passed: boolean;
    powerUpsUsed?: string[];
}

export interface QuizResult {
    score: number;
    totalQuestions: number;
    percentage: number;
    timeTaken: number;
    answers: AttemptAnswers;
    passed: boolean;
    reviewStatus?: 'completed' | 'pending' | 'reviewed';
    powerUpsUsed?: string[];
}

export interface ChallengeData {
    token: string;
    quizId: string;
    fromId: string;
    toId: string;
    status: 'pending' | 'completed';
    fromResult?: {
        score: number;
        percentage: number;
        timeTaken: number;
        completedAt: string;
    } | null;
    toResult?: {
        score: number;
        percentage: number;
        timeTaken: number;
        completedAt: string;
    } | null;
    createdAt: string;
    quiz?: {
        id: string;
        title: string;
        description?: string;
        icon?: string;
        timeLimit?: number;
    };
    fromUser?: { userId: string; name: string };
    toUser?: { userId: string; name: string };
}

export interface ShopItem {
    itemId: string;
    name: string;
    description?: string;
    type: string;
    price: number;
    payload?: Record<string, unknown>;
}

export interface SkillModule {
    moduleId: string;
    title: string;
    description?: string;
    quizId?: string;
    badgeId?: string;
}

export interface SkillTrack {
    trackId: string;
    title: string;
    description?: string;
    category?: string;
    icon?: string;
    modules: SkillModule[];
}

export interface Tournament {
    tournamentId: string;
    name: string;
    description?: string;
    startsAt: string;
    endsAt: string;
    status: string;
    quizIds?: string[];
    participants?: string[];
    rewardBadgeId?: string;
    rewardItemId?: string;
}

export interface DailyChallengeDef {
    date: string; // ISO date
    title: string;
    description: string;
    quizId?: string;
    criteria?: {
        type: 'complete_quiz' | 'min_score' | 'speed_run';
        threshold: number;
    };
    rewardCoins: number;
    rewardXP: number;
    rewardBadgeId?: string;
    rewardItemId?: string;
}

export interface StudyCard {
    id: string;
    title: string;
    content: string;
    category: string;
    language?: string;
    tags?: string[];
    createdAt: string;
}

// Badge Tree System Types
export interface BadgeNode {
    badgeId: string;
    name: string;
    description: string;
    icon: string;
    unlockCriteria: BadgeCriteria[];
    rewards: {
        xp: number;
        coins: number;
        powerUps?: { type: string; quantity: number }[];
    };
    color?: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    trees: string[];
    createdAt: string;
    updatedAt?: string;
}

export interface BadgeTreeNode {
    badgeId: string;
    position: {
        x: number;
        y: number;
        tier: number;
    };
    prerequisites: string[];
    isRoot: boolean;
    isSpecial: boolean;
    badge?: BadgeNode; // Populated badge details
    isUnlocked?: boolean; // User-specific
    canUnlock?: boolean; // User-specific
    userBadge?: Badge; // User's earned badge
}

export interface BadgeTree {
    treeId: string;
    name: string;
    description?: string;
    type: 'basic' | 'track';
    trackId?: string;
    icon?: string;
    isActive: boolean;
    nodes: BadgeTreeNode[];
    createdAt: string;
    updatedAt: string;
}

export interface UserBadgeProgress {
    treeId: string;
    treeName: string;
    treeType: 'basic' | 'track';
    treeIcon?: string;
    totalBadges: number;
    earnedBadges: number;
    progress: number; // percentage
    nextUnlockable: BadgeNode[];
    recentlyEarned: Badge[];
}

export interface ClanMember {
    userId: string;
    role: 'leader' | 'elder' | 'member';
    joinedAt: string;
    contribution: number;
    name?: string;
    avatar?: AvatarConfig;
    totalScore?: number;
}

export interface Clan {
    clanId: string;
    name: string;
    tag: string;
    description: string;
    leaderId: string;
    totalXP: number;
    level: number;
    isPublic: boolean;
    members: ClanMember[];
    createdAt: string;
}
