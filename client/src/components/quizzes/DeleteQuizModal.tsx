import React from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '../common/Modal';

interface DeleteQuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
}

const DeleteQuizModal: React.FC<DeleteQuizModalProps> = ({ isOpen, onClose, onDelete }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirm Delete"
            description="Are you sure you want to delete this quiz?"
            maxWidth="max-w-sm"
            icon={<Trash2 className="w-6 h-6 text-red-500" />}
            footer={
                <>
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
                </>
            }
        >
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-500 text-sm font-bold text-center">
                    ⚠️ This action cannot be undone.
                </p>
            </div>
        </Modal>
    );
};

export default DeleteQuizModal;
