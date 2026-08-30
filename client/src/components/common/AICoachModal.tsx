import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, X, Lightbulb, RefreshCw } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { api } from '../../lib/api';
import { sounds } from '../../lib/soundEffects';

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
    const [hint, setHint] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHint = async () => {
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
    };

    useEffect(() => {
        if (isOpen) {
            fetchHint();
        } else {
            setHint(null);
        }
    }, [isOpen, question]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-[#121324] text-white rounded-3xl p-6 sm:p-8 border border-indigo-500/30 shadow-2xl shadow-indigo-500/20 space-y-5 overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-400">
                                <Sparkles className="w-3 h-3" />
                                Socratic AI Tutor
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">
                                AI Study Coach Hint
                            </h3>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Question Preview Box */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 max-h-24 overflow-y-auto">
                    <span className="font-black text-gray-400 uppercase text-[9px] block mb-1">Current Question:</span>
                    <MathRenderer text={question} />
                </div>

                {/* AI Hint Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-[#181a30] to-purple-950/40 border border-indigo-500/30 shadow-inner space-y-3">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-amber-300">
                        <span className="flex items-center gap-1.5">
                            <Lightbulb className="w-4 h-4 text-amber-300 animate-pulse" />
                            Guided Conceptual Pointer
                        </span>
                        {isLoading && <span className="text-indigo-400 animate-pulse text-[10px]">Thinking...</span>}
                    </div>

                    {isLoading ? (
                        <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-gray-400 font-bold">
                            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                            <span>Formulating smart Socratic guidance...</span>
                        </div>
                    ) : (
                        <div className="text-sm sm:text-base font-medium text-gray-100 leading-relaxed">
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
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Another Clue</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 transition cursor-pointer"
                    >
                        Got It, Let Me Answer!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AICoachModal;
