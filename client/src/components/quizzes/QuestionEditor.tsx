import React from 'react';
import { COMPILER_ALLOWED_LANGUAGES, COMPILER_INITIAL_CODE } from '../../constants/quizDefaults';
import { 
    ChevronDown, 
    Type, 
    Code, 
    Image as ImageIcon, 
    Shuffle, 
    CheckCircle2, 
    Circle, 
    Sparkles, 
    Star, 
    Lightbulb, 
    Save,
    ArrowUp,
    ArrowDown,
    Plus,
    Trash2,
    ListOrdered,
    Link2,
    Terminal,
    AlignLeft
} from 'lucide-react';
import CompilerQuestion from '../question-types/CompilerQuestion';
import { MathRenderer } from '../common/MathRenderer';
import { useTheme } from '../../context/ThemeContext';
import type { Question } from '../../types';

interface QuestionEditorProps {
    question: Question;
    index?: number;
    onChange: (q: Question) => void;
    onSave: () => void;
    onCancel: () => void;
}

const QUESTION_TYPES = [
    { id: 'multiple-choice', label: 'Multiple Choice', icon: '📋', color: 'bg-[#bae6fd]' },
    { id: 'ordering', label: 'Ordering', icon: '🔢', color: 'bg-[#fed7aa]' },
    { id: 'matching', label: 'Matching Pairs', icon: '🔗', color: 'bg-[#fbcfe8]' },
    { id: 'code-output', label: 'Code Output', icon: '💻', color: 'bg-[#ddd6fe]' },
    { id: 'text', label: 'Short Answer', icon: '✍️', color: 'bg-[#bef264]' },
    { id: 'compiler', label: 'Compiler', icon: '⚡', color: 'bg-[#fef08a]' },
] as const;

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, index, onChange, onSave, onCancel }) => {
    const { isBento } = useTheme();

    const currentType = question.isCompiler ? 'compiler' : (question.type || 'multiple-choice');

    const handleTypeChange = (newType: string) => {
        if (newType === 'compiler') {
            onChange({
                ...question,
                type: 'text',
                isCompiler: true,
                compilerConfig: question.compilerConfig || {
                    language: 'javascript',
                    allowedLanguages: COMPILER_ALLOWED_LANGUAGES,
                    initialCode: COMPILER_INITIAL_CODE['javascript'],
                    referenceCode: '// Enter the correct code solution here...'
                }
            });
        } else if (newType === 'ordering') {
            const defaultItems = question.orderingItems && question.orderingItems.length >= 2
                ? question.orderingItems
                : (question.options && question.options.length >= 2 ? question.options : ['First Step', 'Second Step', 'Third Step', 'Fourth Step']);
            onChange({
                ...question,
                type: 'ordering',
                isCompiler: false,
                orderingItems: defaultItems,
                options: defaultItems
            });
        } else if (newType === 'matching') {
            onChange({
                ...question,
                type: 'matching',
                isCompiler: false,
                matchingPairs: question.matchingPairs && question.matchingPairs.length >= 2
                    ? question.matchingPairs
                    : [
                        { left: 'Premise 1', right: 'Match 1' },
                        { left: 'Premise 2', right: 'Match 2' },
                        { left: 'Premise 3', right: 'Match 3' }
                    ]
            });
        } else if (newType === 'code-output') {
            onChange({
                ...question,
                type: 'code-output',
                isCompiler: false,
                codeSnippet: question.codeSnippet || 'let a = 10;\nlet b = 20;\nconsole.log(a + b);',
                options: question.options && question.options.length >= 2 ? question.options : ['30', '1020', 'undefined', 'NaN'],
                correctAnswer: typeof question.correctAnswer === 'number' ? question.correctAnswer : 0
            });
        } else if (newType === 'text') {
            onChange({
                ...question,
                type: 'text',
                isCompiler: false,
                correctAnswer: typeof question.correctAnswer === 'string' ? question.correctAnswer : ''
            });
        } else {
            // multiple-choice
            onChange({
                ...question,
                type: 'multiple-choice',
                isCompiler: false,
                options: question.options && question.options.length >= 2 ? question.options : ['', '', '', ''],
                correctAnswer: typeof question.correctAnswer === 'number' ? question.correctAnswer : 0
            });
        }
    };

    // Ordering Helpers
    const orderingItems = question.orderingItems || question.options || ['First Step', 'Second Step', 'Third Step', 'Fourth Step'];
    const handleMoveOrderingItem = (idx: number, dir: 'up' | 'down') => {
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= orderingItems.length) return;
        const newItems = [...orderingItems];
        const [moved] = newItems.splice(idx, 1);
        newItems.splice(targetIdx, 0, moved);
        onChange({ ...question, orderingItems: newItems, options: newItems });
    };

    const handleUpdateOrderingItem = (idx: number, val: string) => {
        const newItems = [...orderingItems];
        newItems[idx] = val;
        onChange({ ...question, orderingItems: newItems, options: newItems });
    };

    const handleAddOrderingItem = () => {
        const newItems = [...orderingItems, `Step ${orderingItems.length + 1}`];
        onChange({ ...question, orderingItems: newItems, options: newItems });
    };

    const handleRemoveOrderingItem = (idx: number) => {
        if (orderingItems.length <= 2) return;
        const newItems = orderingItems.filter((_, i) => i !== idx);
        onChange({ ...question, orderingItems: newItems, options: newItems });
    };

    // Matching Helpers
    const matchingPairs = question.matchingPairs || [
        { left: 'Premise 1', right: 'Match 1' },
        { left: 'Premise 2', right: 'Match 2' }
    ];
    const handleUpdateMatchingPair = (idx: number, field: 'left' | 'right', val: string) => {
        const newPairs = [...matchingPairs];
        newPairs[idx] = { ...newPairs[idx], [field]: val };
        onChange({ ...question, matchingPairs: newPairs });
    };

    const handleAddMatchingPair = () => {
        const newPairs = [...matchingPairs, { left: '', right: '' }];
        onChange({ ...question, matchingPairs: newPairs });
    };

    const handleRemoveMatchingPair = (idx: number) => {
        if (matchingPairs.length <= 2) return;
        const newPairs = matchingPairs.filter((_, i) => i !== idx);
        onChange({ ...question, matchingPairs: newPairs });
    };

    return (
        <div className={`transition-all ${
            isBento
                ? 'bg-[#faf9f5] border-[2.5px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] space-y-4 text-black'
                : 'bg-gray-50 dark:bg-black/40 p-4 rounded-xl border border-gray-200 dark:border-white/10 space-y-3'
        }`}>
            {/* Top Editor Banner */}
            <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 ${
                isBento ? 'border-b-2 border-black' : 'border-b border-gray-200 dark:border-white/10'
            }`}>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                        isBento
                            ? 'bg-[#bef264] border-2 border-black text-black shadow-[2px_2px_0px_#000]'
                            : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                    }`}>
                        {question.id === 0 ? '✨ New Question' : `Editing Question ${index !== undefined ? `#${index + 1}` : ''}`}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                        isBento
                            ? 'bg-[#fef08a] border-2 border-black text-black shadow-[2px_2px_0px_#000]'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}>
                        {QUESTION_TYPES.find(t => t.id === currentType)?.label || 'Multiple Choice'}
                    </span>
                </div>

                {/* Question Type Switcher: 6 Types */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {QUESTION_TYPES.map((t) => {
                        const isSelected = currentType === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => handleTypeChange(t.id)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                    isSelected
                                        ? isBento
                                            ? `${t.color} text-black border-2 border-black shadow-[2px_2px_0px_#000] scale-105`
                                            : 'bg-purple-600 text-white shadow-sm'
                                        : isBento
                                            ? 'bg-white text-gray-700 border-2 border-black hover:bg-gray-100'
                                            : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                <span>{t.icon}</span>
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Question Text / Prompt */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                        <Type className="w-3.5 h-3.5" />
                        <span>Question Prompt</span>
                    </label>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isBento
                            ? 'bg-[#fef08a] border border-black text-black shadow-[1px_1px_0px_#000]'
                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    }`}>
                        Supports LaTeX: $x^2$ or $$E=mc^2$$
                    </span>
                </div>
                <textarea
                    placeholder="Enter your question prompt here (supports multiple lines and LaTeX formulas)..."
                    value={question.question}
                    onChange={e => onChange({ ...question, question: e.target.value })}
                    className={`w-full rounded-xl p-3.5 font-semibold text-sm transition-all min-h-[95px] resize-y ${
                        isBento
                            ? 'bg-white border-2 border-black text-black placeholder-gray-400 focus:outline-none focus:shadow-[4px_4px_0px_#000]'
                            : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                    }`}
                    rows={3}
                />
                {question.question && (question.question.includes('$') || question.question.includes('\\(') || question.question.includes('\\[')) && (
                    <div className={`p-3 rounded-xl text-xs space-y-1 ${
                        isBento
                            ? 'bg-[#fef9c3] border-2 border-black shadow-[2px_2px_0px_#000] text-black'
                            : 'bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20'
                    }`}>
                        <div className="font-black flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Live LaTeX / Math Preview:</span>
                        </div>
                        <div className="pl-1 font-medium">
                            <MathRenderer text={question.question} className={isBento ? 'text-black font-semibold' : 'text-gray-800 dark:text-gray-200'} />
                        </div>
                    </div>
                )}
            </div>

            {/* Code Snippet (Shown for Code Output & Optional for Others) */}
            {(currentType === 'code-output' || question.codeSnippet !== undefined) && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                            <Code className="w-3.5 h-3.5" />
                            <span>{currentType === 'code-output' ? 'Target Code Snippet to Predict' : 'Code Snippet Preview (Optional)'}</span>
                        </label>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isBento
                                ? 'bg-[#ddd6fe] border border-black text-black shadow-[1px_1px_0px_#000]'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}>
                            Monospace
                        </span>
                    </div>
                    <div className={`relative rounded-xl overflow-hidden transition-all ${
                        isBento
                            ? 'border-2 border-black shadow-[2px_2px_0px_#000] focus-within:shadow-[4px_4px_0px_#000]'
                            : 'border border-gray-200 dark:border-white/10'
                    }`}>
                        <div className="bg-[#18181b] px-3 py-1.5 border-b border-black/50 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] border border-black/40" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] border border-black/40" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border border-black/40" />
                            <span className="text-[10px] font-mono font-bold text-gray-300 ml-2 uppercase tracking-wider">Snippet Window</span>
                        </div>
                        <textarea
                            placeholder="Provide code to display with the question (e.g. console.log output)..."
                            value={question.codeSnippet || ''}
                            onChange={e => onChange({ ...question, codeSnippet: e.target.value })}
                            className="w-full !bg-[#18181b] !text-[#f4f4f5] p-3 font-mono text-xs focus:outline-none min-h-[90px] resize-y"
                            rows={4}
                        />
                    </div>
                </div>
            )}

            {/* Optional Media: Image URL */}
            {currentType !== 'compiler' && (
                <div className="space-y-1.5">
                    <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Image URL (Optional)</span>
                    </label>
                    <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-diagram-flowchart.png"
                        value={question.imageUrl || ''}
                        onChange={e => onChange({ ...question, imageUrl: e.target.value })}
                        className={`w-full rounded-xl px-3.5 py-2.5 font-semibold text-sm transition-all ${
                            isBento
                                ? 'bg-white border-2 border-black text-black placeholder-gray-400 focus:outline-none focus:shadow-[4px_4px_0px_#000]'
                                : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                        }`}
                    />
                    {question.imageUrl && (
                        <div className={`p-3 rounded-xl flex items-center gap-3 ${
                            isBento
                                ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/10'
                        }`}>
                            <img
                                src={question.imageUrl}
                                alt="Question preview"
                                className={`max-h-24 max-w-xs rounded-lg object-contain bg-gray-50 ${
                                    isBento ? 'border-2 border-black' : 'border border-gray-200 dark:border-gray-700'
                                }`}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="text-xs space-y-1">
                                <span className={`font-black uppercase text-[10px] block ${isBento ? 'text-black' : 'text-gray-600'}`}>Image Attached</span>
                                <button
                                    type="button"
                                    onClick={() => onChange({ ...question, imageUrl: '' })}
                                    className="text-red-600 hover:text-red-800 font-bold underline text-xs cursor-pointer"
                                >
                                    Remove image
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- 1. MULTIPLE CHOICE SUB-EDITOR --- */}
            {currentType === 'multiple-choice' && (
                <div className="space-y-3 pt-2">
                    {/* Shuffle Options Card */}
                    <div
                        onClick={() => onChange({ ...question, shuffleOptions: question.shuffleOptions === false ? true : false })}
                        className={`p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between gap-3 cursor-pointer transition-all select-none ${
                            question.shuffleOptions !== false
                                ? isBento ? 'bg-[#fef08a]' : 'bg-indigo-50 dark:bg-indigo-900/30'
                                : 'bg-white dark:bg-black/20 opacity-75'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000] shrink-0">
                                <Shuffle className="w-4 h-4 text-black" />
                            </div>
                            <div>
                                <div className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                                    Shuffle Options Randomly
                                </div>
                                <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                    Turn off if options contain "Both A and B" or "All of the above"
                                </div>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-lg border-2 border-black flex items-center justify-center font-black text-xs ${
                            question.shuffleOptions !== false ? 'bg-[#bef264] text-black' : 'bg-white text-transparent'
                        }`}>
                            ✓
                        </div>
                    </div>

                    {/* Instruction Header */}
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider pt-1">
                        <span className={isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'}>
                            Answer Options ({question.options?.length || 4})
                        </span>
                        <span className="text-[11px] font-bold text-gray-500">
                            Click button to select the correct answer
                        </span>
                    </div>

                    {/* Option Cards in 2x2 Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(question.options || ['', '', '', '']).map((opt, idx) => {
                            const isCorrect = question.correctAnswer === idx;
                            const letter = String.fromCharCode(65 + idx);
                            const letterPillColors = ['bg-[#bae6fd]', 'bg-[#bef264]', 'bg-[#fef08a]', 'bg-[#ddd6fe]'];
                            const pillColor = letterPillColors[idx % letterPillColors.length];

                            return (
                                <div
                                    key={idx}
                                    className={`relative border-2 border-black rounded-xl p-3 transition-all ${
                                        isCorrect
                                            ? isBento
                                                ? 'bg-[#dcfce7] shadow-[3px_3px_0px_#000]'
                                                : 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                            : isBento
                                                ? 'bg-white shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                                : 'bg-white dark:bg-black/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-7 h-7 rounded-lg ${pillColor} border-2 border-black flex items-center justify-center font-black text-xs text-black shadow-[1px_1px_0px_#000]`}>
                                                {letter}
                                            </span>
                                            <span className="text-[11px] font-black uppercase tracking-wider text-black">
                                                Option {letter}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onChange({ ...question, correctAnswer: idx })}
                                            className={`px-2.5 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                                isCorrect
                                                    ? 'bg-[#bef264] text-black shadow-[2px_2px_0px_#000]'
                                                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-black'
                                            }`}
                                        >
                                            {isCorrect ? (
                                                <>
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                                                    <span>Correct Answer</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Circle className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>Mark Correct</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <input
                                        placeholder={`Enter choice ${letter}...`}
                                        value={opt}
                                        onChange={e => {
                                            const newVal = e.target.value;
                                            const newOptions = [...(question.options || ['', '', '', ''])];
                                            newOptions[idx] = newVal;
                                            onChange({ ...question, options: newOptions });
                                        }}
                                        className={`w-full rounded-lg px-3 py-2 font-semibold text-sm transition-all ${
                                            isBento
                                                ? 'bg-white border-2 border-black text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black'
                                                : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none'
                                        }`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- 2. ORDERING SUB-EDITOR --- */}
            {currentType === 'ordering' && (
                <div className={`space-y-3 p-4 rounded-xl ${
                    isBento
                        ? 'bg-[#fff7ed] border-2 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ListOrdered className="w-4 h-4 text-orange-600" />
                            <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                                Target Sequence Steps ({orderingItems.length} steps)
                            </span>
                        </div>
                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                            Provide steps in correct order. They will be shuffled for students.
                        </span>
                    </div>

                    <div className="space-y-2">
                        {orderingItems.map((item, idx) => (
                            <div
                                key={idx}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border-2 border-black ${
                                    isBento ? 'bg-white shadow-[2px_2px_0px_#000]' : 'bg-white dark:bg-black/30'
                                }`}
                            >
                                <span className="w-7 h-7 rounded-lg bg-[#fed7aa] border-2 border-black flex items-center justify-center font-black text-xs shrink-0 text-black shadow-[1px_1px_0px_#000]">
                                    {idx + 1}
                                </span>
                                <input
                                    placeholder={`Step #${idx + 1} description...`}
                                    value={item}
                                    onChange={e => handleUpdateOrderingItem(idx, e.target.value)}
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-black/20 font-bold text-sm bg-transparent focus:outline-none focus:border-black"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => handleMoveOrderingItem(idx, 'up')}
                                        className="p-1.5 rounded-lg border border-black hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                                        title="Move Up"
                                    >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={idx === orderingItems.length - 1}
                                        onClick={() => handleMoveOrderingItem(idx, 'down')}
                                        className="p-1.5 rounded-lg border border-black hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                                        title="Move Down"
                                    >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={orderingItems.length <= 2}
                                        onClick={() => handleRemoveOrderingItem(idx)}
                                        className="p-1.5 rounded-lg border border-black hover:bg-red-100 text-red-600 disabled:opacity-30 cursor-pointer"
                                        title="Remove Step"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddOrderingItem}
                        className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            isBento
                                ? 'bg-white hover:bg-[#fed7aa] border-2 border-black text-black shadow-[2px_2px_0px_#000]'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        }`}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Sequence Step</span>
                    </button>
                </div>
            )}

            {/* --- 3. MATCHING PAIRS SUB-EDITOR --- */}
            {currentType === 'matching' && (
                <div className={`space-y-3 p-4 rounded-xl ${
                    isBento
                        ? 'bg-[#fdf2f8] border-2 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/30'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-pink-600" />
                            <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                                Matching Pairs ({matchingPairs.length} pairs)
                            </span>
                        </div>
                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                            Left column will be matched with right column
                        </span>
                    </div>

                    <div className="space-y-2">
                        {matchingPairs.map((pair, idx) => (
                            <div
                                key={idx}
                                className={`flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl border-2 border-black ${
                                    isBento ? 'bg-white shadow-[2px_2px_0px_#000]' : 'bg-white dark:bg-black/30'
                                }`}
                            >
                                <span className="w-7 h-7 rounded-lg bg-[#fbcfe8] border-2 border-black flex items-center justify-center font-black text-xs shrink-0 text-black shadow-[1px_1px_0px_#000]">
                                    P{idx + 1}
                                </span>
                                <input
                                    placeholder="Left premise / term (e.g. HTML)..."
                                    value={pair.left}
                                    onChange={e => handleUpdateMatchingPair(idx, 'left', e.target.value)}
                                    className="flex-1 w-full sm:w-auto px-3 py-1.5 rounded-lg border border-black/20 font-bold text-sm bg-transparent focus:outline-none focus:border-black"
                                />
                                <span className="font-black text-sm text-black">➔</span>
                                <input
                                    placeholder="Right match / definition (e.g. Structure)..."
                                    value={pair.right}
                                    onChange={e => handleUpdateMatchingPair(idx, 'right', e.target.value)}
                                    className="flex-1 w-full sm:w-auto px-3 py-1.5 rounded-lg border border-black/20 font-bold text-sm bg-transparent focus:outline-none focus:border-black"
                                />
                                <button
                                    type="button"
                                    disabled={matchingPairs.length <= 2}
                                    onClick={() => handleRemoveMatchingPair(idx)}
                                    className="p-1.5 rounded-lg border border-black hover:bg-red-100 text-red-600 disabled:opacity-30 cursor-pointer shrink-0"
                                    title="Remove Pair"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddMatchingPair}
                        className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            isBento
                                ? 'bg-white hover:bg-[#fbcfe8] border-2 border-black text-black shadow-[2px_2px_0px_#000]'
                                : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                        }`}
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Matching Pair</span>
                    </button>
                </div>
            )}

            {/* --- 4. CODE OUTPUT SUB-EDITOR --- */}
            {currentType === 'code-output' && (
                <div className={`space-y-3 p-4 rounded-xl ${
                    isBento
                        ? 'bg-[#f5f3ff] border-2 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                                Predicted Output Options (or exact output)
                            </span>
                        </div>
                        <span className="text-[11px] font-bold text-gray-500">
                            Mark the correct output from the list
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(question.options || ['Output 1', 'Output 2', 'Output 3', 'Output 4']).map((opt, idx) => {
                            const isCorrect = question.correctAnswer === idx || String(question.correctAnswer) === String(opt);
                            return (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 border-black ${
                                        isCorrect
                                            ? isBento ? 'bg-[#bef264] shadow-[2px_2px_0px_#000]' : 'bg-green-100 dark:bg-green-900/30'
                                            : isBento ? 'bg-white shadow-[2px_2px_0px_#000]' : 'bg-white dark:bg-black/30'
                                    }`}
                                >
                                    <input
                                        placeholder={`Option #${idx + 1} output...`}
                                        value={opt}
                                        onChange={e => {
                                            const newOpts = [...(question.options || ['Output 1', 'Output 2', 'Output 3', 'Output 4'])];
                                            newOpts[idx] = e.target.value;
                                            onChange({ ...question, options: newOpts });
                                        }}
                                        className="flex-1 px-3 py-1 font-mono text-xs bg-transparent border-0 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onChange({ ...question, correctAnswer: idx })}
                                        className={`px-2 py-1 rounded-lg border border-black text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                                            isCorrect ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                                        }`}
                                    >
                                        {isCorrect ? 'Correct ✓' : 'Mark'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- 5. SHORT ANSWER / TEXT SUB-EDITOR --- */}
            {currentType === 'text' && (
                <div className={`space-y-3 p-4 rounded-xl ${
                    isBento
                        ? 'bg-[#f7fee7] border-2 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30'
                }`}>
                    <div className="flex items-center gap-2">
                        <AlignLeft className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                            Short Answer Key & Accepted Synonyms
                        </span>
                    </div>

                    <div>
                        <input
                            placeholder="e.g. Paris or Paris, City of Light"
                            value={typeof question.correctAnswer === 'string' ? question.correctAnswer : (Array.isArray(question.correctAnswer) ? question.correctAnswer.join(', ') : '')}
                            onChange={e => onChange({ ...question, correctAnswer: e.target.value })}
                            className={`w-full rounded-xl px-3.5 py-2.5 font-bold text-base focus:outline-none ${
                                isBento
                                    ? 'bg-white border-2 border-black text-black focus:shadow-[3px_3px_0px_#000]'
                                    : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                            }`}
                        />
                        <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 mt-1.5">
                            💡 Separate acceptable alternatives with a comma (e.g. <span className="font-mono font-black">42, forty-two</span>). Evaluation is case-insensitive and trims whitespace automatically.
                        </p>
                    </div>
                </div>
            )}

            {/* --- 6. COMPILER SUB-EDITOR --- */}
            {currentType === 'compiler' && (
                <div className={`space-y-3 p-4 rounded-xl ${
                    isBento
                        ? 'bg-[#f5f3ec] border-2 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-gray-100 dark:bg-black/20 rounded-lg'
                }`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-black uppercase tracking-wider text-black dark:text-white block mb-1">
                                Default Language
                            </label>
                            <div className="relative">
                                <select
                                    value={question.compilerConfig?.language || 'javascript'}
                                    onChange={e => {
                                        const newLang = e.target.value;
                                        const currentRef = question.compilerConfig?.referenceCode || '';
                                        const isPlaceholder = !currentRef || currentRef.trim() === '' ||
                                            /^\s*(\/\/|#)\s*Enter the correct code solution/.test(currentRef);

                                        const newCommentPrefix = newLang.includes('python') ? '#' : '//';
                                        const newRef = isPlaceholder
                                            ? `${newCommentPrefix} Enter the correct code solution here...`
                                            : currentRef;

                                        onChange({
                                            ...question,
                                            compilerConfig: {
                                                ...(question.compilerConfig || { allowedLanguages: ['javascript'] }),
                                                language: newLang,
                                                initialCode: COMPILER_INITIAL_CODE[newLang] || '',
                                                referenceCode: newRef
                                            }
                                        });
                                    }}
                                    className={`w-full rounded-xl pl-3 pr-10 py-2.5 font-bold appearance-none cursor-pointer focus:outline-none ${
                                        isBento
                                            ? 'bg-white border-2 border-black text-black focus:shadow-[3px_3px_0px_#000]'
                                            : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                    }`}
                                >
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    <option value="typescript">TypeScript</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-black pointer-events-none">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase tracking-wider text-black dark:text-white block mb-1">
                                Allowed Languages (comma separated)
                            </label>
                            <input
                                value={question.compilerConfig?.allowedLanguages?.join(', ') || 'javascript'}
                                onChange={e => onChange({
                                    ...question,
                                    compilerConfig: {
                                        ...(question.compilerConfig || { language: 'javascript', initialCode: '', referenceCode: '' }),
                                        allowedLanguages: e.target.value.split(',').map(s => s.trim())
                                    }
                                })}
                                className={`w-full rounded-xl px-3.5 py-2.5 font-bold focus:outline-none ${
                                    isBento
                                        ? 'bg-white border-2 border-black text-black focus:shadow-[3px_3px_0px_#000]'
                                        : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                }`}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-black uppercase tracking-wider text-black dark:text-white block mb-1">
                            Reference Solution Code
                        </label>
                        <div className={isBento ? 'border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_#000]' : ''}>
                            <CompilerQuestion
                                language={question.compilerConfig?.language || 'javascript'}
                                allowedLanguages={question.compilerConfig?.allowedLanguages}
                                initialCode={question.compilerConfig?.referenceCode}
                                onChange={(code) => onChange({
                                    ...question,
                                    compilerConfig: {
                                        ...(question.compilerConfig || { language: 'javascript', initialCode: '', allowedLanguages: ['javascript'] }),
                                        referenceCode: code
                                    }
                                })}
                                readOnly={false}
                                className="h-64"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Points and Explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Points */}
                <div className="space-y-1">
                    <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                        <Star className="w-3.5 h-3.5 text-black" />
                        <span>Points</span>
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            min="1"
                            value={question.points}
                            onChange={e => onChange({ ...question, points: parseInt(e.target.value) || 0 })}
                            className={`w-full rounded-xl px-3.5 py-2.5 font-black text-center focus:outline-none ${
                                isBento
                                    ? 'bg-white border-2 border-black text-black focus:shadow-[3px_3px_0px_#000]'
                                    : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                            }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500 pointer-events-none">
                            pts
                        </span>
                    </div>
                </div>

                {/* Explanation */}
                <div className="sm:col-span-2 space-y-1">
                    <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                        <Lightbulb className="w-3.5 h-3.5 text-black" />
                        <span>Explanation & Solution Hint</span>
                    </label>
                    <input
                        placeholder="Why this answer is correct (supports LaTeX $...$)"
                        value={question.explanation || ''}
                        onChange={e => onChange({ ...question, explanation: e.target.value })}
                        className={`w-full rounded-xl px-3.5 py-2.5 font-semibold text-sm placeholder-gray-400 focus:outline-none ${
                            isBento
                                ? 'bg-white border-2 border-black text-black focus:shadow-[3px_3px_0px_#000]'
                                : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50'
                        }`}
                    />
                </div>
            </div>

            {/* Explanation Math Preview */}
            {question.explanation && (question.explanation.includes('$') || question.explanation.includes('\\(') || question.explanation.includes('\\[')) && (
                <div className={`p-3 rounded-xl text-xs space-y-1 ${
                    isBento
                        ? 'bg-[#fef9c3] border-2 border-black shadow-[2px_2px_0px_#000] text-black'
                        : 'bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20'
                }`}>
                    <div className="font-black flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Explanation Formula Preview:</span>
                    </div>
                    <div className="pl-1 font-medium">
                        <MathRenderer text={question.explanation} className={isBento ? 'text-black font-semibold' : 'text-gray-800 dark:text-gray-200'} />
                    </div>
                </div>
            )}

            {/* Bottom Save / Cancel Action Bar */}
            <div className="flex items-center gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-wider text-xs transition-all cursor-pointer ${
                        isBento
                            ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5'
                            : 'bg-gray-600 dark:bg-gray-700 text-white hover:bg-gray-700'
                    }`}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-wider text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isBento
                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                            : 'bg-green-600 text-white hover:bg-green-500'
                    }`}
                >
                    <Save className="w-4 h-4" />
                    <span>Save Question</span>
                </button>
            </div>
        </div>
    );
};

export default QuestionEditor;
