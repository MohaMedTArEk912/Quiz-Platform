import React, { useState } from 'react';
import { Loader2, X, Trash2 } from 'lucide-react';
import type { Subject } from '../../../types';

interface RoadModalsProps {
    isCreateModalOpen: boolean;
    isEditModalOpen: boolean;
    isDeleteModalOpen: boolean;
    isSubmitting: boolean;
    roadToEdit?: Subject | null;
    roadToDelete?: Subject | null;
    onCreateClose: () => void;
    onEditClose: () => void;
    onDeleteClose: () => void;
    onCreateRoad: (title: string, description: string) => Promise<void>;
    onUpdateRoad: (title: string, description: string) => Promise<void>;
    onDeleteRoad: () => Promise<void>;
}

const RoadModals: React.FC<RoadModalsProps> = ({
    isCreateModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    isSubmitting,
    roadToEdit,
    roadToDelete,
    onCreateClose,
    onEditClose,
    onDeleteClose,
    onCreateRoad,
    onUpdateRoad,
    onDeleteRoad
}) => {
    // Form States for Create/Edit
    const [title, setTitle] = useState(roadToEdit?.title || '');
    const [description, setDescription] = useState(roadToEdit?.description || '');

    // Reset form when modal opens
    React.useEffect(() => {
        if (isCreateModalOpen) {
            setTitle('');
            setDescription('');
        }
    }, [isCreateModalOpen]);

    React.useEffect(() => {
        if (isEditModalOpen && roadToEdit) {
            setTitle(roadToEdit.title);
            setDescription(roadToEdit.description || '');
        }
    }, [isEditModalOpen, roadToEdit]);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onCreateRoad(title, description);
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onUpdateRoad(title, description);
    };

    return (
        <>
            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e2d] rounded-3xl w-full max-w-lg shadow-2xl p-8 border border-white/20 dark:border-white/5 scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Create New Road</h3>
                            <button onClick={onCreateClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all font-bold text-gray-900 dark:text-white"
                                    placeholder="e.g., Mathematics 101"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all font-medium text-gray-900 dark:text-white h-32 resize-none"
                                    placeholder="What is this road about?"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onCreateClose}
                                    className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Road'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e2d] rounded-3xl w-full max-w-lg shadow-2xl p-8 border border-white/20 dark:border-white/5 scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Edit Road</h3>
                            <button onClick={onEditClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateSubmit} className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all font-medium text-gray-900 dark:text-white h-32 resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onEditClose}
                                    className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {isDeleteModalOpen && roadToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e2d] rounded-3xl w-full max-w-md shadow-2xl p-8 border border-white/20 dark:border-white/5 text-center relative overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/10 rounded-br-full -ml-16 -mt-16 pointer-events-none" />

                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-8 ring-red-50 dark:ring-red-900/10">
                            <Trash2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Delete Road?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">{roadToDelete.title}</span>? This action cannot be undone and will delete all associated resources.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={onDeleteClose}
                                className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors w-full"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onDeleteRoad}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all w-full"
                            >
                                Delete Road
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default RoadModals;
