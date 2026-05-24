import React from 'react';
import { Code } from 'lucide-react';

interface EmptyStateProps {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, actionLabel, onAction }) => {
    return (
        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <Code className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">{message}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
