import React from 'react';
import type { Subject } from '../../types';
import ConfirmDialog from '../ConfirmDialog';

interface StackDeleteModalProps {
    isOpen: boolean;
    subject: Subject | null;
    onClose: () => void;
    onDelete: () => void;
    isLoading?: boolean;
}

const StackDeleteModal: React.FC<StackDeleteModalProps> = ({ isOpen, subject, onClose, onDelete, isLoading }) => {
    if (!subject) return null;

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onCancel={onClose}
            onConfirm={onDelete}
            title="Delete Stack?"
            message={`Are you sure you want to delete "${subject.title}"? This will uncategorize all its associated quizzes.`}
            confirmText="Delete Stack"
            cancelText="Cancel"
            type="danger"
            showWarningBanner={true}
            isLoading={isLoading}
        />
    );
};

export default StackDeleteModal;
