import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Upload, Download, Edit2, Trash2, Code, X, MoreVertical, Search, Sparkles } from 'lucide-react';
import AiQuizGenerator from './AiQuizGenerator.tsx';
import type { Quiz, Question, UserData } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { DEFAULT_BLOCKLY_TOOLBOX, COMPILER_ALLOWED_LANGUAGES, COMPILER_INITIAL_CODE, DIFFICULTY_LEVELS } from '../../constants/quizDefaults.ts';
import CompilerQuestion from '../question-types/CompilerQuestion.tsx';

interface QuizManagementProps {
    quizzes: Quiz[];
    currentUser: UserData;
    onRefresh: () => void;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

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

            <input placeholder="Question Text" value={question.question} onChange={e => onChange({ ...question, question: e.target.value })} className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />

            <div className="grid grid-cols-1 gap-2">
                {/* Multiple Choice Editor */}
                {(!question.isBlock && !question.isCompiler) && (
                    <>
                        <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Click on an option to mark it as correct</label>
                        <div className="grid grid-cols-2 gap-2">
                            {question.options?.map((opt, idx) => (
                                <div key={idx} className="relative">
                                    <input
                                        placeholder={`Option ${idx + 1}`}
                                        value={opt}
                                        onChange={e => {
                                            const newOptions = [...(question.options || [])];
                                            newOptions[idx] = e.target.value;
                                            onChange({ ...question, options: newOptions });
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
                            onChange={code => onChange({ ...question, compilerConfig: { ...(question.compilerConfig || { language: 'javascript', allowedLanguages: ['javascript'], initialCode: '' }), referenceCode: code } })}
                            className="h-64"
                        />
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 uppercase font-bold">Points:</label>
                <input type="number" value={question.points} onChange={e => onChange({ ...question, points: parseInt(e.target.value) })} className="w-20 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1" />
            </div>
            <input placeholder="Explanation (Optional)" value={question.explanation || ''} onChange={e => onChange({ ...question, explanation: e.target.value })} className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />

            <div className="flex gap-2">
                <button onClick={onSave} className="flex-1 py-2 bg-green-600 text-white rounded-lg">Save</button>
                <button onClick={onCancel} className="flex-1 py-2 bg-gray-600 text-white rounded-lg">Cancel</button>
            </div>
        </div>
    );
};

const QuizManagement: React.FC<QuizManagementProps> = ({ quizzes, currentUser, onRefresh, onNotification }) => {
    const [localQuizzes, setLocalQuizzes] = useState<Quiz[]>(quizzes);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [activeModalTab, setActiveModalTab] = useState<'general' | 'questions'>('general');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string } | null>(null);
    const [activeHeaderMenu, setActiveHeaderMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // AI Generator Modal State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    const filteredQuizzes = localQuizzes.filter(q =>
        !q.isTournamentOnly &&
        (q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        setLocalQuizzes(quizzes);
    }, [quizzes]);

    const handleDownloadQuiz = (quiz: Quiz) => {
        const dataStr = JSON.stringify(quiz, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${quiz.id || quiz.title.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onNotification('success', `Quiz "${quiz.title}" downloaded successfully`);
    };

    const handleDeleteQuiz = (quizId: string) => {
        setDeleteConfirmation({ isOpen: true, id: quizId });
    };

    const confirmDeleteQuiz = async () => {
        if (!deleteConfirmation) return;
        try {
            await api.deleteQuiz(deleteConfirmation.id, currentUser.userId);
            setLocalQuizzes(prev => prev.filter(q => q.id !== deleteConfirmation.id));
            onNotification('success', 'Quiz deleted successfully');
            onRefresh();
        } catch (error) {
            console.error('Delete error:', error);
            onNotification('error', 'Failed to delete quiz');
        } finally {
            setDeleteConfirmation(null);
        }
    };

    const handleSaveQuiz = async () => {
        if (!editingQuiz) return;

        // Validation
        if (!editingQuiz.title.trim() || !editingQuiz.description.trim()) {
            onNotification('error', 'Title and Description are required');
            return;
        }
        if (editingQuiz.timeLimit < 0) {
            onNotification('error', 'Time limit cannot be negative');
            return;
        }
        if (editingQuiz.questions.length === 0) {
            onNotification('error', 'Quiz must have at least one question');
            return;
        }
        // Check for missing reference codes in compiler questions
        const missingRef = editingQuiz.questions.find(q => q.isCompiler && (!q.compilerConfig?.referenceCode || !q.compilerConfig.referenceCode.trim()));
        if (missingRef) {
            onNotification('error', `Question "${missingRef.question}" is missing a reference answer code.`);
            return;
        }

        try {
            // Ensure all questions have required fields
            const validatedQuestions = editingQuiz.questions.map(q => ({
                ...q,
                part: q.part || 'A', // Ensure part exists
                id: Number(q.id) // Ensure ID is number
            }));

            const quizToSave = {
                ...editingQuiz,
                questions: validatedQuestions,
                id: editingQuiz.id || crypto.randomUUID()
            };

            if (editingQuiz.id && localQuizzes.some(q => q.id === editingQuiz.id)) {
                await api.updateQuiz(editingQuiz.id, quizToSave, currentUser.userId);
                setLocalQuizzes(prev => prev.map(q => q.id === editingQuiz.id ? quizToSave : q));
                onNotification('success', 'Quiz updated successfully');
            } else {
                await api.createQuiz(quizToSave, currentUser.userId);
                setLocalQuizzes(prev => [...prev, quizToSave]);
                onNotification('success', 'Quiz created successfully');
            }
            setEditingQuiz(null);
            onRefresh();
        } catch (error) {
            console.error('Save quiz error:', error);
            onNotification('error', 'Failed to save quiz. Please check all fields.');
        }
    };

    const handleImportQuiz = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                const result = await api.importQuizzes(json, currentUser.userId);
                onNotification('success', result.message || 'Quizzes imported successfully');
                onRefresh();
            } catch (error) {
                console.error('Import error:', error);
                onNotification('error', 'Failed to import quizzes. Invalid JSON.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleQuestionUpdate = (updatedQuestion: Question) => {
        if (!editingQuiz) return;
        const newQuestions = editingQuiz.questions.map(q =>
            q.id === updatedQuestion.id ? updatedQuestion : q
        );
        setEditingQuiz({ ...editingQuiz, questions: newQuestions });
        setEditingQuestion(null);
    };

    const handleAddQuestion = (newQuestion: Question) => {
        if (!editingQuiz) return;
        setEditingQuiz({
            ...editingQuiz,
            questions: [...editingQuiz.questions, newQuestion]
        });
        setEditingQuestion(null);
    };

    const handleDeleteQuestion = (questionId: number) => {
        if (!editingQuiz) return;
        setEditingQuiz({
            ...editingQuiz,
            questions: editingQuiz.questions.filter(q => q.id !== questionId)
        });
    };

    const handleDownloadSample = () => {
        const sampleQuiz: Quiz = {
            id: 'sample-quiz-template',
            title: 'Sample Quiz Template',
            description: 'Use this template to structure your JSON import.',
            category: 'General',
            difficulty: 'Easy',
            timeLimit: 15,
            passingScore: 70,
            coinsReward: 50,
            xpReward: 100,
            icon: 'Code',
            isTournamentOnly: false,
            questions: [
                {
                    id: 1,
                    type: 'multiple-choice',
                    part: 'Part 1',
                    question: 'Multiple Choice Example',
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correctAnswer: 0,
                    points: 10,
                    explanation: 'Explanation for the correct answer.'
                },
                {
                    id: 2,
                    type: 'multiple-choice', // Frontend uses 'multiple-choice' with isBlock=true
                    part: 'Part 2',
                    question: 'Block Logic Example',
                    options: [],
                    isBlock: true,
                    blockConfig: {
                        toolbox: '<xml>...</xml>', // Optional custom toolbox
                        initialXml: '<xml>...</xml>',
                        referenceXml: '<xml>...</xml>'
                    },
                    points: 20,
                    explanation: 'Arrange blocks to solve.'
                },
                {
                    id: 3,
                    type: 'text', // Frontend uses 'text' with isCompiler=true
                    part: 'Part 3',
                    question: 'Code Compiler Example',
                    options: [],
                    isCompiler: true,
                    compilerConfig: {
                        language: 'javascript',
                        allowedLanguages: ['javascript', 'python', 'typescript'],
                        initialCode: '// Write your code here'
                    },
                    points: 30,
                    explanation: 'Write code to solve the problem.'
                }
            ]
        };

        const dataStr = JSON.stringify([sampleQuiz], null, 2); // Export as array for import compatibility
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'quiz-import-sample.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between mb-8 items-center">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Quiz Management</h2>
                <div className="flex gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setActiveHeaderMenu(!activeHeaderMenu)}
                            className="p-3 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 rounded-xl transition-colors"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {activeHeaderMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1e1e2d] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <button
                                    onClick={() => { handleDownloadSample(); setActiveHeaderMenu(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"
                                >
                                    <Download className="w-4 h-4 text-gray-400" /> Sample JSON
                                </button>
                                <label className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                                    <Upload className="w-4 h-4 text-emerald-500" /> Import JSON
                                    <input type="file" accept=".json" className="hidden" onChange={(e) => { handleImportQuiz(e); setActiveHeaderMenu(false); }} />
                                </label>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsAiModalOpen(true)}
                        className="px-4 py-3 bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/20 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                    >
                        <Sparkles className="w-5 h-5 text-purple-500" /> AI Generator
                    </button>

                    <button
                        onClick={() => { setEditingQuiz({ id: '', title: '', description: '', timeLimit: 10, passingScore: 60, coinsReward: 10, xpReward: 50, category: 'General', difficulty: DIFFICULTY_LEVELS[0], icon: 'Code', questions: [] }); setActiveModalTab('general'); }}
                        className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-violet-500/25 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Create Quiz
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6 bg-white dark:bg-[#13141f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search quizzes by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 font-medium"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQuizzes.map(quiz => (
                    <div key={quiz.id} className="bg-white dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 hover:border-purple-500/30 transition-all group shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{quiz.title}</h3>
                                <p className="text-sm text-gray-500">{quiz.questions.length} Questions • {quiz.timeLimit === 0 ? 'Unlimited' : `${quiz.timeLimit}m`}</p>
                            </div>
                            <div className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{quiz.category}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleDownloadQuiz(quiz)} className="flex-1 py-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Export</button>
                            <button onClick={() => setEditingQuiz(quiz)} className="flex-1 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><Edit2 className="w-4 h-4" /> Edit</button>
                            <button onClick={() => handleDeleteQuiz(quiz.id)} className="flex-1 py-2 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                        </div>
                    </div>
                ))}
                {filteredQuizzes.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <Code className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 font-bold">No quizzes found</p>
                    </div>
                )}
            </div>

            {/* AI Generator Modal */}
            {isAiModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl relative flex flex-col">
                        <button
                            onClick={() => setIsAiModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white z-10 p-2 bg-black/10 dark:bg-white/10 rounded-full hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex-1 overflow-hidden p-8">
                            <AiQuizGenerator
                                adminId={currentUser.userId}
                                onQuizCreated={() => {
                                    onRefresh();
                                    setIsAiModalOpen(false);
                                    onNotification('success', 'Quiz Generated from AI!');
                                }}
                                onNotification={onNotification}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Quiz Editor Modal */}
            {
                editingQuiz && createPortal(
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                            <button onClick={() => setEditingQuiz(null)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>

                            <div className="flex gap-4 border-b border-white/10 pb-4 mb-6">
                                <button onClick={() => setActiveModalTab('general')} className={`font-bold ${activeModalTab === 'general' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'}`}>General</button>
                                <button onClick={() => setActiveModalTab('questions')} className={`font-bold ${activeModalTab === 'questions' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'}`}>Questions</button>
                            </div>

                            {activeModalTab === 'general' ? (
                                <div className="space-y-4">
                                    <input placeholder="Title" value={editingQuiz.title} onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                    <textarea placeholder="Description" value={editingQuiz.description} onChange={e => setEditingQuiz({ ...editingQuiz, description: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Time Limit (min) - 0 for unlimited</label>
                                            <input type="number" placeholder="Time Limit" value={editingQuiz.timeLimit} onChange={e => setEditingQuiz({ ...editingQuiz, timeLimit: parseInt(e.target.value) })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Passing Score (%)</label>
                                            <input type="number" placeholder="Passing Score" value={editingQuiz.passingScore} onChange={e => setEditingQuiz({ ...editingQuiz, passingScore: parseInt(e.target.value) })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-emerald-600 dark:text-emerald-400 font-bold ml-1">Coins Reward</label>
                                            <input type="number" placeholder="Coins" value={editingQuiz.coinsReward ?? 10} onChange={e => setEditingQuiz({ ...editingQuiz, coinsReward: parseInt(e.target.value) })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-indigo-600 dark:text-indigo-400 font-bold ml-1">XP Reward</label>
                                            <input type="number" placeholder="XP" value={editingQuiz.xpReward ?? 50} onChange={e => setEditingQuiz({ ...editingQuiz, xpReward: parseInt(e.target.value) })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Category</label>
                                            <input type="text" placeholder="Category" value={editingQuiz.category} onChange={e => setEditingQuiz({ ...editingQuiz, category: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Difficulty</label>
                                            <select value={editingQuiz.difficulty} onChange={e => setEditingQuiz({ ...editingQuiz, difficulty: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                                {DIFFICULTY_LEVELS.map(level => (
                                                    <option key={level} value={level}>{level}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                        <input
                                            type="checkbox"
                                            id="reviewMode"
                                            checked={editingQuiz.reviewMode || false}
                                            onChange={e => setEditingQuiz({ ...editingQuiz, reviewMode: e.target.checked })}
                                            className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <label htmlFor="reviewMode" className="flex-1 cursor-pointer">
                                            <div className="text-sm font-bold text-purple-900 dark:text-purple-100">Enable Review Mode</div>
                                            <div className="text-xs text-purple-700 dark:text-purple-300">Show immediate feedback and explanations after each answer</div>
                                        </label>
                                    </div>
                                    <button onClick={handleSaveQuiz} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">Save Quiz</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                                        <span className="text-gray-900 dark:text-white font-bold">Questions Editor</span>
                                        <button onClick={() => setEditingQuestion({ id: 0, type: 'multiple-choice', part: 'A', question: '', options: ['', '', '', ''], correctAnswer: Math.floor(Math.random() * 4), points: 10, explanation: '' })} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold">Add Question</button>
                                    </div>

                                    {editingQuestion && editingQuestion.id === 0 && (
                                        <QuestionEditor
                                            question={editingQuestion}
                                            onChange={setEditingQuestion}
                                            onSave={() => handleAddQuestion({ ...editingQuestion, id: Date.now() })}
                                            onCancel={() => setEditingQuestion(null)}
                                        />
                                    )}

                                    <div className="space-y-2">
                                        {editingQuiz.questions.map((q, i) => (
                                            <React.Fragment key={q.id}>
                                                {editingQuestion && editingQuestion.id === q.id ? (
                                                    <QuestionEditor
                                                        question={editingQuestion}
                                                        onChange={setEditingQuestion}
                                                        onSave={() => handleQuestionUpdate(editingQuestion)}
                                                        onCancel={() => setEditingQuestion(null)}
                                                    />
                                                ) : (
                                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5">
                                                        <span className="text-gray-600 dark:text-gray-300 truncate w-2/3">{i + 1}. {q.question}</span>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => {
                                                                const qToEdit = { ...q };
                                                                // Hydrate reference code if missing
                                                                if (qToEdit.isCompiler && (!qToEdit.compilerConfig?.referenceCode || qToEdit.compilerConfig.referenceCode.trim() === '')) {
                                                                    const lang = qToEdit.compilerConfig?.language || 'javascript';
                                                                    const comment = lang.includes('python') ? '# Enter the correct code solution here...' : '// Enter the correct code solution here...';
                                                                    qToEdit.compilerConfig = {
                                                                        ...(qToEdit.compilerConfig || { language: 'javascript', allowedLanguages: ['javascript'], initialCode: '' }),
                                                                        referenceCode: comment
                                                                    };
                                                                }
                                                                setEditingQuestion(qToEdit);
                                                            }} className="text-blue-400"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>

                            )}
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteConfirmation && createPortal(
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20">
                                <Trash2 className="h-8 w-8 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
                                Are you sure you want to delete this quiz? This action cannot be undone.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setDeleteConfirmation(null)}
                                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteQuiz}
                                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div >
    );
};

export default QuizManagement;
