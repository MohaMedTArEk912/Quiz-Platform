import React from 'react';
import QuizCard from './QuizCard';
import EmptyState from '../common/EmptyState';
import type { Quiz } from '../../types';

interface QuizGridProps {
    quizzes: Quiz[];
    onExport: (quiz: Quiz) => void;
    onEdit: (quiz: Quiz) => void;
    onDelete: (id: string) => void;
    onCreateFirstQuiz?: () => void;
}

const QuizGrid: React.FC<QuizGridProps> = ({ quizzes, onExport, onEdit, onDelete, onCreateFirstQuiz }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
            {quizzes.map(quiz => (
                <QuizCard
                    key={quiz.id || quiz._id} // Handle potential _id if present in data
                    quiz={quiz}
                    onExport={onExport}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
            {quizzes.length === 0 && (
                <EmptyState
                    message="No quizzes found in this collection"
                    actionLabel="Create First Quiz"
                    onAction={onCreateFirstQuiz}
                />
            )}
        </div>
    );
};

export default QuizGrid;
