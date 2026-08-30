import React, { useState } from 'react';
import { Terminal, Check, X, Code } from 'lucide-react';
import { MathRenderer } from '../common/MathRenderer';

interface CodeOutputQuestionProps {
    codeSnippet?: string;
    options?: string[];
    correctAnswer?: string | number;
    submitted?: boolean;
    userAnswer?: string | number;
    onChange: (prediction: string | number) => void;
    readOnly?: boolean;
}

export const CodeOutputQuestion: React.FC<CodeOutputQuestionProps> = ({
    codeSnippet,
    options,
    correctAnswer,
    submitted = false,
    userAnswer,
    onChange,
    readOnly = false
}) => {
    const [typedOutput, setTypedOutput] = useState<string>(typeof userAnswer === 'string' ? userAnswer : '');

    const handleTextChange = (val: string) => {
        setTypedOutput(val);
        onChange(val);
    };

    return (
        <div className="space-y-4 w-full">
            {/* Terminal Window Header */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-[#222738] bg-[#0f111a] shadow-xl">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#161826] border-b border-gray-200/10 text-xs font-mono text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        <span className="text-[11px] font-bold text-gray-300 ml-1">stdout-predictor.sh</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Node / Python Runtime</span>
                </div>

                {codeSnippet && (
                    <pre className="p-5 font-mono text-xs sm:text-sm text-emerald-400 overflow-x-auto leading-relaxed bg-[#0b0c14]">
                        <code>{codeSnippet}</code>
                    </pre>
                )}
            </div>

            {/* Prediction Interface */}
            {options && options.length > 0 ? (
                <div className="space-y-2">
                    <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">
                        Select the predicted console output:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {options.map((opt, optIdx) => {
                            const isSelected = userAnswer === optIdx;
                            const isCorrect = submitted && optIdx === Number(correctAnswer);
                            const isWrong = submitted && isSelected && !isCorrect;

                            return (
                                <button
                                    key={optIdx}
                                    type="button"
                                    disabled={readOnly || submitted}
                                    onClick={() => onChange(optIdx)}
                                    className={`p-4 rounded-2xl font-mono text-xs sm:text-sm text-left border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                        isCorrect
                                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-500'
                                            : isWrong
                                                ? 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-300'
                                                : isSelected
                                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-300 ring-2 ring-indigo-500'
                                                    : 'bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-indigo-500/40 text-gray-800 dark:text-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="text-gray-400 font-bold">&gt;</span>
                                        <span className="font-bold truncate">{opt}</span>
                                    </div>

                                    {submitted && (
                                        <span className={isCorrect ? 'text-emerald-500' : 'text-red-500'}>
                                            {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="text-xs font-black uppercase tracking-wider text-gray-400">
                        Type the exact output printed to terminal:
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-black/40 border border-gray-300 dark:border-white/10 rounded-2xl font-mono text-sm">
                        <span className="text-emerald-400 font-bold">&gt;</span>
                        <input
                            type="text"
                            disabled={readOnly || submitted}
                            placeholder="e.g. [1, 2, 3] or undefined"
                            value={typedOutput}
                            onChange={(e) => handleTextChange(e.target.value)}
                            className="w-full bg-transparent border-none text-emerald-300 font-mono text-sm focus:outline-none placeholder:text-gray-600"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeOutputQuestion;
