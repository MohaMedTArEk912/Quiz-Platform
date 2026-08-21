import type { Quiz, AttemptData } from '../types';

export interface QuizPoolStatus {
    isPool: boolean;
    totalQuestions: number;
    seenCount: number;
    remainingCount: number;
    percentage: number;
    cycle: number;
    isFullyCompleted: boolean;
    hasStarted: boolean;
    questionsPerAttempt: number;
}

/**
 * Determines whether a quiz behaves as a Question Pool
 */
export const isQuestionPoolQuiz = (quiz: Quiz | null | undefined): boolean => {
    if (!quiz) return false;
    const questionsLength = quiz.questions?.length || 0;
    return Boolean(
        quiz.quizType === 'pool' ||
        quiz.isQuestionPool ||
        (quiz.questionsPerAttempt && quiz.questionsPerAttempt < questionsLength)
    );
};

/**
 * Calculates current Question Pool status for a quiz given the user's attempts
 */
export const getQuizPoolStatus = (
    quiz: Quiz | null | undefined,
    attempts: AttemptData[] = []
): QuizPoolStatus => {
    if (!quiz) {
        return {
            isPool: false,
            totalQuestions: 0,
            seenCount: 0,
            remainingCount: 0,
            percentage: 0,
            cycle: 0,
            isFullyCompleted: false,
            hasStarted: false,
            questionsPerAttempt: 10,
        };
    }

    const quizId = quiz.id || quiz._id || '';
    const totalQuestions = quiz.questions?.length || 0;
    const isPool = isQuestionPoolQuiz(quiz);
    const questionsPerAttempt = quiz.questionsPerAttempt || (isPool ? 10 : totalQuestions);

    const quizAttempts = (attempts || []).filter(a => {
        if (!a) return false;
        return (
            a.quizId === quizId ||
            (quiz._id && a.quizId === String(quiz._id)) ||
            (quiz.id && a.quizId === String(quiz.id))
        );
    });

    if (quizAttempts.length === 0) {
        return {
            isPool,
            totalQuestions,
            seenCount: 0,
            remainingCount: totalQuestions,
            percentage: 0,
            cycle: 0,
            isFullyCompleted: false,
            hasStarted: false,
            questionsPerAttempt,
        };
    }

    // Sort descending by completion date
    const sortedAttempts = [...quizAttempts].sort(
        (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    );
    const latestAttempt = sortedAttempts[0];

    if (isPool) {
        // If latest attempt has explicit poolProgress
        if (latestAttempt?.poolProgress) {
            const p = latestAttempt.poolProgress;
            const seenCount = p.seenCount ?? 0;
            const totalCount = p.totalCount || totalQuestions;
            const cycle = p.cycle ?? 0;
            const remainingCount = p.remainingCount !== undefined
                ? p.remainingCount
                : Math.max(0, totalCount - seenCount);
            const percentage = p.percentage !== undefined
                ? p.percentage
                : (totalCount > 0 ? Math.round((seenCount / totalCount) * 100) : 0);
            const isFullyCompleted = Boolean(
                p.justCompletedPool ||
                (seenCount >= totalCount && totalCount > 0) ||
                (remainingCount === 0 && seenCount > 0)
            );

            return {
                isPool: true,
                totalQuestions: totalCount,
                seenCount,
                remainingCount,
                percentage,
                cycle,
                isFullyCompleted,
                hasStarted: true,
                questionsPerAttempt,
            };
        }

        // Fallback: accumulate unique question IDs seen across all attempts
        const seenSet = new Set<string>();
        quizAttempts.forEach(a => {
            if (Array.isArray(a.questionIds) && a.questionIds.length > 0) {
                a.questionIds.forEach(id => seenSet.add(String(id)));
            } else if (a.answers && typeof a.answers === 'object') {
                Object.keys(a.answers).forEach(id => seenSet.add(String(id)));
            }
        });

        const seenCount = Math.min(totalQuestions, seenSet.size);
        const remainingCount = Math.max(0, totalQuestions - seenCount);
        const percentage = totalQuestions > 0 ? Math.round((seenCount / totalQuestions) * 100) : 0;
        const isFullyCompleted = totalQuestions > 0 && seenCount >= totalQuestions;

        return {
            isPool: true,
            totalQuestions,
            seenCount,
            remainingCount,
            percentage,
            cycle: 0,
            isFullyCompleted,
            hasStarted: true,
            questionsPerAttempt,
        };
    }

    // Regular non-pool quiz with at least one attempt
    return {
        isPool: false,
        totalQuestions,
        seenCount: totalQuestions,
        remainingCount: 0,
        percentage: 100,
        cycle: 0,
        isFullyCompleted: true,
        hasStarted: true,
        questionsPerAttempt,
    };
};

/**
 * Calculates overall Subject / Road progress percentage considering Question Pool completion
 */
export const calculateSubjectProgress = (
    subjectQuizzes: Quiz[] = [],
    attempts: AttemptData[] = []
): number => {
    if (!subjectQuizzes || subjectQuizzes.length === 0) return 0;

    let totalPoints = 0;
    subjectQuizzes.forEach(quiz => {
        const poolStatus = getQuizPoolStatus(quiz, attempts);
        if (poolStatus.isPool) {
            // For pool quizzes, progress is based on proportion of pool seen
            totalPoints += poolStatus.percentage;
        } else {
            // For regular quizzes, 100% if attempted, 0% if not
            totalPoints += poolStatus.hasStarted ? 100 : 0;
        }
    });

    return Math.round(totalPoints / subjectQuizzes.length);
};
