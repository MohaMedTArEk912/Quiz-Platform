import React, { useState, useEffect } from 'react';
import { 
    Edit2, 
    Trash2, 
    Sparkles, 
    Check, 
    Plus, 
    Clock, 
    Target, 
    Coins, 
    Zap, 
    Type, 
    FileText, 
    Folder, 
    Sliders,
    Layers,
    Eye
} from 'lucide-react';
import Modal from '../common/Modal';
import QuestionEditor from './QuestionEditor';
import type { Quiz, Question, Subject } from '../../types';
import { DIFFICULTY_LEVELS } from '../../constants/quizDefaults';
import { QUIZ_ICON_OPTIONS, getQuizIconOption, DEFAULT_QUIZ_ICON } from '../../utils/quizIcons';
import { useTheme } from '../../context/ThemeContext';

interface QuizEditorModalProps {
    isOpen: boolean;
    quiz: Quiz | null;
    subjects: Subject[];
    onClose: () => void;
    onSave: (quiz: Quiz) => void;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const QuizEditorModal: React.FC<QuizEditorModalProps> = ({ 
    isOpen, 
    quiz, 
    subjects, 
    onClose, 
    onSave, 
    onNotification 
}) => {
    const { isBento } = useTheme();
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [activeModalTab, setActiveModalTab] = useState<'general' | 'questions'>('general');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    useEffect(() => {
        if (quiz) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setEditingQuiz({ ...quiz, icon: quiz.icon || DEFAULT_QUIZ_ICON, questions: quiz.questions || [] });
            setActiveModalTab('general');
            setEditingQuestion(null);
        }
    }, [quiz]);

    if (!editingQuiz) return null;

    const handleSaveQuiz = () => {
        if (!editingQuiz) return;

        // Validation
        if (!editingQuiz.title?.trim() || !editingQuiz.description?.trim()) {
            onNotification('error', 'Title and Description are required');
            return;
        }
        if (editingQuiz.timeLimit < 0) {
            onNotification('error', 'Time limit cannot be negative');
            return;
        }
        if (!editingQuiz.questions || editingQuiz.questions.length === 0) {
            onNotification('error', 'Quiz must have at least one question');
            return;
        }
        // Check for missing reference codes in compiler questions
        const missingRef = editingQuiz.questions?.find(q => q.isCompiler && (!q.compilerConfig?.referenceCode || !q.compilerConfig.referenceCode.trim()));
        if (missingRef) {
            onNotification('error', `Question "${missingRef.question}" is missing a reference answer code.`);
            return;
        }

        onSave(editingQuiz);
    };

    const handleQuestionUpdate = (updatedQuestion: Question) => {
        if (!editingQuiz) return;
        const newQuestions = (editingQuiz.questions || []).map(q =>
            q.id === updatedQuestion.id ? updatedQuestion : q
        );
        setEditingQuiz({ ...editingQuiz, questions: newQuestions });
        setEditingQuestion(null);
    };

    const handleAddQuestion = (newQuestion: Question) => {
        if (!editingQuiz) return;
        setEditingQuiz({
            ...editingQuiz,
            questions: [...(editingQuiz.questions || []), newQuestion]
        });
        setEditingQuestion(null);
    };

