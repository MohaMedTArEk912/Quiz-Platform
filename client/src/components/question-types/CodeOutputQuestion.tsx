import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
    const { isBento } = useTheme();
    const [typedOutput, setTypedOutput] = useState<string>(typeof userAnswer === 'string' ? userAnswer : '');

    const handleTextChange = (val: string) => {
        setTypedOutput(val);
        onChange(val);
    };

    return (
        <div className="space-y-4 w-full">
            {/* Terminal Window Header */}
            <div className={`rounded-2xl overflow-hidden ${
                isBento
                    ? 'border-[2.5px] border-black bg-[#0f111a] shadow-[5px_5px_0px_#000]'
                    : 'border border-gray-200 dark:border-[#222738] bg-[#0f111a] shadow-xl'
            }`}>
                <div className={`flex items-center justify-between px-4 py-2.5 text-xs font-mono ${
                    isBento
                        ? 'bg-white border-b-2 border-black text-black font-bold'
                        : 'bg-[#161826] border-b border-gray-200/10 text-gray-400'
                }`}>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 border border-black/30" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500 border border-black/30" />
                        <div className="w-3 h-3 rounded-full bg-green-500 border border-black/30" />
                        <span className={`text-[11px] font-bold ml-1 ${isBento ? 'text-black' : 'text-gray-300'}`}>stdout-predictor.sh</span>
                    </div>
                    <span className={`text-[10px] ${isBento ? 'text-slate-600' : 'text-gray-500'}`}>Node / Python Runtime</span>
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
                    <div className={`text-xs font-black uppercase tracking-wider mb-1 ${isBento ? 'text-black' : 'text-gray-400'}`}>
                        Select the predicted console output:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {options.map((opt, optIdx) => {
                            const isSelected = userAnswer === optIdx || String(userAnswer) === String(opt) || String(userAnswer) === String(optIdx);
                            const isCorrect = submitted && (
                                optIdx === Number(correctAnswer) || 
                                String(correctAnswer).trim() === String(opt).trim()
                            );
                            const isWrong = submitted && isSelected && !isCorrect;

                            const buttonClass = isBento
                                ? isCorrect
                                    ? 'bg-[#bef264] border-2 border-black text-black shadow-[3px_3px_0px_#000]'
                                    : isWrong
                                        ? 'bg-[#fecdd3] border-2 border-black text-black shadow-[3px_3px_0px_#000]'
                                        : isSelected
                                            ? 'bg-[#fde047] border-2 border-black text-black shadow-[3px_3px_0px_#000]'
                                            : 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_#000] hover:bg-[#fef9c3]'
                                : isCorrect
                                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-500'
                                    : isWrong
                                        ? 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-300'
                                        : isSelected
                                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-300 ring-2 ring-indigo-500'
                                            : 'bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-indigo-500/40 text-gray-800 dark:text-gray-200';

                            return (
                                <button
                                    key={optIdx}
                                    type="button"
                                    disabled={readOnly || submitted}
                                    onClick={() => onChange(optIdx)}
                                    className={`p-4 rounded-2xl font-mono text-xs sm:text-sm text-left border transition-all flex items-center justify-between gap-3 cursor-pointer ${buttonClass}`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className={`font-bold ${isBento ? 'text-black' : 'text-gray-400'}`}>&gt;</span>
                                        <span className={`font-bold truncate ${isBento ? 'text-black font-black' : ''}`}>{opt}</span>
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
                    <div className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>
                        Type the exact output printed to terminal:
                    </div>
                    <div className={`flex items-center gap-2 p-3 rounded-2xl font-mono text-sm ${
                        isBento
                            ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000] text-black'
                            : 'bg-black/40 border border-gray-300 dark:border-white/10'
                    }`}>
                        <span className={`font-bold ${isBento ? 'text-black' : 'text-emerald-400'}`}>&gt;</span>
                        <input
                            type="text"
                            disabled={readOnly || submitted}
                            value={typedOutput}
                            onChange={(e) => handleTextChange(e.target.value)}
                            placeholder="Type stdout output here..."
                            className={`w-full bg-transparent focus:outline-none font-mono text-xs sm:text-sm ${
                                isBento ? 'text-black placeholder:text-slate-400' : 'text-white placeholder:text-gray-500'
                            }`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeOutputQuestion;
