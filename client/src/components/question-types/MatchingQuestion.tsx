import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { MathRenderer } from '../common/MathRenderer';
import { useTheme } from '../../context/ThemeContext';

export interface MatchingPair {
    left: string;
    right: string;
}

interface MatchingQuestionProps {
    pairs: MatchingPair[];
    submitted?: boolean;
    onChange: (userMatches: Record<string, string>) => void;
    readOnly?: boolean;
}

const shuffleRightSide = (pairsList: MatchingPair[]) => {
    const rightSide = pairsList.map(p => p.right);
    for (let i = rightSide.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rightSide[i], rightSide[j]] = [rightSide[j], rightSide[i]];
    }
    return rightSide;
};

const PAIR_COLORS = [
    'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/40',
    'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/40',
    'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/40',
    'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/40',
    'border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-2 ring-pink-500/40',
    'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-500/40'
];

const BENTO_PAIR_COLORS = [
    'border-2 border-black bg-[#fde047] text-black shadow-[3px_3px_0px_#000]',
    'border-2 border-black bg-[#bef264] text-black shadow-[3px_3px_0px_#000]',
    'border-2 border-black bg-[#bae6fd] text-black shadow-[3px_3px_0px_#000]',
    'border-2 border-black bg-[#ddd6fe] text-black shadow-[3px_3px_0px_#000]',
    'border-2 border-black bg-[#fed7aa] text-black shadow-[3px_3px_0px_#000]',
    'border-2 border-black bg-[#fbcfe8] text-black shadow-[3px_3px_0px_#000]'
];

export const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
    pairs,
    submitted = false,
    onChange,
    readOnly = false
}) => {
    const { isBento } = useTheme();
    const leftItems = pairs.map(p => p.left);
    const [prevPairs, setPrevPairs] = useState(pairs);
    const [shuffledRightItems, setShuffledRightItems] = useState<string[]>(() => shuffleRightSide(pairs));
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [matches, setMatches] = useState<Record<string, string>>({}); // { [left]: right }

    if (prevPairs !== pairs) {
        setPrevPairs(pairs);
        setShuffledRightItems(shuffleRightSide(pairs));
        setSelectedLeft(null);
        setMatches({});
    }

    const handleLeftClick = (left: string) => {
        if (readOnly || submitted) return;
        setSelectedLeft(left === selectedLeft ? null : left);
    };

    const handleRightClick = (right: string) => {
        if (readOnly || submitted || !selectedLeft) return;

        // Associate selectedLeft with right
        const newMatches = { ...matches };

        // If right was already paired, unpair old left
        Object.keys(newMatches).forEach(k => {
            if (newMatches[k] === right) {
                delete newMatches[k];
            }
        });

        newMatches[selectedLeft] = right;
        setMatches(newMatches);
        setSelectedLeft(null);
        onChange(newMatches);
    };

    const handleClearPair = (left: string) => {
        if (readOnly || submitted) return;
        const newMatches = { ...matches };
        delete newMatches[left];
        setMatches(newMatches);
        onChange(newMatches);
    };

    const getPairColorIndex = (left: string) => {
        const keys = Object.keys(matches);
        const idx = keys.indexOf(left);
        return idx >= 0 ? idx % PAIR_COLORS.length : null;
    };

    const getRightPairColorIndex = (right: string) => {
        const foundEntry = Object.entries(matches).find(([, r]) => r === right);
        if (!foundEntry) return null;
        return getPairColorIndex(foundEntry[0]);
    };

    return (
        <div className="space-y-4 w-full">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>
                    Match each term on the left with its corresponding definition on the right:
                </div>
                {pairs.length > 0 && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                        Object.keys(matches).length === pairs.length
                            ? isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : isBento
                                ? 'bg-[#fef08a] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                    }`}>
                        Linked {Object.keys(matches).length} / {pairs.length} {Object.keys(matches).length === pairs.length && '✓'}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LEFT COLUMN: TERMS */}
                <div className="space-y-2">
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isBento ? 'text-black' : 'text-indigo-500'}`}>
                        Column A (Select to link)
                    </div>
                    {leftItems.map((left, idx) => {
                        const isSelected = selectedLeft === left;
                        const pairedRight = matches[left];
                        const pairColorIdx = getPairColorIndex(left);
                        const isCorrect = submitted && pairs.some(p => p.left === left && p.right === pairedRight);

                        const cardStyle = isBento
                            ? isSelected
                                ? 'border-2 border-black bg-[#bef264] text-black shadow-[4px_4px_0px_#000] scale-[1.02]'
                                : pairColorIdx !== null
                                    ? BENTO_PAIR_COLORS[pairColorIdx]
                                    : 'border-2 border-black bg-white text-black shadow-[3px_3px_0px_#000] hover:bg-[#fef9c3]'
                            : isSelected
                                ? 'border-indigo-600 bg-indigo-500/20 ring-2 ring-indigo-500 scale-[1.02]'
                                : pairColorIdx !== null
                                    ? PAIR_COLORS[pairColorIdx]
                                    : 'bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-indigo-500/40';

                        return (
                            <div
                                key={idx}
                                onClick={() => handleLeftClick(left)}
                                className={`p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${cardStyle}`}
                            >
                                <div className="text-sm font-bold truncate">
                                    <MathRenderer text={left} />
                                </div>

                                {pairedRight && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-[9px] font-black uppercase tracking-wider ${
                                            isBento ? 'px-2 py-0.5 rounded bg-black text-white' : 'font-mono text-gray-400'
                                        }`}>
                                            Linked
                                        </span>
                                        {!readOnly && !submitted && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClearPair(left);
                                                }}
                                                className={`p-1 rounded-lg transition cursor-pointer ${
                                                    isBento ? 'hover:bg-black hover:text-white text-black' : 'text-gray-400 hover:text-red-500'
                                                }`}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {submitted && (
                                            <span className={isCorrect ? 'text-emerald-500' : 'text-red-500'}>
                                                {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* RIGHT COLUMN: DEFINITIONS */}
                <div className="space-y-2">
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isBento ? 'text-black' : 'text-purple-500'}`}>
                        Column B (Select to connect)
                    </div>
                    {shuffledRightItems.map((right, idx) => {
                        const pairColorIdx = getRightPairColorIndex(right);

                        const rightCardStyle = isBento
                            ? pairColorIdx !== null
                                ? BENTO_PAIR_COLORS[pairColorIdx]
                                : selectedLeft
                                    ? 'border-2 border-dashed border-black bg-[#fef9c3] text-black shadow-[2px_2px_0px_#000] hover:bg-[#fde047]'
                                    : 'border-2 border-black bg-white text-black shadow-[3px_3px_0px_#000] hover:bg-[#fef9c3]'
                            : pairColorIdx !== null
                                ? PAIR_COLORS[pairColorIdx]
                                : selectedLeft
                                    ? 'bg-white/80 dark:bg-white/5 border-dashed border-indigo-400/60 hover:bg-indigo-500/10'
                                    : 'bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-purple-500/40';

                        return (
                            <div
                                key={idx}
                                onClick={() => handleRightClick(right)}
                                className={`p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${rightCardStyle}`}
                            >
                                <div className="text-sm font-medium leading-relaxed">
                                    <MathRenderer text={right} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MatchingQuestion;
