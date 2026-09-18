import React from 'react';
import QuizCard from './QuizCard';
import EmptyState from '../common/EmptyState';
import type { Quiz } from '../../types';

interface QuizGridProps {
    quizzes: Quiz[];
    onExport: (quiz: Quiz) => void;
    onEdit: (quiz: Quiz) => void;
    onDelete: (id: string) => void;
    onShare: (quiz: Quiz) => void;
    onPlay?: (quiz: Quiz) => void;
    onHost?: (quiz: Quiz) => void;
    onReplace?: (quiz: Quiz) => void;
    onCreateFirstQuiz?: () => void;
    selectedQuizIds?: string[];
    onToggleSelect?: (id: string) => void;
}

const QuizGrid: React.FC<QuizGridProps> = ({ 
    quizzes, 
    onExport, 
    onEdit, 
    onDelete, 
    onShare, 
    onPlay, 
    onHost, 
    onReplace, 
    onCreateFirstQuiz,
    selectedQuizIds = [],
    onToggleSelect
}) => {
    const safeQuizzes = Array.isArray(quizzes) ? quizzes : [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
            {safeQuizzes.map(quiz => {
                const qId = quiz.id || quiz._id || '';
                return (
                    <QuizCard
                        key={qId}
                        quiz={quiz}
                        onExport={onExport}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onShare={onShare}
                        onPlay={onPlay}
                        onHost={onHost}
                        onReplace={onReplace}
                        isSelected={selectedQuizIds.includes(qId)}
                        onToggleSelect={onToggleSelect}
                    />
                );
            })}
            {safeQuizzes.length === 0 && (
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
