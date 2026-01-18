import React from 'react';
import { DEFAULT_BLOCKLY_TOOLBOX, COMPILER_ALLOWED_LANGUAGES, COMPILER_INITIAL_CODE } from '../../constants/quizDefaults';
import CompilerQuestion from '../question-types/CompilerQuestion';
import type { Question } from '../../types';

interface QuestionEditorProps {
    question: Question;
    onChange: (q: Question) => void;
    onSave: () => void;
    onCancel: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({ question, onChange, onSave, onCancel }) => {
    return (
        <div className="bg-gray-50 dark:bg-black/40 p-4 rounded-xl border border-gray-200 dark:border-white/10 space-y-3">
            <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Question Type</label>
                    <select
                        value={question.isBlock ? 'block' : question.isCompiler ? 'compiler' : 'multiple-choice'}
                        onChange={e => {
                            const type = e.target.value;
                            if (type === 'block') {
                                onChange({
                                    ...question,
                                    type: 'multiple-choice', // Legacy fallback
                                    isBlock: true,
                                    isCompiler: false,
                                    blockConfig: { referenceXml: '', toolbox: DEFAULT_BLOCKLY_TOOLBOX, initialXml: '' }
                                });
                            } else if (type === 'compiler') {
                                onChange({
                                    ...question,
                                    type: 'text', // Legacy fallback
                                    isBlock: false,
                                    isCompiler: true,
                                    compilerConfig: {
                                        language: 'javascript',
                                        allowedLanguages: COMPILER_ALLOWED_LANGUAGES,
                                        initialCode: COMPILER_INITIAL_CODE['javascript'],
                                        referenceCode: '// Enter the correct code solution here...'
                                    }
                                });
                            } else {
                                onChange({
                                    ...question,
                                    type: 'multiple-choice',
                                    isBlock: false,
                                    isCompiler: false
                                });
                            }
                        }}
                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="block">Block (Scratch-like)</option>
                        <option value="compiler">Code Compiler</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Question Text</label>
                <textarea
                    placeholder="Enter your question here (supports multiple lines)"
                    value={question.question}
                    onChange={e => onChange({ ...question, question: e.target.value })}
                    className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px] resize-y"
                    rows={4}
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Image URL (Optional)</label>
                <input
                    type="url"
                    placeholder="https://example.com/image.png"
                    value={question.imageUrl || ''}
                    onChange={e => onChange({ ...question, imageUrl: e.target.value })}
                    className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                {question.imageUrl && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-white/10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Image Preview:</p>
                        <img
                            src={question.imageUrl}
                            alt="Question preview"
                            className="max-h-32 rounded-lg border border-gray-200 dark:border-gray-700 object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-2">
                {/* Multiple Choice Editor */}
                {(!question.isBlock && !question.isCompiler) && (
                    <>
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 mb-2">
                            <input
                                type="checkbox"
                                id="shuffleOptions"
                                checked={question.shuffleOptions !== false}
                                onChange={e => onChange({ ...question, shuffleOptions: e.target.checked })}
                                className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                            />
                            <label htmlFor="shuffleOptions" className="flex-1 cursor-pointer">
                                <div className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Shuffle Options</div>
                                <div className="text-xs text-indigo-700 dark:text-indigo-300">Disable this if options contain "Both A and B", "All of the above", etc.</div>
                            </label>
                        </div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Click on an option to mark it as correct</label>
                        <div className="grid grid-cols-2 gap-2">
                            {question.options?.map((opt, idx) => (
                                <div key={idx} className="relative">
                                    <input
                                        placeholder={`Option ${idx + 1}`}
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
                                        onClick={() => onChange({ ...question, correctAnswer: idx })}
                                        className={`w-full bg-white dark:bg-black/40 border-2 ${question.correctAnswer === idx ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-white/10'} rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none cursor-pointer transition-all`}
                                    />
                                    {question.correctAnswer === idx && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400 text-xs font-bold pointer-events-none">
                                            ✓ Correct
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Block Editor Fields */}
                {question.isBlock && (
                    <div className="space-y-2 p-3 bg-gray-100 dark:bg-black/20 rounded-lg">
                        <label className="text-xs font-bold text-gray-500 uppercase">Block Reference XML (Answer)</label>
                        <textarea
                            value={question.blockConfig?.referenceXml || ''}
                            onChange={e => onChange({ ...question, blockConfig: { ...question.blockConfig, referenceXml: e.target.value } })}
                            placeholder="<xml>...</xml>"
                            className="w-full h-24 font-mono text-xs bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        />
                        <label className="text-xs font-bold text-gray-500 uppercase">Initial Workspace XML (Optional)</label>
                        <textarea
                            value={question.blockConfig?.initialXml || ''}
                            onChange={e => onChange({ ...question, blockConfig: { ...question.blockConfig, initialXml: e.target.value } })}
                            placeholder="<xml>...</xml>"
                            className="w-full h-24 font-mono text-xs bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        />
                        <label className="text-xs font-bold text-gray-500 uppercase">Toolbox XML (Optional - customization)</label>
                        <textarea
                            value={question.blockConfig?.toolbox || ''}
                            onChange={e => onChange({ ...question, blockConfig: { ...question.blockConfig, toolbox: e.target.value } })}
                            placeholder="<xml>...</xml> (Leave empty for default toolbox)"
                            className="w-full h-24 font-mono text-xs bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                        />
                    </div>
                )}

                {/* Compiler Editor Fields */}
                {question.isCompiler && (
                    <div className="space-y-2 p-3 bg-gray-100 dark:bg-black/20 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Default Language</label>
                                <select
                                    value={question.compilerConfig?.language || 'javascript'}
                                    onChange={e => {
                                        const newLang = e.target.value;
                                        const currentRef = question.compilerConfig?.referenceCode || '';

                                        // Check if current ref is just a default placeholder (handles // and # and leading regex)
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
                                    className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                                >
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    <option value="typescript">TypeScript</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Allowed Languages (comma sep)</label>
                                <input
                                    value={question.compilerConfig?.allowedLanguages?.join(',') || 'javascript'}
                                    onChange={e => onChange({ ...question, compilerConfig: { ...(question.compilerConfig || { language: 'javascript', initialCode: '', referenceCode: '' }), allowedLanguages: e.target.value.split(',').map(s => s.trim()) } })}
                                    className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <label className="text-xs font-bold text-gray-500 uppercase mt-2">Reference Answer Code</label>
                        <CompilerQuestion
                            language={question.compilerConfig?.language || 'javascript'}
                            allowedLanguages={question.compilerConfig?.allowedLanguages}
                            initialCode={question.compilerConfig?.referenceCode}
                            onChange={(code) => onChange({ ...question, compilerConfig: { ...(question.compilerConfig || { language: 'javascript', initialCode: '', allowedLanguages: ['javascript'] }), referenceCode: code } })}
                            readOnly={false}
                            className="h-64"
                        />
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 uppercase font-bold">Points:</label>
                <input
                    type="number"
                    value={question.points}
                    onChange={e => onChange({ ...question, points: parseInt(e.target.value) || 0 })}
                    className="w-20 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1"
                />
            </div>
            <input
                placeholder="Explanation (Optional)"
                value={question.explanation || ''}
                onChange={e => onChange({ ...question, explanation: e.target.value })}
                className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />

            <div className="flex gap-2">
                <button onClick={onSave} className="flex-1 py-2 bg-green-600 text-white rounded-lg">Save</button>
                <button onClick={onCancel} className="flex-1 py-2 bg-gray-600 text-white rounded-lg">Cancel</button>
            </div>
        </div>
    );
};

export default QuestionEditor;
