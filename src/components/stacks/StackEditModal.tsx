import React, { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import Modal from '../common/Modal';
import { AVAILABLE_ICONS } from '../../utils/constants';
import * as LucideIcons from 'lucide-react';
import type { Subject } from '../../types';

interface StackEditModalProps {
    isOpen: boolean;
    subject: Subject | null;
    onClose: () => void;
    onSave: (updatedSubject: Subject) => void;
}

const StackEditModal: React.FC<StackEditModalProps> = ({ isOpen, subject, onClose, onSave }) => {
    const [editForm, setEditForm] = useState<Subject | null>(null);

    useEffect(() => {
        if (subject) {
            setEditForm({ ...subject });
        }
    }, [subject]);

    if (!editForm) return null;

    const handleSave = () => {
        if (!editForm.title.trim()) return; // internal validation
        onSave(editForm);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Stack"
            description="Update stack details including title, description and icon."
            maxWidth="max-w-md"
            icon={<Edit2 className="w-6 h-6 text-purple-500" />}
            footer={
                <>
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 shadow-lg shadow-purple-500/20">
                        Save Changes
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Title</label>
                    <input
                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="e.g. Mathematics"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</label>
                    <textarea
                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none transition-all"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Describe the contents of this stack..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Icon</label>
                    <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-white/10 max-h-48 overflow-y-auto custom-scrollbar">
                        {AVAILABLE_ICONS.map(iconName => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const IconComp = (LucideIcons as any)[iconName];
                            const isSelected = editForm.icon === iconName;
                            return (
                                <button
                                    key={iconName}
                                    onClick={() => setEditForm({ ...editForm, icon: iconName })}
                                    className={`aspect-square flex items-center justify-center rounded-lg transition-all ${isSelected ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                                >
                                    {IconComp ? <IconComp className="w-5 h-5" /> : <div className="w-5 h-5 bg-gray-500/20 rounded" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StackEditModal;
