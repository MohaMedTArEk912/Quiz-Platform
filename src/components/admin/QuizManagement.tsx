import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Upload, Download, Edit2, Trash2, Code, X } from 'lucide-react';
import type { Quiz, Question, UserData } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface QuizManagementProps {
    quizzes: Quiz[];
    currentUser: UserData;
    onRefresh: () => void;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const QuizManagement: React.FC<QuizManagementProps> = ({ quizzes, currentUser, onRefresh, onNotification }) => {
    const [localQuizzes, setLocalQuizzes] = useState<Quiz[]>(quizzes);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [activeModalTab, setActiveModalTab] = useState<'general' | 'questions'>('general');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string } | null>(null);

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

        try {
            if (editingQuiz.id && localQuizzes.some(q => q.id === editingQuiz.id)) {
                await api.updateQuiz(editingQuiz.id, editingQuiz, currentUser.userId);
                setLocalQuizzes(prev => prev.map(q => q.id === editingQuiz.id ? editingQuiz : q));
                onNotification('success', 'Quiz updated successfully');
            } else {
                const newQuiz = { ...editingQuiz, id: editingQuiz.id || crypto.randomUUID() };
                await api.createQuiz(newQuiz, currentUser.userId);
                setLocalQuizzes(prev => [...prev, newQuiz]);
                onNotification('success', 'Quiz created successfully');
            }
            setEditingQuiz(null);
            onRefresh();
        } catch (error) {
            console.error('Save quiz error:', error);
            onNotification('error', 'Failed to save quiz');
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

    return (
        <div>
            <div className="flex flex-wrap gap-4 justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Quiz Management</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setEditingQuiz({ id: '', title: '', description: '', timeLimit: 10, passingScore: 60, coinsReward: 10, xpReward: 50, category: 'General', difficulty: 'Beginner', icon: 'Code', questions: [] }); setActiveModalTab('general'); }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Create Quiz
                    </button>
                    <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg cursor-pointer flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Import JSON
                        <input type="file" accept=".json" className="hidden" onChange={handleImportQuiz} />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localQuizzes.filter(q => !q.isTournamentOnly).map(quiz => (
                    <div key={quiz.id} className="bg-white dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 hover:border-purple-500/30 transition-all group shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{quiz.title}</h3>
                                <p className="text-sm text-gray-500">{quiz.questions.length} Questions • {quiz.timeLimit}m</p>
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
                {localQuizzes.filter(q => !q.isTournamentOnly).length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <Code className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 font-bold">No quizzes found</p>
                    </div>
                )}
            </div>

            {/* Quiz Editor Modal */}
            {editingQuiz && createPortal(
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
                                        <label className="text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">Time Limit (min)</label>
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
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleSaveQuiz} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold">Save Quiz</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                                    <span className="text-gray-900 dark:text-white font-bold">Questions Editor</span>
                                    <button onClick={() => setEditingQuestion({ id: 0, type: 'multiple-choice', part: 'A', question: '', options: ['', '', '', ''], correctAnswer: 0, points: 10, explanation: '' })} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold">Add Question</button>
                                </div>
                                {editingQuestion && (
                                    <div className="bg-gray-50 dark:bg-black/40 p-4 rounded-xl border border-gray-200 dark:border-white/10 space-y-3">
                                        <input placeholder="Question Text" value={editingQuestion.question} onChange={e => setEditingQuestion({ ...editingQuestion, question: e.target.value })} className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Basic Options Editor for Multiple Choice */}
                                            {editingQuestion.type === 'multiple-choice' && editingQuestion.options?.map((opt, idx) => (
                                                <input
                                                    key={idx}
                                                    placeholder={`Option ${idx + 1}`}
                                                    value={opt}
                                                    onChange={e => {
                                                        const newOptions = [...(editingQuestion.options || [])];
                                                        newOptions[idx] = e.target.value;
                                                        setEditingQuestion({ ...editingQuestion, options: newOptions });
                                                    }}
                                                    className={`w-full bg-white dark:bg-black/40 border ${editingQuestion.correctAnswer === idx ? 'border-green-500' : 'border-gray-200 dark:border-white/10'} rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-gray-500 uppercase font-bold">Points:</label>
                                            <input type="number" value={editingQuestion.points} onChange={e => setEditingQuestion({ ...editingQuestion, points: parseInt(e.target.value) })} className="w-20 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1" />
                                        </div>
                                        <input placeholder="Explanation (Optional)" value={editingQuestion.explanation || ''} onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })} className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />

                                        <div className="flex gap-2">
                                            <button onClick={() => { if (editingQuestion.id === 0) handleAddQuestion({ ...editingQuestion, id: Date.now() }); else handleQuestionUpdate(editingQuestion); }} className="flex-1 py-2 bg-green-600 text-white rounded-lg">Save</button>
                                            <button onClick={() => setEditingQuestion(null)} className="flex-1 py-2 bg-gray-600 text-white rounded-lg">Cancel</button>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {editingQuiz.questions.map((q, i) => (
                                        <div key={q.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5">
                                            <span className="text-gray-600 dark:text-gray-300 truncate w-2/3">{i + 1}. {q.question}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingQuestion(q)} className="text-blue-400"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && createPortal(
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
            )}
        </div>
    );
};

export default QuizManagement;
