import React from 'react';
import {
    Layout, Plus, ArrowLeft, Edit, Trash2
} from 'lucide-react';
import type { Subject } from '../../../types';

interface RoadHeaderProps {
    view: 'list' | 'detail';
    selectedRoad: Subject | null;
    onBack: () => void;
    onEdit: (road: Subject) => void;
    onDelete: (road: Subject) => void;
    onCreate: () => void;
}

const RoadHeader: React.FC<RoadHeaderProps> = ({
    view,
    selectedRoad,
    onBack,
    onEdit,
    onDelete,
    onCreate
}) => {
    if (view === 'list') {
        return (
            <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 p-4 sm:p-5 rounded-3xl shadow-sm mb-2 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <Layout className="w-8 h-8 text-indigo-500" />
                        </div>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                            Learning Roads
                        </span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        Create and manage comprehensive learning paths for your students.
                    </p>
                </div>
                <button
                    onClick={onCreate}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> New Road
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 p-3 rounded-2xl shadow-sm mb-4 flex items-center gap-4">
            <button
                onClick={onBack}
                className="p-3 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10 group"
            >
                <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform" />
            </button>
            <div className="flex-1">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                        {selectedRoad?.title || 'Untitled Road'}
                    </span>
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Managing content and resources
                </p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => selectedRoad && onEdit(selectedRoad)}
                    className="p-3 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-900/30"
                    title="Edit Road"
                >
                    <Edit className="w-5 h-5" />
                </button>
                <button
                    onClick={() => selectedRoad && onDelete(selectedRoad)}
                    className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                    title="Delete Road"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default RoadHeader;
