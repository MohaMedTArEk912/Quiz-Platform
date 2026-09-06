import React, { useState, useRef } from 'react';
import {
    X,
    UploadCloud,
    FileArchive,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    FolderKanban
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useTheme } from '../../../context/ThemeContext';

interface ImportRoadBundleModalProps {
    isOpen: boolean;
    onClose: () => void;
    adminId: string;
    onSuccess: () => void;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
}

interface ImportStats {
    subjectsCreated: number;
    subjectsUpdated: number;
    tracksCreated: number;
    tracksUpdated: number;
    quizzesCreated: number;
    quizzesUpdated: number;
    errors: string[];
}

const ImportRoadBundleModal: React.FC<ImportRoadBundleModalProps> = ({
    isOpen,
    onClose,
    adminId,
    onSuccess,
    onNotification
}) => {
    const { isBento } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [stats, setStats] = useState<ImportStats | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const isZipOrJson = file.name.endsWith('.zip') || file.name.endsWith('.json');
            if (!isZipOrJson) {
                onNotification('error', 'Please select a valid .zip or .json bundle file');
                return;
            }
            setSelectedFile(file);
            setStats(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const isZipOrJson = file.name.endsWith('.zip') || file.name.endsWith('.json');
            if (!isZipOrJson) {
                onNotification('error', 'Please drop a valid .zip or .json bundle file');
                return;
            }
            setSelectedFile(file);
            setStats(null);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleImport = async () => {
        if (!selectedFile) {
            onNotification('warning', 'Please select a ZIP or JSON bundle file first');
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.importRoadmapBundle(selectedFile, replaceExisting, adminId);
            if (res.success) {
                setStats(res.stats);
                onNotification('success', res.message || 'Import completed successfully!');
                onSuccess();
            } else {
                onNotification('error', res.message || 'Import failed');
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to import bundle';
            onNotification('error', msg);
        } finally {
            setIsLoading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const resetModal = () => {
        setSelectedFile(null);
        setStats(null);
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div
                className={`w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl transition-all ${
                    isBento
                        ? 'bg-white border-3 border-black shadow-[6px_6px_0px_#000]'
                        : 'bg-white dark:bg-[#1a1a2e] border border-white/20 dark:border-white/10'
                }`}
            >
                {/* Header */}
                <div
                    className={`px-6 py-5 flex items-center justify-between border-b ${
                        isBento
                            ? 'bg-[#fef9c3] border-b-2 border-black'
                            : 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border-gray-100 dark:border-white/10'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                                isBento
                                    ? 'bg-black text-amber-300 border border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400'
                            }`}
                        >
                            <FileArchive className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Import Roadmap & Quizzes ZIP
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Restore or clone learning roads, roadmap graphs, and quiz questions.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={resetModal}
                        disabled={isLoading}
                        className={`p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all ${
                            isBento ? 'hover:bg-black/5' : 'hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Success / Result View */}
                    {stats ? (
                        <div className="space-y-4">
                            <div
                                className={`p-4 rounded-2xl flex items-start gap-3.5 ${
                                    isBento
                                        ? 'bg-emerald-50 border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                                }`}
                            >
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                                        Import Completed Successfully!
                                    </h4>
                                    <p className="text-xs text-emerald-800 dark:text-emerald-400">
                                        All roadmap structures, metadata, and quizzes were processed and applied.
                                    </p>
                                </div>
                            </div>

                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    className={`p-3.5 rounded-2xl ${
                                        isBento
                                            ? 'bg-blue-50 border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <FolderKanban className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                            Roads & Tracks
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between text-xs font-medium">
                                        <span>Created: <strong>{stats.subjectsCreated}</strong></span>
                                        <span>Updated: <strong>{stats.subjectsUpdated}</strong></span>
                                    </div>
                                </div>

                                <div
                                    className={`p-3.5 rounded-2xl ${
                                        isBento
                                            ? 'bg-purple-50 border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileArchive className="w-4 h-4 text-purple-600" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                                            Quizzes
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between text-xs font-medium">
                                        <span>Created: <strong>{stats.quizzesCreated}</strong></span>
                                        <span>Updated: <strong>{stats.quizzesUpdated}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* Warnings/Errors if any */}
                            {stats.errors && stats.errors.length > 0 && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
                                    <div className="flex items-center gap-1.5 font-bold mb-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>Notice ({stats.errors.length}):</span>
                                    </div>
                                    <ul className="list-disc list-inside space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                                        {stats.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* File Drag and Drop Zone */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".zip,.json"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                                    isDragging
                                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                                        : isBento
                                        ? 'border-black hover:bg-amber-50/60 bg-slate-50'
                                        : 'border-gray-300 dark:border-white/10 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                                }`}
                            >
                                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <UploadCloud className="w-6 h-6" />
                                </div>
                                {selectedFile ? (
                                    <div className="space-y-1">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                                            <FileArchive className="w-4 h-4 text-indigo-500" />
                                            <span>{selectedFile.name}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">
                                            {formatFileSize(selectedFile.size)} • Click or drop to replace
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            Click to browse or drag and drop your ZIP or JSON bundle
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            Supports .zip archives containing roads/quizzes and consolidated .json packages
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Replace Option Checkbox */}
                            <div
                                className={`p-4 rounded-2xl border transition-all ${
                                    isBento
                                        ? 'bg-[#fffbeb] border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10'
                                }`}
                            >
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={replaceExisting}
                                        onChange={(e) => setReplaceExisting(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                    />
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            Replace / Overwrite Existing Items
                                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded">
                                                Recommended
                                            </span>
                                        </span>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            If a roadmap or quiz with matching title or ID already exists, its questions, modules, and content will be updated with the imported version. Uncheck to only insert new items.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div
                    className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
                        isBento ? 'border-t-2 border-black bg-slate-50' : 'border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]'
                    }`}
                >
                    {stats ? (
                        <button
                            onClick={resetModal}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                isBento
                                    ? 'bg-black text-white hover:bg-gray-800 shadow-[2px_2px_0px_#000] cursor-pointer'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 cursor-pointer'
                            }`}
                        >
                            Done
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={resetModal}
                                disabled={isLoading}
                                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                    isBento
                                        ? 'bg-white border-2 border-black text-black hover:bg-gray-100 cursor-pointer'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={!selectedFile || isLoading}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isBento
                                        ? 'bg-indigo-600 text-white border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer'
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 cursor-pointer'
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Importing & Replacing...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Import Package</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportRoadBundleModal;
