import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Trash2 } from 'lucide-react';
import QuestionEditor from './QuestionEditor';
import type { Quiz, Question, Subject } from '../../types';
import { DIFFICULTY_LEVELS } from '../../constants/quizDefaults';

interface QuizEditorModalProps {
    isOpen: boolean;
    quiz: Quiz | null;
    subjects: Subject[];
    onClose: () => void;
    onSave: (quiz: Quiz) => void;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const QuizEditorModal: React.FC<QuizEditorModalProps> = ({ isOpen, quiz, subjects, onClose, onSave, onNotification }) => {
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [activeModalTab, setActiveModalTab] = useState<'general' | 'questions'>('general');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    useEffect(() => {
        if (quiz) {
            setEditingQuiz({ ...quiz });
            setActiveModalTab('general');
            setEditingQuestion(null);
        }
    }, [quiz]);

    if (!isOpen || !editingQuiz) return null;

    const handleSaveQuiz = () => {
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

        onSave(editingQuiz);
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

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white">
                    <X className="w-6 h-6" />
                </button>

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
                                <input type="number" placeholder="Time Limit" value={editingQuiz.timeLimit} onChange={e => setEditingQuiz({ ...editingQuiz, timeLimit: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Passing Score (%)</label>
                                <input type="number" placeholder="Passing Score" value={editingQuiz.passingScore} onChange={e => setEditingQuiz({ ...editingQuiz, passingScore: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-emerald-600 dark:text-emerald-400 font-bold ml-1">Coins Reward</label>
                                <input type="number" placeholder="Coins" value={editingQuiz.coinsReward ?? 10} onChange={e => setEditingQuiz({ ...editingQuiz, coinsReward: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-indigo-600 dark:text-indigo-400 font-bold ml-1">XP Reward</label>
                                <input type="number" placeholder="XP" value={editingQuiz.xpReward ?? 50} onChange={e => setEditingQuiz({ ...editingQuiz, xpReward: parseInt(e.target.value) || 0 })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Category</label>
                                <input type="text" placeholder="Category" value={editingQuiz.category} onChange={e => setEditingQuiz({ ...editingQuiz, category: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Subject (Stack)</label>
                                <select
                                    value={editingQuiz.subjectId || ''}
                                    onChange={e => setEditingQuiz({ ...editingQuiz, subjectId: e.target.value || undefined })}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                >
                                    <option value="">Uncategorized</option>
                                    {subjects.map(s => (
                                        <option key={s._id} value={s._id}>{s.title}</option>
                                    ))}
                                </select>
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
    );
};

export default QuizEditorModal;
