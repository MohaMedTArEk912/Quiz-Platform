import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Sparkles, X, Lightbulb, RefreshCw } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { api } from '../../lib/api';
import { sounds } from '../../lib/soundEffects';
import { useTheme } from '../../context/ThemeContext';

interface AICoachModalProps {
    isOpen: boolean;
    question: string;
    options?: string[];
    category?: string;
    onClose: () => void;
}

export const AICoachModal: React.FC<AICoachModalProps> = ({
    isOpen,
    question,
    options,
    category,
    onClose
}) => {
    const { isBento } = useTheme();
    const [hint, setHint] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHint = useCallback(async () => {
        setIsLoading(true);
        sounds.playPowerUp();
        try {
            const res = await api.getAICoachHint({
                question,
                options,
                category
            });
            if (res.success && res.hint) {
                setHint(res.hint);
            } else {
                setHint('💡 Consider the core principles of the topic and rule out any answer that contradicts basic definitions.');
            }
        } catch (err) {
            console.error('Failed to get AI Coach hint:', err);
            setHint('💡 Study Tip: Break down the question prompt into key terms and eliminate the most obvious incorrect options first.');
        } finally {
            setIsLoading(false);
        }
    }, [question, options, category]);

    useEffect(() => {
        if (isOpen) {
            fetchHint();
        } else {
            setHint(null);
        }
    }, [isOpen, fetchHint]);

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 ${
            isBento ? 'bg-black/60' : 'bg-black/80 backdrop-blur-xl'
        }`}>
            <div className={`relative w-full max-w-lg p-6 sm:p-8 space-y-5 overflow-hidden transition-all ${
                isBento
                    ? 'bg-white text-black rounded-2xl border-[3px] border-black shadow-[8px_8px_0px_#000]'
                    : 'bg-[#121324] text-white rounded-3xl border border-indigo-500/30 shadow-2xl shadow-indigo-500/20'
            }`}>
                {/* Background Glow */}
                {!isBento && (
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            isBento
                                ? 'bg-[#bef264] border-2 border-black text-black shadow-[3px_3px_0px_#000]'
                                : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                        }`}>
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                                isBento ? 'text-black/70' : 'text-indigo-400'
                            }`}>
                                <Sparkles className="w-3 h-3" />
                                Socratic AI Tutor
                            </div>
                            <h3 className={`text-lg font-black uppercase tracking-tight ${
                                isBento ? 'text-black' : 'text-white'
                            }`}>
                                AI Study Coach Hint
                            </h3>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 rounded-xl transition cursor-pointer ${
                            isBento
                                ? 'border-2 border-black bg-white hover:bg-[#fed7aa] text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Question Preview Box */}
                <div className={`p-4 rounded-2xl text-xs max-h-24 overflow-y-auto ${
                    isBento
                        ? 'bg-[#f5f3ec] border-2 border-black text-black'
                        : 'bg-white/5 border border-white/10 text-gray-300'
                }`}>
                    <span className={`font-black uppercase text-[9px] block mb-1 ${isBento ? 'text-black' : 'text-gray-400'}`}>Current Question:</span>
                    <MathRenderer text={question} />
                </div>

                {/* AI Hint Card */}
                <div className={`p-6 rounded-2xl space-y-3 ${
                    isBento
                        ? 'bg-[#fef08a] border-2 border-black shadow-[4px_4px_0px_#000]'
                        : 'bg-gradient-to-br from-indigo-950/40 via-[#181a30] to-purple-950/40 border border-indigo-500/30 shadow-inner'
                }`}>
                    <div className={`flex items-center justify-between text-xs font-black uppercase tracking-wider ${
                        isBento ? 'text-black' : 'text-amber-300'
                    }`}>
                        <span className="flex items-center gap-1.5">
                            <Lightbulb className={`w-4 h-4 animate-pulse ${isBento ? 'text-black' : 'text-amber-300'}`} />
                            Guided Conceptual Pointer
                        </span>
                        {isLoading && <span className={`animate-pulse text-[10px] ${isBento ? 'text-black font-black' : 'text-indigo-400'}`}>Thinking...</span>}
                    </div>

                    {isLoading ? (
                        <div className={`py-6 flex flex-col items-center justify-center gap-2 text-xs font-bold ${
                            isBento ? 'text-black' : 'text-gray-400'
                        }`}>
                            <RefreshCw className={`w-5 h-5 animate-spin ${isBento ? 'text-black' : 'text-indigo-400'}`} />
                            <span>Formulating smart Socratic guidance...</span>
                        </div>
                    ) : (
                        <div className={`text-sm sm:text-base leading-relaxed ${
                            isBento ? 'font-bold text-black' : 'font-medium text-gray-100'
                        }`}>
                            <MathRenderer text={hint || ''} />
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                        type="button"
                        onClick={fetchHint}
                        disabled={isLoading}
                        className={`px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer ${
                            isBento
                                ? 'bg-white hover:bg-[#bae6fd] border-2 border-black text-black font-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                : 'bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-gray-300 hover:text-white'
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Another Clue</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer ${
                            isBento
                                ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25'
                        }`}
                    >
                        Got It, Let Me Answer!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AICoachModal;