    const handleDeleteQuestion = (questionId: number) => {
        if (!editingQuiz) return;
        setEditingQuiz({
            ...editingQuiz,
            questions: (editingQuiz.questions || []).filter(q => q.id !== questionId)
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingQuiz.id ? "Edit Quiz" : "Create Quiz"}
            description={editingQuiz.id ? "Modify existing quiz details and questions" : "Configure new quiz parameters"}
            maxWidth="max-w-3xl"
            icon={<Edit2 className={`w-6 h-6 ${isBento ? 'text-black' : 'text-purple-500'}`} />}
            footer={
                <div className="flex items-center justify-between gap-3 w-full">
                    <button 
                        onClick={onClose} 
                        className={`py-3 px-5 rounded-xl font-black uppercase tracking-wider text-xs transition-all cursor-pointer ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-gray-100 active:translate-x-0.5 active:translate-y-0.5'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveQuiz} 
                        className={`flex-1 max-w-xs py-3 px-6 rounded-xl font-black uppercase tracking-wider text-xs transition-all cursor-pointer ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                : 'bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 shadow-lg shadow-purple-500/20'
                        }`}
                    >
                        Save Quiz Changes
                    </button>
                </div>
            }
        >
            {/* Segmented Tab Switcher */}
            <div className={`flex gap-2 p-1.5 rounded-2xl mb-5 ${
                isBento
                    ? 'bg-[#f5f3ec] border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-gray-100 dark:bg-white/5'
            }`}>
                <button
                    type="button"
                    onClick={() => setActiveModalTab('general')}
                    className={`flex-1 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                        activeModalTab === 'general'
                            ? isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-purple-600 text-white shadow-md'
                            : isBento
                                ? 'text-gray-700 hover:text-black hover:bg-white/60'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    General Settings
                </button>
                <button
                    type="button"
                    onClick={() => setActiveModalTab('questions')}
                    className={`flex-1 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                        activeModalTab === 'questions'
                            ? isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-purple-600 text-white shadow-md'
                            : isBento
                                ? 'text-gray-700 hover:text-black hover:bg-white/60'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    Questions ({editingQuiz.questions?.length || 0})
                </button>
            </div>

            {activeModalTab === 'general' ? (
                <div className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1">
                        <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                            <Type className="w-3.5 h-3.5" />
                            <span>Quiz Title</span>
                        </label>
                        <input 
                            placeholder="e.g. Introduction to Python Syntax" 
                            value={editingQuiz.title} 
                            onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })} 
                            className={`w-full rounded-xl px-4 py-3 font-bold text-base transition-all ${
                                isBento
                                    ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none'
                                    : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                            }`} 
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                            isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                            <FileText className="w-3.5 h-3.5" />
                            <span>Description & Objectives</span>
                        </label>
                        <textarea 
                            placeholder="Provide a comprehensive summary of what this quiz covers..." 
                            value={editingQuiz.description} 
                            onChange={e => setEditingQuiz({ ...editingQuiz, description: e.target.value })} 
                            className={`w-full rounded-xl px-4 py-3 font-medium text-sm transition-all min-h-[75px] resize-y ${
                                isBento
                                    ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none'
                                    : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                            }`} 
                            rows={3}
                        />
                    </div>

                    {/* Numeric Stats Grid: Time, Passing Score, Coins, XP */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Time Limit */}
                        <div className={`p-3 rounded-xl ${
                            isBento
                                ? 'bg-[#fef9c3] border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10'
                        }`}>
                            <label className={`text-[10px] font-black uppercase tracking-wider block mb-1.5 flex items-center gap-1 ${
                                isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                                <Clock className="w-3 h-3" />
                                <span>Time (min)</span>
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                placeholder="0" 
                                value={editingQuiz.timeLimit} 
                                onChange={e => setEditingQuiz({ ...editingQuiz, timeLimit: parseInt(e.target.value) || 0 })} 
                                className={`w-full rounded-lg px-2.5 py-1.5 font-black text-center text-sm focus:outline-none ${
                                    isBento
                                        ? 'bg-white border-2 border-black text-black'
                                        : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                }`} 
                            />
                            <span className="text-[9px] font-bold text-gray-500 block text-center mt-1">0 = unlimited</span>
                        </div>

                        {/* Passing Score */}
                        <div className={`p-3 rounded-xl ${
                            isBento
                                ? 'bg-[#f0f9ff] border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10'
                        }`}>
                            <label className={`text-[10px] font-black uppercase tracking-wider block mb-1.5 flex items-center gap-1 ${
                                isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                                <Target className="w-3 h-3" />
                                <span>Pass Score %</span>
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                placeholder="70" 
                                value={editingQuiz.passingScore} 
                                onChange={e => setEditingQuiz({ ...editingQuiz, passingScore: parseInt(e.target.value) || 0 })} 
                                className={`w-full rounded-lg px-2.5 py-1.5 font-black text-center text-sm focus:outline-none ${
                                    isBento
                                        ? 'bg-white border-2 border-black text-black'
                                        : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                }`} 
                            />
                            <span className="text-[9px] font-bold text-gray-500 block text-center mt-1">Percent required</span>
                        </div>

                        {/* Coins */}
                        <div className={`p-3 rounded-xl ${
                            isBento
                                ? 'bg-[#f0fdf4] border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10'
                        }`}>
                            <label className={`text-[10px] font-black uppercase tracking-wider block mb-1.5 flex items-center gap-1 ${
                                isBento ? 'text-black' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                                <Coins className="w-3 h-3" />
                                <span>Coins</span>
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                placeholder="10" 
                                value={editingQuiz.coinsReward ?? 10} 
                                onChange={e => setEditingQuiz({ ...editingQuiz, coinsReward: parseInt(e.target.value) || 0 })} 
                                className={`w-full rounded-lg px-2.5 py-1.5 font-black text-center text-sm focus:outline-none ${
                                    isBento
                                        ? 'bg-white border-2 border-black text-black'
                                        : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                }`} 
                            />
                            <span className="text-[9px] font-bold text-gray-500 block text-center mt-1">On completion</span>
                        </div>

                        {/* XP Reward */}
                        <div className={`p-3 rounded-xl ${
                            isBento
                                ? 'bg-[#faf5ff] border-2 border-black shadow-[2px_2px_0px_#000]'
                                : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10'
                        }`}>
                            <label className={`text-[10px] font-black uppercase tracking-wider block mb-1.5 flex items-center gap-1 ${
                                isBento ? 'text-black' : 'text-indigo-600 dark:text-indigo-400'
                            }`}>
                                <Zap className="w-3 h-3" />
                                <span>XP Reward</span>
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                placeholder="50" 
                                value={editingQuiz.xpReward ?? 50} 
                                onChange={e => setEditingQuiz({ ...editingQuiz, xpReward: parseInt(e.target.value) || 0 })} 
                                className={`w-full rounded-lg px-2.5 py-1.5 font-black text-center text-sm focus:outline-none ${
                                    isBento
                                        ? 'bg-white border-2 border-black text-black'
                                        : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                }`} 
                            />
                            <span className="text-[9px] font-bold text-gray-500 block text-center mt-1">XP for ranking</span>
                        </div>
                    </div>

                    {/* Metadata Selection Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            {/* Category */}
                            <div className="space-y-1">
                                <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                    isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    <Folder className="w-3.5 h-3.5" />
                                    <span>Category</span>
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Category (e.g. Python Junior)" 
                                    value={editingQuiz.category} 
                                    onChange={e => setEditingQuiz({ ...editingQuiz, category: e.target.value })} 
                                    className={`w-full rounded-xl px-3.5 py-2.5 font-bold text-sm transition-all ${
                                        isBento
                                            ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none'
                                            : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                                    }`} 
                                />
                            </div>

                            {/* Subject / Stack */}
                            <div className="space-y-1">
                                <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                    isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>Road / Stack</span>
                                </label>
                                <select
                                    value={editingQuiz.subjectId || ''}
                                    onChange={e => setEditingQuiz({ ...editingQuiz, subjectId: e.target.value || undefined })}
                                    className={`w-full rounded-xl px-3.5 py-2.5 font-bold text-sm transition-all appearance-none cursor-pointer ${
                                        isBento
                                            ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none'
                                            : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                                    }`}
                                >
                                    <option value="">Uncategorized</option>
                                    {subjects.map(s => (
                                        <option key={s._id} value={s._id}>{s.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Difficulty */}
                            <div className="space-y-1">
                                <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                    isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    <Sliders className="w-3.5 h-3.5" />
                                    <span>Difficulty Level</span>
                                </label>
                                <select 
                                    value={editingQuiz.difficulty} 
                                    onChange={e => setEditingQuiz({ ...editingQuiz, difficulty: e.target.value })} 
                                    className={`w-full rounded-xl px-3.5 py-2.5 font-bold text-sm transition-all appearance-none cursor-pointer ${
                                        isBento
                                            ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none'
                                            : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                                    }`}
                                >
                                    {DIFFICULTY_LEVELS.map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Quiz Type */}
                            <div className="space-y-1">
                                <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                    isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    <span>🎯 Quiz Type</span>
                                </label>
                                <select 
                                    value={editingQuiz.quizType || (editingQuiz.isQuestionPool ? 'pool' : 'quiz')} 
                                    onChange={e => {
                                        const val = e.target.value as 'quiz' | 'exam' | 'pool';
                                        setEditingQuiz({ 
                                            ...editingQuiz, 
                                            quizType: val,
                                            isQuestionPool: val === 'pool',
                                            questionsPerAttempt: editingQuiz.questionsPerAttempt || 10
                                        });
                                    }} 
                                    className={`w-full rounded-xl px-3.5 py-2.5 font-bold text-sm transition-all appearance-none cursor-pointer ${
                                        isBento
                                            ? 'bg-white border-2 border-black text-black shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none'
                                            : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50'
                                    }`}
                                >
                                    <option value="quiz">Regular Quiz</option>
                                    <option value="exam">Official Exam</option>
                                    <option value="pool">Question Bank / Pool Mode</option>
                                </select>
                            </div>
                        </div>

                        {/* Icon Picker */}
                        <div className="space-y-1">
                            <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                                <Sparkles className="w-3.5 h-3.5 text-black" /> 
                                <span>Quiz Badge Icon</span>
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {QUIZ_ICON_OPTIONS.map(option => {
                                    const Icon = option.Icon;
                                    const isSelected = getQuizIconOption(editingQuiz.icon).key === option.key;

                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => setEditingQuiz({ ...editingQuiz, icon: option.key })}
                                            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 transition-all cursor-pointer ${
                                                isBento
                                                    ? isSelected
                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                                        : 'bg-white text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] hover:bg-gray-50'
                                                    : isSelected
                                                        ? 'bg-purple-500/10 border border-purple-500 text-purple-600 dark:text-purple-300 shadow-sm'
                                                        : 'bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-purple-300'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">{option.label}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Question Bank Settings */}
                    {(editingQuiz.quizType === 'pool' || editingQuiz.isQuestionPool) && (
                        <div className={`p-4 rounded-xl space-y-3 ${
                            isBento
                                ? 'bg-[#bae6fd] border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">📦</span>
                                    <span className="text-sm font-black uppercase text-black tracking-wider">Question Bank Configuration</span>
                                </div>
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white border border-black shadow-[1px_1px_0px_#000] text-black">
                                    Pool Mode Active
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-black font-black uppercase">Questions Per Attempt</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max={Math.max(1, editingQuiz.questions?.length || 100)}
                                        value={editingQuiz.questionsPerAttempt || 10} 
                                        onChange={e => setEditingQuiz({ ...editingQuiz, questionsPerAttempt: Math.max(1, parseInt(e.target.value) || 1) })} 
                                        className="w-full bg-white border-2 border-black rounded-xl px-4 py-2.5 text-black font-black focus:outline-none shadow-[2px_2px_0px_#000]" 
                                    />
                                </div>
                                <div className="flex flex-col justify-center text-xs text-black font-semibold">
                                    <span>Bank contains <strong>{editingQuiz.questions?.length || 0}</strong> total questions.</span>
                                    <span className="opacity-80">Takes ~{Math.ceil((editingQuiz.questions?.length || 1) / (editingQuiz.questionsPerAttempt || 10))} rounds to test all questions.</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Checkbox Banners */}
                    <div className="space-y-2.5 pt-1">
                        {/* Visible to Students */}
                        <div 
                            onClick={() => setEditingQuiz({ ...editingQuiz, isVisible: editingQuiz.isVisible === false ? true : false })}
                            className={`p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                                editingQuiz.isVisible !== false
                                    ? isBento ? 'bg-[#dcfce7]' : 'bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'bg-white dark:bg-black/20 opacity-70'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000] shrink-0">
                                    <Eye className="w-4 h-4 text-black" />
                                </div>
                                <div>
                                    <div className="text-xs font-black uppercase tracking-wider text-black">
                                        Visible to Students
                                    </div>
                                    <div className="text-[11px] font-bold text-gray-700">
                                        Turn this off to hide the quiz from public browsing while keeping it editable in admin tools.
                                    </div>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-lg border-2 border-black flex items-center justify-center font-black text-xs ${
                                editingQuiz.isVisible !== false ? 'bg-[#bef264] text-black' : 'bg-white text-transparent'
                            }`}>
                                ✓
                            </div>
                        </div>

                        {/* Enable Review Mode */}
                        <div 
                            onClick={() => setEditingQuiz({ ...editingQuiz, reviewMode: !editingQuiz.reviewMode })}
                            className={`p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                                editingQuiz.reviewMode
                                    ? isBento ? 'bg-[#ddd6fe]' : 'bg-purple-50 dark:bg-purple-900/20'
                                    : 'bg-white dark:bg-black/20 opacity-70'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000] shrink-0">
                                    <Sparkles className="w-4 h-4 text-black" />
                                </div>
                                <div>
                                    <div className="text-xs font-black uppercase tracking-wider text-black">
                                        Enable Review Mode
                                    </div>
                                    <div className="text-[11px] font-bold text-gray-700">
                                        Show immediate feedback and explanations after each answer.
                                    </div>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-lg border-2 border-black flex items-center justify-center font-black text-xs ${
                                editingQuiz.reviewMode ? 'bg-[#bef264] text-black' : 'bg-white text-transparent'
                            }`}>
                                ✓
                            </div>
                        </div>

                        {/* Shuffle Questions */}
                        <div 
                            onClick={() => setEditingQuiz({ ...editingQuiz, shuffleQuestions: editingQuiz.shuffleQuestions === false ? true : false })}
                            className={`p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                                editingQuiz.shuffleQuestions !== false
                                    ? isBento ? 'bg-[#fef08a]' : 'bg-orange-50 dark:bg-orange-900/20'
                                    : 'bg-white dark:bg-black/20 opacity-70'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_#000] shrink-0">
                                    <Sliders className="w-4 h-4 text-black" />
                                </div>
                                <div>
                                    <div className="text-xs font-black uppercase tracking-wider text-black">
                                        Shuffle Questions Order
                                    </div>
                                    <div className="text-[11px] font-bold text-gray-700">
                                        Randomize question sequence for each attempt. Uncheck to maintain a fixed order.
                                    </div>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-lg border-2 border-black flex items-center justify-center font-black text-xs ${
                                editingQuiz.shuffleQuestions !== false ? 'bg-[#bef264] text-black' : 'bg-white text-transparent'
                            }`}>
                                ✓
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Questions Tab Header Bar */}
                    <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl ${
                        isBento
                            ? 'bg-[#fef08a] border-2 border-black shadow-[3px_3px_0px_#000]'
                            : 'bg-gray-50 dark:bg-white/5'
                    }`}>
                        <div className="flex items-center gap-2.5">
                            <span className={`font-black text-sm uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                📝 Questions Pool
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                isBento 
                                    ? 'bg-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] text-black' 
                                    : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                            }`}>
                                {editingQuiz.questions?.length || 0} Questions
                            </span>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setEditingQuestion({ 
                                id: 0, 
                                type: 'multiple-choice', 
                                part: 'A', 
                                question: '', 
                                options: ['', '', '', ''], 
                                correctAnswer: 0, 
                                points: 10, 
                                explanation: '' 
                            })} 
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                    : 'bg-purple-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-purple-500'
                            }`}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Question</span>
                        </button>
                    </div>

                    {/* Active Question Editor (Adding a New Question) */}
                    {editingQuestion && editingQuestion.id === 0 && (
                        <QuestionEditor
                            question={editingQuestion}
                            index={editingQuiz.questions?.length || 0}
                            onChange={setEditingQuestion}
                            onSave={() => handleAddQuestion({ ...editingQuestion, id: Date.now() })}
                            onCancel={() => setEditingQuestion(null)}
                        />
                    )}

                    {/* Questions List */}
                    <div className="space-y-2.5">
                        {(editingQuiz.questions || []).map((q, i) => (
                            <React.Fragment key={q.id}>
                                {editingQuestion && editingQuestion.id === q.id ? (
                                    <QuestionEditor
                                        question={editingQuestion}
                                        index={i}
                                        onChange={setEditingQuestion}
                                        onSave={() => handleQuestionUpdate(editingQuestion)}
                                        onCancel={() => setEditingQuestion(null)}
                                    />
                                ) : (
                                    <div className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
                                        isBento
                                            ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000]'
                                            : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5'
                                    }`}>
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                                isBento
                                                    ? 'bg-[#bae6fd] border-2 border-black shadow-[1.5px_1.5px_0px_#000] text-black'
                                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300'
                                            }`}>
                                                Q{i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1 pr-2">
                                                <p className={`font-bold text-sm truncate ${isBento ? 'text-black' : 'text-gray-700 dark:text-gray-200'}`}>
                                                    {q.question || 'Untitled Question'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                        isBento
                                                            ? 'bg-[#fef08a] border border-black text-black shadow-[1px_1px_0px_#000]'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {q.isCompiler ? 'Compiler' : 'Multiple Choice'}
                                                    </span>
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                        isBento
                                                            ? 'bg-[#bef264] border border-black text-black shadow-[1px_1px_0px_#000]'
                                                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                    }`}>
                                                        {q.points || 10} pts
                                                    </span>
                                                    {q.options && !q.isCompiler && (
                                                        <span className={`text-[10px] font-bold ${isBento ? 'text-gray-600' : 'text-gray-400'}`}>
                                                            • {q.options.length} options
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button 
                                                type="button"
                                                onClick={() => {
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
                                                }} 
                                                className={`p-2 rounded-lg transition-all cursor-pointer ${
                                                    isBento
                                                        ? 'bg-[#bae6fd] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                                        : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                }`}
                                                title="Edit Question"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleDeleteQuestion(q.id)} 
                                                className={`p-2 rounded-lg transition-all cursor-pointer ${
                                                    isBento
                                                        ? 'bg-[#fca5a5] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                                        : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                }`}
                                                title="Delete Question"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default QuizEditorModal;
