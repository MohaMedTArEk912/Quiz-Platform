import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Presentation,
    FileText,
    Eye,
    EyeOff,
    Check,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Search,
    Play,
    Code2,
    Printer,
    Layers,
    HelpCircle,
    BookOpenCheck,
    ListOrdered,
    Link2,
    ZoomIn,
    ZoomOut
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import type { Quiz, Question } from '../types';
import MathRenderer from '../components/common/MathRenderer';

type RevisionViewMode = 'slideshow' | 'sheet';
type AnswerVisibilityMode = 'always_visible' | 'ask_class_first';

const isOptionCorrect = (q: Question, optIdx: number, optText: string): boolean => {
    const correct = q.correctAnswer;
    if (correct === undefined || correct === null) return false;

    if (Array.isArray(correct)) {
        return correct.some(c =>
            c === optIdx ||
            String(c).trim() === optText.trim() ||
            (typeof c === 'string' && !isNaN(Number(c)) && Number(c) === optIdx)
        );
    }

    if (typeof correct === 'number') {
        return correct === optIdx;
    }

    const correctStr = String(correct).trim();
    if (optText.trim() === correctStr) {
        return true;
    }

    // Numeric index encoded as string e.g. "0", "2"
    if (/^\d+$/.test(correctStr)) {
        return Number(correctStr) === optIdx;
    }

    return false;
};

