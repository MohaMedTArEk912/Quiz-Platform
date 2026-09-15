import React from 'react';
import {
    Layout, Plus, ArrowLeft, Edit, Trash2, Download, Upload, Loader2, ChevronRight
} from 'lucide-react';
import type { Subject } from '../../../types';
import { useTheme } from '../../../context/ThemeContext';

interface RoadHeaderProps {
    view: 'list' | 'detail';
    selectedRoad: Subject | null;
    onBack: () => void;
    onEdit: (road: Subject) => void;
    onDelete: (road: Subject) => void;
    onCreate: () => void;
    onExportAll?: () => void;
    onExportRoad?: (road: Subject) => void;
    onOpenImport?: () => void;
    isExporting?: boolean;
}

const RoadHeader: React.FC<RoadHeaderProps> = ({
    view,
    selectedRoad,
    onBack,
    onEdit,
    onDelete,
    onCreate,
    onExportAll,
    onExportRoad,
    onOpenImport,
    isExporting = false
}) => {
    const { isBento } = useTheme();

    if (view === 'list') {
        return (
            <div className={`p-4 sm:p-5 rounded-3xl mb-2 flex flex-col sm:flex-row justify-between items-center gap-4 transition-all ${
                isBento
                    ? 'bg-white text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000]'
                    : 'bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm'
            }`}>
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isBento ? 'bg-[#fef08a] border-2 border-black text-black' : 'bg-indigo-500/10 text-indigo-500'}`}>
                            <Layout className="w-7 h-7" />
                        </div>
                        <span className={isBento ? 'text-black' : 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400'}>
                            Learning Roads
                        </span>
                    </h2>
                    <p className={`mt-1 font-medium text-xs sm:text-sm ${isBento ? 'text-neutral-700' : 'text-gray-500 dark:text-gray-400'}`}>
                        Create, organize, and monitor comprehensive learning paths for your students.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    {onExportAll && (
                        <button
                            type="button"
                            onClick={onExportAll}
                            disabled={isExporting}
                            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50 cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5'
                                    : 'bg-white dark:bg-[#252538] hover:bg-gray-50 dark:hover:bg-[#2c2c42] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 shadow-sm'
                            }`}
                            title="Download all learning roads, roadmaps, and quizzes as a ZIP package"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Download className="w-4 h-4 text-indigo-500" />}
                            <span>Export All (ZIP)</span>
                        </button>
                    )}

                    {onOpenImport && (
                        <button
                            type="button"
                            onClick={onOpenImport}
                            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer ${
                                isBento
                                    ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#c4b5fd] active:translate-x-0.5 active:translate-y-0.5'
                                    : 'bg-white dark:bg-[#252538] hover:bg-gray-50 dark:hover:bg-[#2c2c42] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 shadow-sm'
                            }`}
                            title="Import roadmaps and quizzes from a ZIP package or JSON file"
                        >
                            <Upload className="w-4 h-4 text-purple-500" />
                            <span>Import (ZIP)</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onCreate}
                        className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30'
                        }`}
                    >
                        <Plus className="w-4 h-4" /> New Road
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-3 rounded-2xl mb-4 flex items-center gap-4 transition-all ${
            isBento
                ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                : 'bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm'
        }`}>
            <button
                onClick={onBack}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    isBento
                        ? 'bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-200 active:translate-x-0.5 active:translate-y-0.5 font-bold text-xs'
                        : 'hover:bg-white/50 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-white/10'
                }`}
                title="Return to all roads"
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline font-bold">All Roads</span>
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-0.5">
                    <span>Roads</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="truncate text-gray-700 dark:text-gray-300 font-bold">{selectedRoad?.title || 'Selected'}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white truncate">
                    <span className={isBento ? 'text-black' : 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400'}>
                        {selectedRoad?.title || 'Untitled Road'}
                    </span>
                </h2>
            </div>
            <div className="flex items-center gap-2">
                {onExportRoad && selectedRoad && (
                    <button
                        type="button"
                        onClick={() => onExportRoad(selectedRoad)}
                        disabled={isExporting}
                        className={`p-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100'
                                : 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-900/30'
                        }`}
                        title="Download Road Bundle as ZIP"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                )}
                <button
                    onClick={() => selectedRoad && onEdit(selectedRoad)}
                    className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                        isBento
                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-lime-200'
                            : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/30'
                    }`}
                    title="Edit Road Title & Details"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button
                    onClick={() => selectedRoad && onDelete(selectedRoad)}
                    className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                        isBento
                            ? 'bg-[#fecaca] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-red-200'
                            : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30'
                    }`}
                    title="Delete Road"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default RoadHeader;
