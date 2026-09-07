import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Upload } from 'lucide-react';
import Modal from '../common/Modal';
import type { Quiz, Question } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface ReplaceQuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    quiz: Quiz | null;
    replacementFile: File | null;
    parsedData: {
        questions: Partial<Question>[];
        title?: string;
        description?: string;
        timeLimit?: number;
        passingScore?: number;
    } | null;
    onConfirm: (applyMetadata: boolean) => Promise<void>;
    onFileSelected: (file: File) => void;
    isLoading?: boolean;
}

const ReplaceQuizModal: React.FC<ReplaceQuizModalProps> = ({
    isOpen,
    onClose,
    quiz,
    replacementFile,
    parsedData,
    onConfirm,
    onFileSelected,
    isLoading = false
}) => {
    const { isBento } = useTheme();
    const [applyMetadata, setApplyMetadata] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    if (!quiz) return null;

    const currentCount = quiz.questions?.length || 0;
    const newCount = parsedData?.questions?.length || 0;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelected(file);
        }
        e.target.value = '';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={isLoading ? () => {} : onClose}
            title="Replace Quiz Questions"
            description={`Update questions for "${quiz.title}"`}
            maxWidth="max-w-md"
            icon={<RefreshCw className={`w-6 h-6 ${isBento ? 'text-black' : 'text-cyan-500'} animate-spin-slow`} />}
            footer={
                <>
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={onClose}
                        className={`flex-1 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                            isBento
                                ? 'bg-white hover:bg-gray-100 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isLoading || !parsedData || newCount === 0}
                        onClick={() => onConfirm(applyMetadata)}
                        className={`flex-1 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            isBento
                                ? 'bg-[#67e8f9] hover:bg-[#22d3ee] text-black border-2 border-black shadow-[2px_2px_0px_#000] disabled:opacity-50'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 disabled:opacity-50'
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Replacing...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirm Replace</span>
                            </>
                        )}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                {/* File Upload Selector / Drop Area */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                />

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                        isBento
                            ? 'bg-white border-black hover:bg-[#f8fafc] shadow-[2px_2px_0px_#000]'
                            : 'bg-gray-50/50 dark:bg-white/5 border-gray-300 dark:border-white/10 hover:border-cyan-500/50'
                    }`}
                >
                    <Upload className={`w-6 h-6 ${isBento ? 'text-black' : 'text-cyan-500'}`} />
                    <div className="text-center">
                        <span className={`text-xs font-bold ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                            {replacementFile ? replacementFile.name : 'Choose Replacement JSON File'}
                        </span>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {replacementFile ? 'Click to select a different file' : 'Click to browse (.json format)'}
                        </p>
                    </div>
                </div>

                {/* Diff Summary Box */}
                {parsedData && (
                    <div className={`p-4 rounded-2xl border ${
                        isBento
                            ? 'bg-[#f8fafc] border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10'
                    }`}>
                        <div className="flex items-center justify-between text-xs font-bold mb-3 pb-2 border-b border-gray-200 dark:border-white/10">
                            <span className="text-gray-500 dark:text-gray-400">Target Quiz</span>
                            <span className={`font-black truncate max-w-[200px] ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                {quiz.title}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className={`p-2.5 rounded-xl border ${
                                isBento ? 'bg-white border-2 border-black' : 'bg-white/50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                            }`}>
                                <div className="text-[10px] uppercase font-bold text-gray-400">Current</div>
                                <div className={`text-base font-black ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                    {currentCount} Qs
                                </div>
                            </div>

                            <div className={`p-2.5 rounded-xl border ${
                                isBento ? 'bg-[#67e8f9] border-2 border-black font-mono' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
                            }`}>
                                <div className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-300">Replacement</div>
                                <div className="text-base font-black text-black dark:text-white">
                                    {newCount} Qs
                                </div>
                            </div>
                        </div>

                        {/* Title Update Checkbox if replacement JSON has a title */}
                        {parsedData.title && parsedData.title !== quiz.title && (
                            <label className="mt-3 flex items-start gap-2.5 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs">
                                <input
                                    type="checkbox"
                                    checked={applyMetadata}
                                    onChange={(e) => setApplyMetadata(e.target.checked)}
                                    className="mt-0.5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className={`text-[11px] leading-tight ${isBento ? 'text-black font-mono' : 'text-gray-700 dark:text-gray-300'}`}>
                                    Also update title to: <strong className="text-black dark:text-white">"{parsedData.title}"</strong>
                                </span>
                            </label>
                        )}
                    </div>
                )}

                {/* Warning note */}
                <div className={`p-3 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed ${
                    isBento
                        ? 'bg-[#fef9c3] border border-black text-black font-mono'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400'
                }`}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                        All existing questions will be replaced by the questions from this file. The quiz ID, history, and student attempts remain intact.
                    </span>
                </div>
            </div>
        </Modal>
    );
};

export default ReplaceQuizModal;
