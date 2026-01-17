import { useMemo } from 'react';
import type { Quiz } from '../types';

export const useQuizzesBySubject = (quizzes: Quiz[]) => {
    return useMemo(() => {
        const map: Record<string, number> = {};
        quizzes.forEach(q => {
            const key = q.subjectId || 'uncategorized';
            map[key] = (map[key] || 0) + 1;
        });
        return map;
    }, [quizzes]);
};
