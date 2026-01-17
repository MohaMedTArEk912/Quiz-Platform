import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import type { Subject } from '../../types';

interface StackDeleteModalProps {
    isOpen: boolean;
    subject: Subject | null;
    onClose: () => void;
    onDelete: () => void;
}

const StackDeleteModal: React.FC<StackDeleteModalProps> = ({ isOpen, subject, onClose, onDelete }) => {
    if (!isOpen || !subject) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20">
                    <Trash2 className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Delete Stack?</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
                    Are you sure you want to delete "{subject.title}"? This will also uncategorize all its quizzes.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-500/20"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StackDeleteModal;
