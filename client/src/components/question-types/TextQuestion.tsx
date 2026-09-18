import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, CornerDownLeft } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface TextQuestionProps {
    value?: string;
    correctAnswer?: string | string[] | unknown;
    submitted?: boolean;
    isCorrect?: boolean;
    onChange: (val: string) => void;
    onSubmit?: () => void;
    readOnly?: boolean;
    placeholder?: string;
}

export const TextQuestion: React.FC<TextQuestionProps> = ({
    value = '',
    correctAnswer,
    submitted = false,
    isCorrect = false,
    onChange,
    onSubmit,
    readOnly = false,
    placeholder = 'Type your answer here...'
}) => {
    const { isBento } = useTheme();
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        onChange(val);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !submitted && !readOnly) {
            e.preventDefault();
            if (onSubmit && localValue.trim()) {
                onSubmit();
            }
        }
    };

    // Format accepted answers for review display
    const formattedAcceptedAnswers = Array.isArray(correctAnswer)
        ? correctAnswer.join(' or ')
        : String(correctAnswer ?? '');

    return (
        <div className="space-y-4 w-full">
            <div className={`text-xs font-black uppercase tracking-wider flex items-center justify-between ${
                isBento ? 'text-black' : 'text-gray-400'
            }`}>
                <span>Short Answer / Text Fill</span>
                <span className="text-[10px] font-bold lowercase opacity-70">
                    (case-insensitive)
                </span>
            </div>

            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={localValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        disabled={readOnly || submitted}
                        placeholder={placeholder}
                        autoFocus
                        className={`w-full p-4 sm:p-4.5 rounded-2xl text-base sm:text-lg font-bold transition-all duration-150 outline-none ${
                            isBento
                                ? submitted
                                    ? isCorrect
                                        ? 'bg-[#bef264] border-2.5 border-black text-black shadow-[3px_3px_0px_#000]'
                                        : 'bg-[#fecdd3] border-2.5 border-black text-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-white border-2.5 border-black text-black shadow-[4px_4px_0px_#000] focus:shadow-[6px_6px_0px_#000] focus:bg-[#fef9c3]'
                                : submitted
                                    ? isCorrect
                                        ? 'bg-emerald-500/15 border border-emerald-500 text-emerald-900 dark:text-emerald-200'
                                        : 'bg-red-500/15 border border-red-500 text-red-900 dark:text-red-200'
                                    : 'bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500'
                        } disabled:opacity-90 disabled:cursor-not-allowed`}
                    />
                </div>

                {/* Submit Action Button when not yet submitted */}
                {!submitted && !readOnly && onSubmit && (
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                            isBento ? 'text-slate-600' : 'text-gray-400'
                        }`}>
                            <CornerDownLeft className="w-3.5 h-3.5" />
                            Press <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[10px] font-black">Enter ↵</kbd> or click submit
                        </span>

                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!localValue.trim()}
                            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                isBento
                                    ? 'bg-[#fde047] hover:bg-[#facc15] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                            }`}
                        >
                            <span>Submit Answer</span>
                            <CornerDownLeft className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Submitted Feedback States */}
                {submitted && (
                    <div className={`p-4 rounded-2xl border transition-all ${
                        isBento
                            ? isCorrect
                                ? 'bg-[#dcfce7] border-2 border-black text-black shadow-[3px_3px_0px_#000]'
                                : 'bg-[#ffe4e6] border-2 border-black text-black shadow-[3px_3px_0px_#000]'
                            : isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
                    }`}>
                        <div className="flex items-start gap-3">
                            {isCorrect ? (
                                <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                                    isBento ? 'text-black' : 'text-emerald-600 dark:text-emerald-400'
                                }`} />
                            ) : (
                                <XCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                                    isBento ? 'text-black' : 'text-red-600 dark:text-red-400'
                                }`} />
                            )}
                            <div className="space-y-1 min-w-0">
                                <div className="font-black text-sm">
                                    {isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                                </div>
                                {!isCorrect && formattedAcceptedAnswers && (
                                    <div className="text-xs font-bold pt-1">
                                        <span className="opacity-75">Accepted answer(s): </span>
                                        <span className={`px-2 py-0.5 rounded-lg inline-block font-mono font-black ${
                                            isBento 
                                                ? 'bg-white border border-black shadow-[1px_1px_0px_#000]' 
                                                : 'bg-black/10 dark:bg-white/10'
                                        }`}>
                                            {formattedAcceptedAnswers}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TextQuestion;
