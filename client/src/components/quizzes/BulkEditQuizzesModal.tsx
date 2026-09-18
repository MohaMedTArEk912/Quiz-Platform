import React, { useState } from 'react';
import { 
    Clock, 
    Layers, 
    Target, 
    Folder, 
    Eye, 
    Sliders, 
    Coins, 
    Award, 
    Check, 
    Loader2,
    Tag,
    ShieldAlert
} from 'lucide-react';
import Modal from '../common/Modal';
import { useTheme } from '../../context/ThemeContext';
import type { Quiz, Subject } from '../../types';
import { DIFFICULTY_LEVELS } from '../../constants/quizDefaults';

interface BulkEditQuizzesModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCount: number;
    subjects: Subject[];
    onApply: (updates: Partial<Quiz>) => Promise<void>;
    isLoading?: boolean;
}

const TIME_PRESETS = [5, 10, 15, 20, 30, 45, 60];
const SCORE_PRESETS = [50, 60, 70, 80, 90, 100];
const CATEGORY_PRESETS = ['General', 'JavaScript', 'TypeScript', 'Python', 'React', 'Data Structures', 'Database', 'Web Development'];

const BulkEditQuizzesModal: React.FC<BulkEditQuizzesModalProps> = ({
    isOpen,
    onClose,
    selectedCount,
    subjects,
    onApply,
    isLoading = false
}) => {
    const { isBento } = useTheme();

    // Field enablement toggles
    const [enableTime, setEnableTime] = useState(false);
    const [enableType, setEnableType] = useState(false);
    const [enableCategory, setEnableCategory] = useState(false);
    const [enableDifficulty, setEnableDifficulty] = useState(false);
    const [enablePassingScore, setEnablePassingScore] = useState(false);
    const [enableSubject, setEnableSubject] = useState(false);
    const [enableVisibility, setEnableVisibility] = useState(false);
    const [enableShuffle, setEnableShuffle] = useState(false);
    const [enableReview, setEnableReview] = useState(false);
    const [enablePoolCount, setEnablePoolCount] = useState(false);
    const [enableRewards, setEnableRewards] = useState(false);
    const [enableProctoring, setEnableProctoring] = useState(false);

    // Field values
    const [timeLimit, setTimeLimit] = useState(15);
    const [quizType, setQuizType] = useState<'quiz' | 'exam' | 'pool'>('quiz');
    const [category, setCategory] = useState('General');
    const [difficulty, setDifficulty] = useState('Intermediate');
    const [passingScore, setPassingScore] = useState(70);
    const [subjectId, setSubjectId] = useState<string>('');
    const [isVisible, setIsVisible] = useState(true);
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [reviewMode, setReviewMode] = useState(true);
    const [questionsPerAttempt, setQuestionsPerAttempt] = useState(10);
    const [coinsReward, setCoinsReward] = useState(10);
    const [xpReward, setXpReward] = useState(50);
    const [isProctored, setIsProctored] = useState(false);
    const [requireFullscreen, setRequireFullscreen] = useState(false);
    const [disableCopyPaste, setDisableCopyPaste] = useState(false);
    const [strictTabSwitchLimit, setStrictTabSwitchLimit] = useState(3);

    const hasAnyFieldSelected = 
        enableTime || 
        enableType || 
        enableCategory || 
        enableDifficulty || 
        enablePassingScore || 
        enableSubject || 
        enableVisibility || 
        enableShuffle || 
        enableReview || 
        enablePoolCount || 
        enableRewards || 
        enableProctoring;

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!hasAnyFieldSelected || isLoading) return;

        const updates: Partial<Quiz> = {};

        if (enableTime) updates.timeLimit = Number(timeLimit);
        if (enableType) {
            updates.quizType = quizType;
            updates.isQuestionPool = quizType === 'pool';
        }
        if (enableCategory) updates.category = category.trim();
        if (enableDifficulty) updates.difficulty = difficulty;
        if (enablePassingScore) updates.passingScore = Number(passingScore);
        if (enableSubject) updates.subjectId = subjectId || undefined;
        if (enableVisibility) updates.isVisible = isVisible;
        if (enableShuffle) updates.shuffleQuestions = shuffleQuestions;
        if (enableReview) updates.reviewMode = reviewMode;
        if (enablePoolCount) updates.questionsPerAttempt = Number(questionsPerAttempt);
        if (enableRewards) {
            updates.coinsReward = Number(coinsReward);
            updates.xpReward = Number(xpReward);
        }
        if (enableProctoring) {
            updates.isProctored = isProctored;
            updates.requireFullscreen = requireFullscreen;
            updates.disableCopyPaste = disableCopyPaste;
            updates.strictTabSwitchLimit = Number(strictTabSwitchLimit);
        }

        await onApply(updates);
    };

    const checkboxClass = (checked: boolean) => `w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
        checked 
            ? isBento
                ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                : 'bg-purple-600 text-white border-purple-600 shadow-sm'
            : isBento
                ? 'bg-white border-2 border-black hover:bg-gray-100 shadow-[1px_1px_0px_#000]'
                : 'bg-white dark:bg-black/20 border-gray-300 dark:border-white/10 text-transparent'
    }`;

    const cardClass = (enabled: boolean) => `p-4 rounded-2xl border transition-all ${
        enabled
            ? isBento
                ? 'bg-[#fef9c3]/50 border-2 border-black shadow-[3px_3px_0px_#000]'
                : 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 shadow-sm'
            : isBento
                ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] opacity-80 hover:opacity-100'
                : 'bg-gray-50/60 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-70 hover:opacity-100'
    }`;

    return (
        <Modal
            isOpen={isOpen}
            onClose={isLoading ? () => {} : onClose}
            title={`Bulk Edit ${selectedCount} Quizzes`}
            description="Check the fields you want to update across all selected quizzes. Unchecked fields remain unchanged."
            maxWidth="max-w-2xl"
            icon={<Sliders className={`w-6 h-6 ${isBento ? 'text-black' : 'text-purple-500'}`} />}
            footer={
                <div className="flex items-center justify-between gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-gray-100'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSubmit()}
                        disabled={!hasAnyFieldSelected || isLoading}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            isBento
                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:from-purple-500 hover:to-indigo-500'
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Updating Quizzes...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Apply to {selectedCount} Quizzes</span>
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* 1. Time Limit */}
                <div className={cardClass(enableTime)}>
                    <div className="flex items-center justify-between mb-3">
                        <label 
                            onClick={() => setEnableTime(!enableTime)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                            <div className={checkboxClass(enableTime)}>
                                {enableTime && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Time Limit (Minutes)
                                </span>
                            </div>
                        </label>
                        {enableTime && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isBento ? 'bg-[#bef264] text-black border border-black' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            }`}>
                                Enabled
                            </span>
                        )}
                    </div>

                    {enableTime && (
                        <div className="space-y-2.5 pl-7 animate-in fade-in duration-200">
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={timeLimit}
                                    onChange={(e) => setTimeLimit(Math.max(0, parseInt(e.target.value) || 0))}
                                    className={`w-28 px-3.5 py-2 rounded-xl text-sm font-black text-center focus:outline-none ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white'
                                    }`}
                                />
                                <span className={`text-xs font-bold ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                    {timeLimit === 0 ? 'No time limit (unlimited)' : `${timeLimit} minutes`}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {TIME_PRESETS.map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setTimeLimit(preset)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            timeLimit === preset
                                                ? isBento
                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'bg-purple-600 text-white shadow-sm'
                                                : isBento
                                                    ? 'bg-white text-black border border-black hover:bg-gray-100'
                                                    : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        {preset}m
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Quiz Type */}
                <div className={cardClass(enableType)}>
                    <div className="flex items-center justify-between mb-3">
                        <label 
                            onClick={() => setEnableType(!enableType)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                            <div className={checkboxClass(enableType)}>
                                {enableType && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Quiz Type
                                </span>
                            </div>
                        </label>
                        {enableType && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isBento ? 'bg-[#bae6fd] text-black border border-black' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}>
                                Enabled
                            </span>
                        )}
                    </div>

                    {enableType && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-7 animate-in fade-in duration-200">
                            {[
                                { id: 'quiz', label: 'Standard Quiz', icon: '📝', desc: 'Fixed full questions' },
                                { id: 'exam', label: 'Exam Mode', icon: '🎓', desc: 'Rigorous assessment' },
                                { id: 'pool', label: 'Question Bank', icon: '📦', desc: 'Random pooled sets' }
                            ].map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setQuizType(option.id as 'quiz' | 'exam' | 'pool')}
                                    className={`p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                                        quizType === option.id
                                            ? isBento
                                                ? 'bg-[#bae6fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-blue-500/10 border-2 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                                            : isBento
                                                ? 'bg-white text-black border border-black hover:bg-gray-50'
                                                : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span>{option.icon}</span>
                                        <span className="text-xs font-black uppercase tracking-wider">{option.label}</span>
                                    </div>
                                    <span className="text-[10px] opacity-75 font-medium">{option.desc}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Question Bank Pool Count */}
                {quizType === 'pool' && (
                    <div className={cardClass(enablePoolCount)}>
                        <div className="flex items-center justify-between mb-3">
                            <label 
                                onClick={() => setEnablePoolCount(!enablePoolCount)}
                                className="flex items-center gap-2.5 cursor-pointer select-none"
                            >
                                <div className={checkboxClass(enablePoolCount)}>
                                    {enablePoolCount && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                        Questions Per Attempt (Pool Mode)
                                    </span>
                                </div>
                            </label>
                            {enablePoolCount && (
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    isBento ? 'bg-[#c7d2fe] text-black border border-black' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                }`}>
                                    Enabled
                                </span>
                            )}
                        </div>

                        {enablePoolCount && (
                            <div className="space-y-2 pl-7 animate-in fade-in duration-200">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={questionsPerAttempt}
                                        onChange={(e) => setQuestionsPerAttempt(Math.max(1, parseInt(e.target.value) || 1))}
                                        className={`w-28 px-3.5 py-2 rounded-xl text-sm font-black text-center focus:outline-none ${
                                            isBento
                                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white'
                                        }`}
                                    />
                                    <span className={`text-xs font-bold ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                        questions randomly picked per student attempt
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {[5, 10, 15, 20, 25, 30].map(cnt => (
                                        <button
                                            key={cnt}
                                            type="button"
                                            onClick={() => setQuestionsPerAttempt(cnt)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                questionsPerAttempt === cnt
                                                    ? isBento
                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                        : 'bg-indigo-600 text-white shadow-sm'
                                                    : isBento
                                                        ? 'bg-white text-black border border-black hover:bg-gray-100'
                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                            }`}
                                        >
                                            {cnt} questions
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. Category */}
                <div className={cardClass(enableCategory)}>
                    <div className="flex items-center justify-between mb-3">
                        <label 
                            onClick={() => setEnableCategory(!enableCategory)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                            <div className={checkboxClass(enableCategory)}>
                                {enableCategory && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Category
                                </span>
                            </div>
                        </label>
                        {enableCategory && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isBento ? 'bg-[#fef08a] text-black border border-black' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            }`}>
                                Enabled
                            </span>
                        )}
                    </div>

                    {enableCategory && (
                        <div className="space-y-2.5 pl-7 animate-in fade-in duration-200">
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Enter category (e.g. JavaScript, Math, System Design)"
                                className={`w-full px-3.5 py-2 rounded-xl text-xs font-black focus:outline-none ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white'
                                }`}
                            />
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {CATEGORY_PRESETS.map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setCategory(preset)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            category === preset
                                                ? isBento
                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'bg-purple-600 text-white shadow-sm'
                                                : isBento
                                                    ? 'bg-white text-black border border-black hover:bg-gray-100'
                                                    : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Difficulty */}
                <div className={cardClass(enableDifficulty)}>
                    <div className="flex items-center justify-between mb-3">
                        <label 
                            onClick={() => setEnableDifficulty(!enableDifficulty)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                            <div className={checkboxClass(enableDifficulty)}>
                                {enableDifficulty && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Difficulty Level
                                </span>
                            </div>
                        </label>
                        {enableDifficulty && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isBento ? 'bg-[#fef08a] text-black border border-black' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                                Enabled
                            </span>
                        )}
                    </div>

                    {enableDifficulty && (
                        <div className="flex flex-wrap gap-2 pl-7 animate-in fade-in duration-200">
                            {DIFFICULTY_LEVELS.map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setDifficulty(level)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        difficulty === level
                                            ? isBento
                                                ? 'bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-amber-500 text-white shadow-md'
                                            : isBento
                                                ? 'bg-white text-black border border-black hover:bg-gray-100'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                    }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 4. Passing Score */}
                <div className={cardClass(enablePassingScore)}>
                    <div className="flex items-center justify-between mb-3">
                        <label 
                            onClick={() => setEnablePassingScore(!enablePassingScore)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                            <div className={checkboxClass(enablePassingScore)}>
                                {enablePassingScore && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Passing Score (%)
                                </span>
                            </div>
                        </label>
                        {enablePassingScore && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isBento ? 'bg-[#bef264] text-black border border-black' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}>
                                Enabled
                            </span>
                        )}
                    </div>

                    {enablePassingScore && (
                        <div className="space-y-2.5 pl-7 animate-in fade-in duration-200">
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={passingScore}
                                    onChange={(e) => setPassingScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                    className={`w-28 px-3.5 py-2 rounded-xl text-sm font-black text-center focus:outline-none ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white'
                                    }`}
                                />
                                <span className={`text-xs font-bold ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                    Minimum {passingScore}% required to pass
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {SCORE_PRESETS.map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setPassingScore(preset)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            passingScore === preset
                                                ? isBento
                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'bg-emerald-600 text-white shadow-sm'
                                                : isBento
                                                    ? 'bg-white text-black border border-black hover:bg-gray-100'
                                                    : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        {preset}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Subject / Stack Assignment */}
                <div className={cardClass(enableSubject)}>
                    <div className="flex items-center justify-between mb-3">
                        <label 
                            onClick={() => setEnableSubject(!enableSubject)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                            <div className={checkboxClass(enableSubject)}>
                                {enableSubject && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Assign to Stack / Subject
                                </span>
                            </div>
                        </label>
                        {enableSubject && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isBento ? 'bg-[#ddd6fe] text-black border border-black' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                            }`}>
                                Enabled
                            </span>
                        )}
                    </div>

                    {enableSubject && (
                        <div className="pl-7 animate-in fade-in duration-200">
                            <select
                                value={subjectId}
                                onChange={(e) => setSubjectId(e.target.value)}
                                className={`w-full px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider focus:outline-none cursor-pointer ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-white dark:bg-[#1a1b26] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white'
                                }`}
                            >
                                <option value="">None (Unassigned / General)</option>
                                {subjects.map(s => (
                                    <option key={s._id} value={s._id}>
                                        {s.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* 6. Visibility to Students */}
                <div className={cardClass(enableVisibility)}>
                    <div className="flex items-center justify-between mb-3">
                        <label 
                            onClick={() => setEnableVisibility(!enableVisibility)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                            <div className={checkboxClass(enableVisibility)}>
                                {enableVisibility && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Student Visibility
                                </span>
                            </div>
                        </label>
                        {enableVisibility && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isBento ? 'bg-[#86efac] text-black border border-black' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}>
                                Enabled
                            </span>
                        )}
                    </div>

                    {enableVisibility && (
                        <div className="grid grid-cols-2 gap-2 pl-7 animate-in fade-in duration-200">
                            <button
                                type="button"
                                onClick={() => setIsVisible(true)}
                                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    isVisible
                                        ? isBento
                                            ? 'bg-[#86efac] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-emerald-600 text-white shadow-sm'
                                        : isBento
                                            ? 'bg-white text-black border border-black hover:bg-gray-50'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                👁️ Visible
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsVisible(false)}
                                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                    !isVisible
                                        ? isBento
                                            ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-rose-600 text-white shadow-sm'
                                        : isBento
                                            ? 'bg-white text-black border border-black hover:bg-gray-50'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                🚫 Hidden
                            </button>
                        </div>
                    )}
                </div>

                {/* 7. Question Shuffling & Instant Review */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Shuffle Questions */}
                    <div className={cardClass(enableShuffle)}>
                        <div className="flex items-center justify-between mb-2">
                            <label 
                                onClick={() => setEnableShuffle(!enableShuffle)}
                                className="flex items-center gap-2.5 cursor-pointer select-none"
                            >
                                <div className={checkboxClass(enableShuffle)}>
                                    {enableShuffle && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Shuffle Questions
                                </span>
                            </label>
                        </div>
                        {enableShuffle && (
                            <div className="flex gap-2 pl-7 pt-1 animate-in fade-in duration-200">
                                <button
                                    type="button"
                                    onClick={() => setShuffleQuestions(true)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        shuffleQuestions
                                            ? isBento ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-purple-600 text-white'
                                            : isBento ? 'bg-white text-black border border-black' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    Enabled
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShuffleQuestions(false)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        !shuffleQuestions
                                            ? isBento ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-rose-600 text-white'
                                            : isBento ? 'bg-white text-black border border-black' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    Fixed
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Review Mode */}
                    <div className={cardClass(enableReview)}>
                        <div className="flex items-center justify-between mb-2">
                            <label 
                                onClick={() => setEnableReview(!enableReview)}
                                className="flex items-center gap-2.5 cursor-pointer select-none"
                            >
                                <div className={checkboxClass(enableReview)}>
                                    {enableReview && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Review Mode
                                </span>
                            </label>
                        </div>
                        {enableReview && (
                            <div className="flex gap-2 pl-7 pt-1 animate-in fade-in duration-200">
                                <button
                                    type="button"
                                    onClick={() => setReviewMode(true)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        reviewMode
                                            ? isBento ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-purple-600 text-white'
                                            : isBento ? 'bg-white text-black border border-black' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    Enabled
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReviewMode(false)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        !reviewMode
                                            ? isBento ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-rose-600 text-white'
                                            : isBento ? 'bg-white text-black border border-black' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    Disabled
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 8. Rewards */}
                <div className={cardClass(enableRewards)}>
                    <div className="flex items-center justify-between mb-3">
                        <label 
                            onClick={() => setEnableRewards(!enableRewards)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                            <div className={checkboxClass(enableRewards)}>
                                {enableRewards && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 text-amber-500" />
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Completion Rewards (Coins & XP)
                                </span>
                            </div>
                        </label>
                        {enableRewards && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isBento ? 'bg-[#fef08a] text-black border border-black' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                                Enabled
                            </span>
                        )}
                    </div>

                    {enableRewards && (
                        <div className="grid grid-cols-2 gap-3 pl-7 animate-in fade-in duration-200">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-gray-500">Coins</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={coinsReward}
                                    onChange={(e) => setCoinsReward(Math.max(0, parseInt(e.target.value) || 0))}
                                    className={`w-full px-3 py-2 rounded-xl text-xs font-black focus:outline-none ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white'
                                    }`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-gray-500">XP</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={xpReward}
                                    onChange={(e) => setXpReward(Math.max(0, parseInt(e.target.value) || 0))}
                                    className={`w-full px-3 py-2 rounded-xl text-xs font-black focus:outline-none ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white'
                                    }`}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 9. Proctoring & Security Rules */}
                <div className={cardClass(enableProctoring)}>
                    <div className="flex items-center justify-between mb-3">
                        <label 
                            onClick={() => setEnableProctoring(!enableProctoring)}
                            className="flex items-center gap-2.5 cursor-pointer select-none"
                        >
                            <div className={checkboxClass(enableProctoring)}>
                                {enableProctoring && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                                    Proctoring & Anti-Cheating
                                </span>
                            </div>
                        </label>
                        {enableProctoring && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                isBento ? 'bg-[#fecdd3] text-black border border-black' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}>
                                Enabled
                            </span>
                        )}
                    </div>

                    {enableProctoring && (
                        <div className="space-y-3 pl-7 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {/* Strict Proctoring Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setIsProctored(!isProctored)}
                                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                        isProctored
                                            ? isBento
                                                ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300'
                                            : isBento
                                                ? 'bg-white text-black border border-black hover:bg-gray-50'
                                                : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <span className="text-xs font-black uppercase">Strict Proctoring</span>
                                    <span className="text-[10px] opacity-75 mt-1 font-semibold">{isProctored ? 'Active' : 'Disabled'}</span>
                                </button>

                                {/* Fullscreen Requirement */}
                                <button
                                    type="button"
                                    onClick={() => setRequireFullscreen(!requireFullscreen)}
                                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                        requireFullscreen
                                            ? isBento
                                                ? 'bg-[#fed7aa] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300'
                                            : isBento
                                                ? 'bg-white text-black border border-black hover:bg-gray-50'
                                                : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <span className="text-xs font-black uppercase">Force Fullscreen</span>
                                    <span className="text-[10px] opacity-75 mt-1 font-semibold">{requireFullscreen ? 'Required' : 'Optional'}</span>
                                </button>

                                {/* Block Copy/Paste */}
                                <button
                                    type="button"
                                    onClick={() => setDisableCopyPaste(!disableCopyPaste)}
                                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                                        disableCopyPaste
                                            ? isBento
                                                ? 'bg-[#e9d5ff] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300'
                                            : isBento
                                                ? 'bg-white text-black border border-black hover:bg-gray-50'
                                                : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <span className="text-xs font-black uppercase">Block Copy/Paste</span>
                                    <span className="text-[10px] opacity-75 mt-1 font-semibold">{disableCopyPaste ? 'Blocked' : 'Allowed'}</span>
                                </button>
                            </div>

                            {/* Tab Switch Limit */}
                            <div className="flex items-center gap-3 pt-1">
                                <span className={`text-xs font-bold ${isBento ? 'text-black' : 'text-gray-600 dark:text-gray-300'}`}>
                                    Max Tab Switches:
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={strictTabSwitchLimit}
                                    onChange={(e) => setStrictTabSwitchLimit(Math.max(0, parseInt(e.target.value) || 0))}
                                    className={`w-20 px-3 py-1.5 rounded-lg text-xs font-black text-center focus:outline-none ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                            : 'bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white'
                                    }`}
                                />
                                <span className="text-[11px] text-gray-500">
                                    {strictTabSwitchLimit === 0 ? 'No tab switch enforcement' : `Auto-flag after ${strictTabSwitchLimit} switches`}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default BulkEditQuizzesModal;
