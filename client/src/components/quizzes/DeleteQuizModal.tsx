import React from 'react';
import ConfirmDialog from '../ConfirmDialog';

interface DeleteQuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
    isLoading?: boolean;
}

const DeleteQuizModal: React.FC<DeleteQuizModalProps> = ({ isOpen, onClose, onDelete, isLoading }) => {
    return (
        <ConfirmDialog
            isOpen={isOpen}
            onCancel={onClose}
            onConfirm={onDelete}
            title="Delete Quiz?"
            message="Are you sure you want to delete this quiz? All question items and attempt histories associated with this quiz will be affected."
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
            showWarningBanner={true}
            isLoading={isLoading}
        />
    );
};

export default DeleteQuizModal;
