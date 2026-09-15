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
    Save
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

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, index, onChange, onSave, onCancel }) => {
    const { isBento } = useTheme();

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
                        {question.isCompiler ? '💻 Compiler' : '📋 Multiple Choice'}
                    </span>
                </div>

                {/* Question Type Switcher */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            onChange({
                                ...question,
                                type: 'multiple-choice',
                                isCompiler: false
                            });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            !question.isCompiler
                                ? isBento
                                    ? 'bg-[#bae6fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-purple-600 text-white shadow-sm'
                                : isBento
                                    ? 'bg-white text-gray-700 border-2 border-black hover:bg-gray-100'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                        Multiple Choice
                    </button>
                    <button
                        type="button"
                        onClick={() => {
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
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            question.isCompiler
                                ? isBento
                                    ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-purple-600 text-white shadow-sm'
                                : isBento
                                    ? 'bg-white text-gray-700 border-2 border-black hover:bg-gray-100'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                        Code Compiler
                    </button>
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

            {/* Code Snippet Preview (Optional) */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                        <Code className="w-3.5 h-3.5" />
                        <span>Code Snippet Preview (Optional)</span>
                    </label>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isBento
                            ? 'bg-[#ddd6fe] border border-black text-black shadow-[1px_1px_0px_#000]'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                        Monospace Output
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
                        placeholder="Provide code to display with the question (e.g. 'What is the output of this code?')..."
                        value={question.codeSnippet || ''}
                        onChange={e => onChange({ ...question, codeSnippet: e.target.value })}
                        className="w-full !bg-[#18181b] !text-[#f4f4f5] p-3 font-mono text-xs focus:outline-none min-h-[90px] resize-y"
                        rows={4}
                    />
                </div>
            </div>

            {/* Image URL (Optional) */}
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

            {/* Multiple Choice Editor */}
            {!question.isCompiler && (
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
                            Click option card or button to select the correct answer
                        </span>
                    </div>

                    {/* 4 Option Cards in 2x2 Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(question.options || ['', '', '', '']).map((opt, idx) => {
                            const isCorrect = question.correctAnswer === idx;
                            const letter = String.fromCharCode(65 + idx);
                            const letterPillColors = [
                                'bg-[#bae6fd]', // Sky Blue
                                'bg-[#bef264]', // Lime Green
                                'bg-[#fef08a]', // Sun Yellow
                                'bg-[#ddd6fe]'  // Lilac
                            ];
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
                                            const newOptions = [...(question.options || [])];
                                            newOptions[idx] = newVal;

                                            // Auto-detect non-shuffleable patterns
                                            let shuffleOptions = question.shuffleOptions;
                                            const nonShufflePatterns = [
                                                /both.*(and|&)/i,
                                                /all of the above/i,
                                                /none of the above/i,
                                                /neither.*nor/i,
                                                /options?.*(and|&)/i,
                                                /choices?.*(and|&)/i,
                                                /^[a-z]\s*(and|&)\s*[a-z]$/i
                                            ];

                                            if (shuffleOptions !== false && nonShufflePatterns.some(p => p.test(newVal))) {
                                                shuffleOptions = false;
                                            }

                                            onChange({ ...question, options: newOptions, shuffleOptions });
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

            {/* Compiler Editor Fields */}
            {question.isCompiler && (
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
