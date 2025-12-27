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

export interface UserData {
    userId: string;
    name: string;
    email: string;
    password?: string;
    createdAt?: string;
    totalScore?: number;
    totalAttempts?: number;
    rank?: number;
    id?: number;
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
    answers: Record<string, any>;
    completedAt: string;
}
