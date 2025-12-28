export interface Quiz {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    timeLimit: number;
    passingScore: number;
    icon: string;
    questions: Question[];
}

export interface Question {
    id: number;
    part: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    points: number;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    dateEarned: string;
}

export interface BadgeCriteria {
    type: 'total_attempts' | 'total_score' | 'streak' | 'level' | 'perfect_score' | 'speed_demon';
    threshold: number;
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
    createdAt?: string;
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
    answers: Record<string, string>; // questionId -> optionId
    completedAt: string;
    passed: boolean;
}
