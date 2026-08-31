import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Check, X } from 'lucide-react';
import { MathRenderer } from '../common/MathRenderer';

interface OrderingQuestionProps {
    items: string[];
    correctOrder?: string[];
    submitted?: boolean;
    onChange: (orderedItems: string[]) => void;
    readOnly?: boolean;
}

export const OrderingQuestion: React.FC<OrderingQuestionProps> = ({
    items: initialItems,
    correctOrder,
    submitted = false,
    onChange,
    readOnly = false
}) => {
    const [currentOrder, setCurrentOrder] = useState<string[]>(() => [...initialItems]);

    useEffect(() => {
        setCurrentOrder([...initialItems]);
    }, [initialItems]);

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (readOnly || submitted) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

        const newOrder = [...currentOrder];
        const [moved] = newOrder.splice(index, 1);
        newOrder.splice(targetIndex, 0, moved);

        setCurrentOrder(newOrder);
        onChange(newOrder);
    };

    return (
        <div className="space-y-3 w-full">
            <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
                Arrange items into the correct chronological or logical sequence:
            </div>

            <div className="space-y-2">
                {currentOrder.map((item, idx) => {
                    const isCorrectPosition = submitted && correctOrder && correctOrder[idx] === item;
                    const isWrongPosition = submitted && correctOrder && correctOrder[idx] !== item;

                    return (
                        <div
                            key={idx}
                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-sm ${
                                isCorrectPosition
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                                    : isWrongPosition
                                        ? 'bg-red-500/10 border-red-500 text-red-900 dark:text-red-200'
                                        : 'bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-indigo-500/40'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                                    {idx + 1}
                                </span>
                                <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                                    <MathRenderer text={item} />
                                </div>
                            </div>

                            {/* Actions / Feedback */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {submitted && correctOrder && (
                                    <span className={`p-1.5 rounded-lg ${isCorrectPosition ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {isCorrectPosition ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    </span>
                                )}

                                {!readOnly && !submitted && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={idx === 0}
                                            onClick={() => moveItem(idx, 'up')}
                                            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-indigo-500/15 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition cursor-pointer"
                                            aria-label="Move Up"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={idx === currentOrder.length - 1}
                                            onClick={() => moveItem(idx, 'down')}
                                            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-indigo-500/15 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition cursor-pointer"
                                            aria-label="Move Down"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderingQuestion;
