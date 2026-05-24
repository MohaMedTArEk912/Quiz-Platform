import { useState, useMemo } from 'react';
import type { Quiz } from '../types';

interface UseQuizFiltersProps {
    quizzes: Quiz[]; // These should be the local/current quizzes
    selectedStackId: string | null;
    viewMode: 'stacks' | 'list';
}

export const useQuizFilters = ({ quizzes, selectedStackId, viewMode }: UseQuizFiltersProps) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredQuizzes = useMemo(() => {
        return quizzes.filter(q => {
            // Filter by tournament flags
            if (q.isTournamentOnly) return false;

            // Filter by Search
            const matchesSearch = (q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.description.toLowerCase().includes(searchTerm.toLowerCase()));

            // Filter by Stack (Subject)
            if (viewMode === 'list' && selectedStackId) {
                if (selectedStackId === 'uncategorized') {
                    return (!q.subjectId) && matchesSearch;
                }
                return q.subjectId === selectedStackId && matchesSearch;
            }

            return matchesSearch;
        }).sort((a, b) => {
            const getNum = (str: string) => {
                const match = str.match(/(\d+)/);
                return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
            };
            const numA = getNum(a.title);
            const numB = getNum(b.title);
            if (numA !== numB) return numA - numB;
            return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [quizzes, searchTerm, selectedStackId, viewMode]);

    return {
        searchTerm,
        setSearchTerm,
        filteredQuizzes
    };
};
