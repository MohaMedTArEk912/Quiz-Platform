import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, CornerDownLeft, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { evaluateTextAnswer } from '../../lib/stringSimilarity';

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
        if (e.key === 'Enter') {
            if (!submitted && !readOnly && onSubmit && localValue.trim()) {
                e.preventDefault();
                e.stopPropagation();
                if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                    e.nativeEvent.stopImmediatePropagation();
                }
                onSubmit();
                return;
            }
            // If already submitted, let Enter bubble naturally so QuizTaking's window listener
            // can advance (after its debounce period)
        }
    };

    // Calculate match metrics using 70% fuzzy matching
    const evalResult = useMemo(() => {
        return evaluateTextAnswer(localValue, correctAnswer, 0.70);
    }, [localValue, correctAnswer]);

    // Use either the component's evalResult or the isCorrect prop passed down
    const passed = submitted ? (evalResult.isPassed || isCorrect) : false;
    const matchPercentage = evalResult.percentage;

    return (
        <div className="space-y-4 w-full">
            <div className={`text-xs font-black uppercase tracking-wider flex items-center justify-between flex-wrap gap-2 ${
                isBento ? 'text-black dark:text-white' : 'text-gray-400'
            }`}>
                <span className="flex items-center gap-1.5">
                    <span>Short Answer / Text Fill</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-black bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                        70%+ Match Passes
                    </span>
                </span>
                <span className="text-[10px] font-bold lowercase opacity-70">
                    (fuzzy matching • case & punctuation insensitive)
                </span>
            </div>

            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={localValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        readOnly={readOnly || submitted}
                        placeholder={placeholder}
                        autoFocus
                        className={`w-full p-4 sm:p-4.5 rounded-2xl text-base sm:text-lg font-bold transition-all duration-150 outline-none ${
                            isBento
                                ? submitted
                                    ? passed
                                        ? 'bg-[#bef264] border-2.5 border-black text-black shadow-[3px_3px_0px_#000]'
                                        : 'bg-[#fecdd3] border-2.5 border-black text-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-white dark:bg-[#111827] border-2.5 border-black dark:border-white/20 text-black dark:text-white shadow-[4px_4px_0px_#000] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.1)] focus:shadow-[6px_6px_0px_#000] focus:bg-[#fef9c3] dark:focus:bg-[#1f2937]'
                                : submitted
                                    ? passed
                                        ? 'bg-emerald-500/15 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                                        : 'bg-red-500/15 border-2 border-red-500 text-red-900 dark:text-red-200'
                                    : 'bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500'
                        } ${submitted ? 'cursor-default select-text' : ''} disabled:opacity-95 disabled:cursor-not-allowed`}
                    />
                </div>

                {/* Submit Action Button when not yet submitted */}
                {!submitted && !readOnly && onSubmit && (
                    <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                        <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                            isBento ? 'text-slate-600 dark:text-slate-400' : 'text-gray-400'
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
                                    ? 'bg-[#fde047] hover:bg-[#facc15] text-black border-2 border-black shadow-[2.5px_2.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 hover:-translate-y-0.5'
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
                    <div className={`p-4 sm:p-5 rounded-2xl border transition-all animate-in fade-in duration-200 ${
                        isBento
                            ? passed
                                ? 'bg-[#dcfce7] border-2 border-black text-black shadow-[3px_3px_0px_#000]'
                                : 'bg-[#ffe4e6] border-2 border-black text-black shadow-[3px_3px_0px_#000]'
                            : passed
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
                    }`}>
                        <div className="flex items-start gap-3">
                            {passed ? (
                                <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                                    isBento ? 'text-black' : 'text-emerald-600 dark:text-emerald-400'
                                }`} />
                            ) : (
                                <XCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                                    isBento ? 'text-black' : 'text-red-600 dark:text-red-400'
                                }`} />
                            )}
                            <div className="space-y-2 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-sm sm:text-base">
                                        {passed ? 'Answer Accepted!' : 'Incorrect Answer'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                                        isBento
                                            ? passed
                                                ? 'bg-[#bef264] border-black text-black shadow-[1px_1px_0px_#000]'
                                                : 'bg-[#fecdd3] border-black text-black shadow-[1px_1px_0px_#000]'
                                            : passed
                                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300'
                                    }`}>
                                        {matchPercentage}% Match {passed ? '(Passed ≥70%)' : '(Needs ≥70%)'}
                                    </span>
                                </div>

                                {/* Exact Canonical Word Reveal */}
                                {evalResult.canonicalAnswer && (
                                    <div className="pt-1.5 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                        <span className="font-extrabold opacity-80 flex items-center gap-1">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            <span>Exact expected word:</span>
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-xl font-mono text-xs sm:text-sm font-black border inline-block ${
                                            isBento
                                                ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-300 dark:border-white/20'
                                        }`}>
                                            {evalResult.canonicalAnswer}
                                        </span>
                                        {evalResult.acceptedAnswers.length > 1 && (
                                            <span className="text-[11px] font-bold opacity-60">
                                                (also accepts: {evalResult.acceptedAnswers.filter(a => a !== evalResult.canonicalAnswer).join(', ')})
                                            </span>
                                        )}
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
