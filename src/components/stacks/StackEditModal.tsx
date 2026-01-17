import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
        } else {
            setEditForm(null);
        }
    }, [subject]);

    if (!isOpen || !editForm) return null;

    const handleSave = () => {
        if (!editForm.title.trim()) return; // internal validation
        onSave(editForm);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white">
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Edit Stack</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Title</label>
                        <input
                            className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</label>
                        <textarea
                            className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Icon</label>
                        <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                            {AVAILABLE_ICONS.map(iconName => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const IconComp = (LucideIcons as any)[iconName];
                                const isSelected = editForm.icon === iconName;
                                return (
                                    <button
                                        key={iconName}
                                        onClick={() => setEditForm({ ...editForm, icon: iconName })}
                                        className={`aspect-square flex items-center justify-center rounded-lg transition-all ${isSelected ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                                    >
                                        <IconComp className="w-5 h-5" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StackEditModal;
