import React from 'react';
import StackCard from './StackCard';
import type { Subject } from '../../types';

interface StackGridProps {
    subjects: Subject[];
    quizzesBySubject: Record<string, number>;
    onSelectStack: (id: string) => void;
    onImport: (id: string) => void;
    onEdit: (subject: Subject) => void;
    onDelete: (subject: Subject) => void;
}

const StackGrid: React.FC<StackGridProps> = ({
    subjects,
    quizzesBySubject,
    onSelectStack,
    onImport,
    onEdit,
    onDelete
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
            <StackCard
                isUncategorized
                quizCount={quizzesBySubject['uncategorized'] || 0}
                onSelect={() => onSelectStack('uncategorized')}
            />
            {subjects.map(subject => (
                <StackCard
                    key={subject._id}
                    subject={subject}
                    quizCount={quizzesBySubject[subject._id] || 0}
                    onSelect={() => onSelectStack(subject._id)}
                    onImport={onImport}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};

export default StackGrid;