const TeacherQuizRevisionPage: React.FC = () => {
    const { quizId: encodedQuizId } = useParams<{ quizId: string }>();
    const navigate = useNavigate();
    const { availableQuizzes, loadingQuizzes } = useData();
    const { isBento } = useTheme();

    const quizId = encodedQuizId ? decodeURIComponent(encodedQuizId) : '';

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Revision Controls
    const [viewMode, setViewMode] = useState<RevisionViewMode>('slideshow');
    const [answerMode, setAnswerMode] = useState<AnswerVisibilityMode>('always_visible');
    const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
    const [revealedQuestionIds, setRevealedQuestionIds] = useState<Set<number>>(new Set());
    const [classDiscussionPicks, setClassDiscussionPicks] = useState<Record<number, number | null>>({});
    const [selectedPart, setSelectedPart] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [fontScale, setFontScale] = useState<'normal' | 'large' | 'xlarge'>('normal');
    const [showNavigator, setShowNavigator] = useState(true);

    // Resolve Quiz (from DataContext cache or fresh admin fetch including hidden quizzes)
    useEffect(() => {
        let isMounted = true;
        const loadQuiz = async () => {
            if (!quizId) {
                setError('No quiz ID specified.');
                setLoading(false);
                return;
            }

            const cached = availableQuizzes.find(q => q.id === quizId || q._id === quizId);
            if (cached) {
                if (isMounted) {
                    setQuiz(cached);
                    setLoading(false);
                }
                return;
            }

            if (loadingQuizzes) return;

            try {
                setLoading(true);
                const allAdminQuizzes: Quiz[] = await api.getQuizzes(undefined, true);
                const found = allAdminQuizzes.find((q: Quiz) => q.id === quizId || q._id === quizId);
                if (found && isMounted) {
                    setQuiz(found);
                } else if (isMounted) {
                    setError('Quiz not found.');
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load quiz for revision.');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadQuiz();
        return () => {
            isMounted = false;
        };
    }, [quizId, availableQuizzes, loadingQuizzes]);

    // Extract unique question parts (e.g. Part A, Part B, Logic...)
    const availableParts = useMemo(() => {
        if (!quiz?.questions) return [];
        const parts = new Set<string>();
        quiz.questions.forEach(q => {
            if (q.part && q.part.trim()) {
                parts.add(q.part.trim());
            }
        });
        return Array.from(parts);
    }, [quiz]);

    // Filtered questions list based on selected part & search
    const filteredQuestions = useMemo(() => {
        if (!quiz?.questions) return [];
        return quiz.questions.filter((q) => {
            if (selectedPart !== 'ALL' && (q.part || '').trim() !== selectedPart) {
                return false;
            }
            if (searchQuery.trim()) {
                const needle = searchQuery.toLowerCase();
                const inPrompt = (q.question || '').toLowerCase().includes(needle);
                const inExp = (q.explanation || '').toLowerCase().includes(needle);
                const inCode = (q.codeSnippet || '').toLowerCase().includes(needle);
                const inOpts = (q.options || []).some(o => o.toLowerCase().includes(needle));
                return inPrompt || inExp || inCode || inOpts;
            }
            return true;
        });
    }, [quiz, selectedPart, searchQuery]);

    // Ensure slide index remains within filtered bounds
    useEffect(() => {
        if (currentSlideIdx >= filteredQuestions.length) {
            setCurrentSlideIdx(Math.max(0, filteredQuestions.length - 1));
        }
    }, [filteredQuestions.length, currentSlideIdx]);

    const currentQuestion = filteredQuestions[currentSlideIdx] || null;
    const currentQuestionUid = currentQuestion ? (currentQuestion.id ?? currentSlideIdx) : -1;

    const isQuestionAnswerVisible = useCallback((qUid: number) => {
        if (answerMode === 'always_visible') return true;
        return revealedQuestionIds.has(qUid);
    }, [answerMode, revealedQuestionIds]);

    const toggleQuestionReveal = useCallback((qUid: number) => {
        setRevealedQuestionIds(prev => {
            const next = new Set(prev);
            if (next.has(qUid)) next.delete(qUid);
            else next.add(qUid);
            return next;
        });
    }, []);

    const handleToggleGlobalAnswerMode = (mode: AnswerVisibilityMode) => {
        setAnswerMode(mode);
        if (mode === 'ask_class_first') {
            setRevealedQuestionIds(new Set());
        }
    };

    const handleRevealAllSheet = () => {
        setAnswerMode('always_visible');
        if (quiz?.questions) {
            setRevealedQuestionIds(new Set(quiz.questions.map((q, idx) => q.id ?? idx)));
        }
    };

    const handleHideAllSheet = () => {
        setAnswerMode('ask_class_first');
        setRevealedQuestionIds(new Set());
    };

    // Keyboard Shortcuts for Live Classroom Presenting
    useEffect(() => {
        if (viewMode !== 'slideshow') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setCurrentSlideIdx(prev => Math.min(filteredQuestions.length - 1, prev + 1));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setCurrentSlideIdx(prev => Math.max(0, prev - 1));
            } else if (e.key === ' ' || e.key.toLowerCase() === 'r') {
                e.preventDefault();
                if (answerMode === 'ask_class_first' && currentQuestionUid !== -1) {
                    toggleQuestionReveal(currentQuestionUid);
                } else {
                    setAnswerMode(prev => prev === 'always_visible' ? 'ask_class_first' : 'always_visible');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, filteredQuestions.length, answerMode, currentQuestionUid, toggleQuestionReveal]);

    const questionPromptFontSize =
        fontScale === 'xlarge'
            ? 'text-2xl sm:text-3xl'
            : fontScale === 'large'
                ? 'text-xl sm:text-2xl'
                : 'text-lg sm:text-xl';

    const optionTextFontSize =
        fontScale === 'xlarge'
            ? 'text-lg sm:text-xl'
            : fontScale === 'large'
                ? 'text-base sm:text-lg'
                : 'text-sm sm:text-base';

    const renderQuestionBodyAndAnswer = (q: Question, qIdx: number, isRevealed: boolean) => {
        const qUid = q.id ?? qIdx;
        const qType = (q.type || 'multiple-choice').toLowerCase();
        const discussionPick = classDiscussionPicks[qUid];

        // 1. Compiler Questions
        if (q.isCompiler && q.compilerConfig) {
            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-500">
                        <Code2 className="w-4 h-4" />
                        <span>Interactive Compiler Challenge ({q.compilerConfig.language || 'javascript'})</span>
                    </div>
                    {q.compilerConfig.initialCode && (
                        <div className="space-y-1.5">
                            <div className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Starter Code
                            </div>
                            <pre className="p-4 rounded-2xl bg-[#0d1117] text-gray-200 font-mono text-xs sm:text-sm overflow-x-auto border border-gray-800">
                                <code>{q.compilerConfig.initialCode}</code>
                            </pre>
                        </div>
                    )}
                    {isRevealed ? (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                            <div className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <Check className="w-4 h-4" /> Reference Teacher Solution
                            </div>
                            <pre className="p-4 rounded-2xl bg-emerald-950/90 text-emerald-100 font-mono text-xs sm:text-sm overflow-x-auto border-2 border-emerald-500 shadow-lg">
                                <code>{q.compilerConfig.referenceCode || 'No reference code provided.'}</code>
                            </pre>
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl border-2 border-dashed border-amber-400/50 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 shrink-0" />
                            <span>Reference solution hidden for class walkthrough. Click "Reveal Answer" when ready.</span>
                        </div>
                    )}
                </div>
            );
        }

        // 2. Ordering Questions
        if (qType === 'ordering') {
            const expectedOrder = q.orderingItems?.length
                ? q.orderingItems
                : (Array.isArray(q.correctAnswer) ? q.correctAnswer.map(String) : q.options || []);
            const displayItems = isRevealed ? expectedOrder : (q.options?.length ? q.options : expectedOrder);

            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-500">
                        <ListOrdered className="w-4 h-4" />
                        <span>{isRevealed ? 'Correct Sequence Order' : 'Items to Sequence'}</span>
                    </div>
                    <div className="space-y-2.5">
                        {displayItems.map((item, i) => (
                            <div
                                key={i}
                                className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                                    isRevealed
                                        ? isBento
                                            ? 'bg-[#bbf7d0] text-black border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                                        : isBento
                                            ? 'bg-white text-black border-black'
                                            : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200'
                                }`}
                            >
                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                    isRevealed
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {isRevealed ? i + 1 : '•'}
                                </span>
                                <span className={`font-bold ${optionTextFontSize}`}>
                                    <MathRenderer text={item} inline />
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // 3. Matching Questions
        if (qType === 'matching') {
            const pairs: { left: string; right: string }[] = q.matchingPairs?.length
                ? q.matchingPairs
                : (typeof q.correctAnswer === 'object' && q.correctAnswer !== null
                    ? Object.entries(q.correctAnswer as Record<string, string>).map(([left, right]) => ({ left, right: String(right) }))
                    : []);

            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-500">
                        <Link2 className="w-4 h-4" />
                        <span>{isRevealed ? 'Correct Matched Pairs' : 'Items to Match'}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                        {pairs.map((pair, pIdx) => (
                            <div
                                key={pIdx}
                                className={`p-3.5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                                    isRevealed
                                        ? isBento
                                            ? 'bg-[#bbf7d0] text-black border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                                        : isBento
                                            ? 'bg-white text-black border-black'
                                            : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10'
                                }`}
                            >
                                <div className={`font-bold ${optionTextFontSize} flex items-center gap-2`}>
                                    <span className="px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-xs font-black">
                                        {pIdx + 1}
                                    </span>
                                    <MathRenderer text={pair.left} inline />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase text-gray-400">↔</span>
                                    {isRevealed ? (
                                        <span className={`font-black px-3 py-1 rounded-xl ${optionTextFontSize} ${
                                            isBento
                                                ? 'bg-white text-black border border-black'
                                                : 'bg-emerald-600 text-white'
                                        }`}>
                                            <MathRenderer text={pair.right} inline />
                                        </span>
                                    ) : (
                                        <span className="text-xs font-bold italic text-gray-400">
                                            [Hidden for class discussion]
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // 4. Short Answer / Text / Free-Response Code Output (No Options)
        if (!q.options || q.options.length === 0) {
            const expectedText = Array.isArray(q.correctAnswer)
                ? q.correctAnswer.join(' / ')
                : String(q.correctAnswer ?? '');

            return (
                <div className="space-y-3">
                    {isRevealed ? (
                        <div className={`p-5 rounded-2xl border-2 animate-in fade-in duration-200 ${
                            isBento
                                ? 'bg-[#bbf7d0] text-black border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                        }`}>
                            <div className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                                <Check className="w-4 h-4" /> Accepted Answer
                            </div>
                            <div className={`font-black font-mono ${optionTextFontSize}`}>
                                <MathRenderer text={expectedText || 'Manual / Open Answer'} inline />
                            </div>
                        </div>
                    ) : (
                        <div className={`p-5 rounded-2xl border-2 border-dashed ${
                            isBento
                                ? 'bg-slate-50 border-black text-gray-600'
                                : 'bg-gray-50 dark:bg-black/20 border-gray-300 dark:border-white/10 text-gray-500 dark:text-gray-400'
                        }`}>
                            <div className="flex items-center gap-2 text-xs font-bold">
                                <HelpCircle className="w-4 h-4 text-amber-500" />
                                <span>Ask students what this outputs or equals, then click "Reveal Answer".</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // 5. Multiple Choice / Code-Output with Options
        return (
            <div className="space-y-2.5">
                {q.options.map((opt, optIdx) => {
                    const correct = isOptionCorrect(q, optIdx, opt);
                    const isClassPick = discussionPick === optIdx;

                    let cardClass = isBento
                        ? 'bg-white text-black border-2 border-black hover:bg-slate-50'
                        : 'bg-gray-50 dark:bg-black/20 border-2 border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:border-indigo-400/50';

                    if (isRevealed) {
                        if (correct) {
                            cardClass = isBento
                                ? 'bg-[#bbf7d0] text-black border-2.5 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-sm';
                        } else if (isClassPick) {
                            cardClass = isBento
                                ? 'bg-[#fecdd3] text-black border-2 border-black'
                                : 'bg-red-500/15 border-red-500 text-red-900 dark:text-red-200';
                        }
                    } else if (isClassPick) {
                        cardClass = isBento
                            ? 'bg-[#ddd6fe] text-black border-2.5 border-black shadow-[3px_3px_0px_#000]'
                            : 'bg-indigo-500/15 border-indigo-500 text-indigo-950 dark:text-indigo-100';
                    }

                    return (
                        <div
                            key={optIdx}
                            onClick={() => {
                                if (!isRevealed) {
                                    setClassDiscussionPicks(prev => ({
                                        ...prev,
                                        [qUid]: prev[qUid] === optIdx ? null : optIdx
                                    }));
                                }
                            }}
                            className={`p-4 rounded-2xl flex items-center justify-between gap-3 transition-all ${!isRevealed ? 'cursor-pointer' : ''} ${cardClass}`}
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                                    isRevealed && correct
                                        ? 'bg-emerald-600 text-white'
                                        : isRevealed && isClassPick && !correct
                                            ? 'bg-red-600 text-white'
                                            : isClassPick
                                                ? 'bg-indigo-600 text-white'
                                                : isBento
                                                    ? 'bg-slate-100 text-black border border-black'
                                                    : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                </div>
                                <div className={`font-bold leading-snug break-words ${optionTextFontSize}`}>
                                    <MathRenderer text={opt} inline />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {isClassPick && (
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        isRevealed
                                            ? (correct ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')
                                            : 'bg-indigo-600 text-white'
                                    }`}>
                                        {isRevealed ? (correct ? 'Class Pick ✓' : 'Class Guess ✗') : 'Class Discussion'}
                                    </span>
                                )}
                                {isRevealed && correct && (
                                    <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Correct Answer
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090a10] text-gray-800 dark:text-white p-6">
                <div className="text-center space-y-3">
                    <Presentation className="w-12 h-12 mx-auto text-indigo-500 animate-bounce" />
                    <h2 className="text-lg font-black uppercase tracking-wider">Loading Teacher Revision Studio...</h2>
                </div>
            </div>
        );
    }

    if (error || !quiz) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090a10] p-6">
                <div className="max-w-md w-full bg-white dark:bg-[#13141f] p-8 rounded-3xl border border-gray-200 dark:border-white/10 text-center space-y-4 shadow-xl">
                    <HelpCircle className="w-12 h-12 mx-auto text-red-500" />
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{error || 'Quiz unavailable'}</h2>
                    <button
                        onClick={() => navigate('/admin')}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                        Back to Admin Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col ${
            isBento ? 'bg-[#fdfbf7] text-black' : 'bg-slate-50 dark:bg-[#0a0b10] text-gray-900 dark:text-white'
        }`}>
            {/* Top Presentation Control Header (Hidden during print) */}
            <header className={`sticky top-0 z-30 border-b print:hidden transition-colors ${
                isBento
                    ? 'bg-white border-b-3 border-black shadow-[0_3px_0px_#000]'
                    : 'bg-white/90 dark:bg-[#13141f]/90 backdrop-blur-xl border-gray-200 dark:border-white/10 shadow-sm'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Left: Back + Title */}
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => navigate('/admin')}
                            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100'
                                    : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back</span>
                        </button>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border-1.5 border-black'
                                        : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                }`}>
                                    <BookOpenCheck className="w-3 h-3" /> Teacher Revision Mode
                                </span>
                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                    {quiz.questions?.length || 0} Questions · {quiz.category}
                                </span>
                            </div>
                            <h1 className="text-base sm:text-lg font-black truncate mt-0.5">
                                {quiz.title}
                            </h1>
                        </div>
                    </div>

                    {/* Right: Teacher Presentation Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Answer Mode Switch */}
                        <div className={`flex items-center p-1 rounded-xl ${
                            isBento ? 'bg-slate-100 border-2 border-black' : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                        }`}>
                            <button
                                onClick={() => handleToggleGlobalAnswerMode('always_visible')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                                    answerMode === 'always_visible'
                                        ? isBento
                                            ? 'bg-[#bef264] text-black border border-black shadow-[1px_1px_0px_#000]'
                                            : 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                                title="Answers & explanations always visible for review"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Answers Visible</span>
                            </button>
                            <button
                                onClick={() => handleToggleGlobalAnswerMode('ask_class_first')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                                    answerMode === 'ask_class_first'
                                        ? isBento
                                            ? 'bg-[#fde047] text-black border border-black shadow-[1px_1px_0px_#000]'
                                            : 'bg-amber-500 text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                                title="Hide answers initially to let students answer before revealing"
                            >
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Ask Class First</span>
                            </button>
                        </div>

                        {/* Layout Switcher */}
                        <div className={`flex items-center p-1 rounded-xl ${
                            isBento ? 'bg-slate-100 border-2 border-black' : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                        }`}>
                            <button
                                onClick={() => setViewMode('slideshow')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                                    viewMode === 'slideshow'
                                        ? isBento
                                            ? 'bg-[#67e8f9] text-black border border-black shadow-[1px_1px_0px_#000]'
                                            : 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400'
                                }`}
                            >
                                <Presentation className="w-3.5 h-3.5" />
                                <span>Slideshow</span>
                            </button>
                            <button
                                onClick={() => setViewMode('sheet')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                                    viewMode === 'sheet'
                                        ? isBento
                                            ? 'bg-[#67e8f9] text-black border border-black shadow-[1px_1px_0px_#000]'
                                            : 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Full Sheet</span>
                            </button>
                        </div>

                        {/* Projector Font Size Stepper */}
                        <div className={`hidden sm:flex items-center gap-1 p-1 rounded-xl ${
                            isBento ? 'bg-slate-100 border-2 border-black' : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                        }`}>
                            <button
                                onClick={() => setFontScale(prev => prev === 'xlarge' ? 'large' : 'normal')}
                                disabled={fontScale === 'normal'}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                title="Decrease Text Size"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-black px-1 uppercase">
                                {fontScale === 'normal' ? 'A' : fontScale === 'large' ? 'A+' : 'A++'}
                            </span>
                            <button
                                onClick={() => setFontScale(prev => prev === 'normal' ? 'large' : 'xlarge')}
                                disabled={fontScale === 'xlarge'}
                                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                title="Increase Text Size (for classroom projector)"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Secondary action: Test in Student View */}
                        <button
                            onClick={() => navigate(`/quiz/${encodeURIComponent(quiz.id || quiz._id || '')}`)}
                            className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                                isBento
                                    ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#c4b5fd]'
                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
                            }`}
                            title="Launch interactive student attempt preview"
                        >
                            <Play className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Student View</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Studio Workspace */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Filter Bar: Part Selector & Search (when in sheet or multiple parts exist) */}
                {(availableParts.length > 0 || viewMode === 'sheet') && (
                    <div className={`p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden ${
                        isBento
                            ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                            : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm'
                    }`}>
                        {availableParts.length > 0 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1 shrink-0">
                                    <Layers className="w-3.5 h-3.5" /> Part:
                                </span>
                                <button
                                    onClick={() => { setSelectedPart('ALL'); setCurrentSlideIdx(0); }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase cursor-pointer whitespace-nowrap ${
                                        selectedPart === 'ALL'
                                            ? isBento ? 'bg-[#fde047] text-black border border-black' : 'bg-indigo-600 text-white'
                                            : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    All ({quiz.questions.length})
                                </button>
                                {availableParts.map(part => (
                                    <button
                                        key={part}
                                        onClick={() => { setSelectedPart(part); setCurrentSlideIdx(0); }}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase cursor-pointer whitespace-nowrap ${
                                            selectedPart === part
                                                ? isBento ? 'bg-[#fde047] text-black border border-black' : 'bg-indigo-600 text-white'
                                                : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        {part}
                                    </button>
                                ))}
                            </div>
                        )}

                        {viewMode === 'sheet' && (
                            <div className="flex items-center gap-2 flex-1 sm:justify-end">
                                <div className="relative flex-1 sm:max-w-xs">
                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search questions or explanations..."
                                        className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold outline-none ${
                                            isBento
                                                ? 'bg-slate-50 border-2 border-black text-black'
                                                : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white'
                                        }`}
                                    />
                                </div>
                                <button
                                    onClick={() => window.print()}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100'
                                            : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
                                    }`}
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print Key</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* SLIDESHOW / PRESENTATION MODE */}
                {viewMode === 'slideshow' && currentQuestion && (
                    <div className="space-y-5">
                        {/* Quick Slide Navigator Toggle */}
                        <div className="flex items-center justify-between text-xs print:hidden">
                            <span className="font-bold text-gray-500 dark:text-gray-400">
                                Use keyboard arrows <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">→</kbd> to step, and <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">Space</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 font-mono text-[10px]">R</kbd> to toggle answer reveal.
                            </span>
                            <button
                                onClick={() => setShowNavigator(p => !p)}
                                className="text-indigo-600 dark:text-indigo-400 font-black uppercase text-[11px] tracking-wider cursor-pointer hover:underline"
                            >
                                {showNavigator ? 'Hide Question Grid' : 'Show Question Grid'}
                            </button>
                        </div>

                        {/* Jump Number Palette */}
                        {showNavigator && (
                            <div className={`p-3.5 rounded-2xl flex flex-wrap gap-1.5 print:hidden ${
                                isBento
                                    ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                    : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10'
                            }`}>
                                {filteredQuestions.map((qItem, idx) => {
                                    const uid = qItem.id ?? idx;
                                    const isActive = idx === currentSlideIdx;
                                    const isRev = isQuestionAnswerVisible(uid);
                                    return (
                                        <button
                                            key={uid}
                                            onClick={() => setCurrentSlideIdx(idx)}
                                            className={`w-8 h-8 rounded-lg font-black text-xs transition-all cursor-pointer ${
                                                isActive
                                                    ? isBento
                                                        ? 'bg-black text-white border-2 border-black scale-110 shadow-[2px_2px_0px_#fde047]'
                                                        : 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-[#13141f]'
                                                    : isRev && answerMode === 'ask_class_first'
                                                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                                                        : isBento
                                                            ? 'bg-slate-100 text-black border border-black hover:bg-[#fde047]'
                                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Active Presentation Slide Card */}
                        {(() => {
                            const isRevealed = isQuestionAnswerVisible(currentQuestionUid);
                            return (
                                <div className={`rounded-[2rem] p-6 sm:p-10 space-y-6 transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                                        : 'bg-white dark:bg-[#13141f] border border-indigo-500/20 shadow-xl'
                                }`}>
                                    {/* Slide Top Metadata & Controls */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-white/5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                                isBento
                                                    ? 'bg-[#fde047] text-black border-2 border-black'
                                                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                                Question {currentSlideIdx + 1} of {filteredQuestions.length}
                                            </span>
                                            {currentQuestion.part && (
                                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                                                    Part {currentQuestion.part}
                                                </span>
                                            )}
                                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                {currentQuestion.points || 10} Pts
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                {(currentQuestion.isCompiler ? 'Compiler' : currentQuestion.type || 'Multiple Choice').replace('-', ' ')}
                                            </span>
                                        </div>

                                        {/* Reveal / Hide Toggle for Current Question */}
                                        <button
                                            onClick={() => {
                                                if (answerMode === 'always_visible') {
                                                    setAnswerMode('ask_class_first');
                                                    setRevealedQuestionIds(new Set());
                                                } else {
                                                    toggleQuestionReveal(currentQuestionUid);
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                                                isRevealed
                                                    ? isBento
                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                                    : isBento
                                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#facc15]'
                                                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                                            }`}
                                        >
                                            {isRevealed ? (
                                                <>
                                                    <EyeOff className="w-4 h-4" />
                                                    <span>Hide Answer</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="w-4 h-4" />
                                                    <span>Reveal Answer & Explanation</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Question Prompt */}
                                    <div className={`font-black leading-relaxed text-gray-900 dark:text-white ${questionPromptFontSize}`}>
                                        <MathRenderer text={currentQuestion.question} />
                                    </div>

                                    {/* Code Snippet if present */}
                                    {currentQuestion.codeSnippet && (
                                        <pre className="p-4 sm:p-5 rounded-2xl bg-[#0d1117] text-sky-200 font-mono text-xs sm:text-sm overflow-x-auto border-2 border-gray-800 shadow-inner">
                                            <code>{currentQuestion.codeSnippet}</code>
                                        </pre>
                                    )}

                                    {/* Visual Image if present */}
                                    {currentQuestion.imageUrl && (
                                        <div className="rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-white/10 max-h-80 inline-block">
                                            <img
                                                src={currentQuestion.imageUrl}
                                                alt="Question visual"
                                                className="max-h-80 object-contain"
                                            />
                                        </div>
                                    )}

                                    {/* Options / Specialized Body */}
                                    <div>
                                        {renderQuestionBodyAndAnswer(currentQuestion, currentSlideIdx, isRevealed)}
                                    </div>

                                    {/* Instructor Explanation & Key Takeaway */}
                                    {isRevealed && (
                                        <div className={`p-5 sm:p-6 rounded-2xl border-2 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                                            isBento
                                                ? 'bg-[#e0e7ff] text-black border-black shadow-[3px_3px_0px_#000]'
                                                : 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/25'
                                        }`}>
                                            <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-wider ${
                                                isBento ? 'text-black' : 'text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                                <Sparkles className="w-4 h-4" />
                                                <span>Teacher Explanation & Key Takeaway</span>
                                            </div>
                                            <div className={`font-semibold leading-relaxed ${
                                                isBento ? 'text-gray-900' : 'text-gray-700 dark:text-gray-200'
                                            } ${optionTextFontSize}`}>
                                                {currentQuestion.explanation ? (
                                                    <MathRenderer text={currentQuestion.explanation} />
                                                ) : (
                                                    <span className="italic opacity-70">No written explanation attached to this question.</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Bottom Previous / Next Bar */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                        <button
                                            onClick={() => setCurrentSlideIdx(prev => Math.max(0, prev - 1))}
                                            disabled={currentSlideIdx === 0}
                                            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white'
                                            }`}
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Previous Question
                                        </button>

                                        <div className="text-xs font-black text-gray-400 hidden sm:block">
                                            Slide {currentSlideIdx + 1} / {filteredQuestions.length}
                                        </div>

                                        <button
                                            onClick={() => setCurrentSlideIdx(prev => Math.min(filteredQuestions.length - 1, prev + 1))}
                                            disabled={currentSlideIdx === filteredQuestions.length - 1}
                                            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                                isBento
                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-[#a3e635] active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                                            }`}
                                        >
                                            Next Question <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* FULL SHEET / ANSWER KEY MODE */}
                {viewMode === 'sheet' && (
                    <div className="space-y-5">
                        {/* Sheet Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                            <div className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Showing {filteredQuestions.length} of {quiz.questions.length} Questions
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRevealAllSheet}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-emerald-600 text-white'
                                    }`}
                                >
                                    <Eye className="w-3.5 h-3.5" /> Show All Answers
                                </button>
                                <button
                                    onClick={handleHideAllSheet}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200'
                                    }`}
                                >
                                    <EyeOff className="w-3.5 h-3.5" /> Hide All Answers
                                </button>
                            </div>
                        </div>

                        {/* Printable Sheet Title */}
                        <div className="hidden print:block pb-4 border-b-2 border-black mb-6">
                            <h1 className="text-2xl font-black">{quiz.title} — Teacher Revision & Answer Key</h1>
                            <p className="text-sm text-gray-600">{quiz.category} · {quiz.questions.length} Questions</p>
                        </div>

                        <div className="space-y-6">
                            {filteredQuestions.map((qItem, idx) => {
                                const qUid = qItem.id ?? idx;
                                const isRev = isQuestionAnswerVisible(qUid);
                                return (
                                    <div
                                        key={qUid}
                                        className={`p-6 rounded-3xl space-y-4 break-inside-avoid ${
                                            isBento
                                                ? 'bg-white text-black border-2.5 border-black shadow-[4px_4px_0px_#000]'
                                                : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                                    Q{idx + 1}
                                                </span>
                                                {qItem.part && (
                                                    <span className="text-[11px] font-bold uppercase text-gray-400">
                                                        Part {qItem.part}
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-bold text-amber-500">
                                                    {qItem.points || 10} pts
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => toggleQuestionReveal(qUid)}
                                                className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer print:hidden"
                                            >
                                                {isRev ? 'Hide Answer' : 'Reveal Answer'}
                                            </button>
                                        </div>

                                        <div className={`font-black leading-snug text-gray-900 dark:text-white ${questionPromptFontSize}`}>
                                            <MathRenderer text={qItem.question} />
                                        </div>

                                        {qItem.codeSnippet && (
                                            <pre className="p-4 rounded-xl bg-[#0d1117] text-sky-200 font-mono text-xs overflow-x-auto border border-gray-800">
                                                <code>{qItem.codeSnippet}</code>
                                            </pre>
                                        )}

                                        {qItem.imageUrl && (
                                            <img src={qItem.imageUrl} alt="Visual" className="max-h-60 rounded-xl border border-gray-200 dark:border-white/10" />
                                        )}

                                        {renderQuestionBodyAndAnswer(qItem, idx, isRev)}

                                        {isRev && qItem.explanation && (
                                            <div className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold ${
                                                isBento
                                                    ? 'bg-[#e0e7ff] text-black border border-black'
                                                    : 'bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 border border-indigo-500/20'
                                            }`}>
                                                <span className="font-black uppercase text-[10px] tracking-wider block mb-1 text-indigo-600 dark:text-indigo-400">
                                                    Explanation:
                                                </span>
                                                <MathRenderer text={qItem.explanation} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TeacherQuizRevisionPage;
