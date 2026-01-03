import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Quiz, UserData, QuizResult, DetailedAnswer, AttemptAnswers } from '../types/index.ts';
import { Clock, Zap, Target, Sparkles } from 'lucide-react';
import Navbar from './Navbar.tsx';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { registerBlocklyBlocks } from '../utils/blocklyRegistry';

// Lazy load heavy question components
const BlockQuestion = React.lazy(() => import('./question-types/BlockQuestion.tsx'));
const CompilerQuestion = React.lazy(() => import('./question-types/CompilerQuestion.tsx'));
const Loader = React.lazy(() => import('./PageLoader.tsx'));

interface QuizTakingProps {
    quiz: Quiz;
    user: UserData;
    onComplete: (result: QuizResult) => void;
    onBack: () => void;
    onProgress?: (score: number, currentQuestionIndex: number) => void;
    powerUps?: { type: string; quantity: number }[];
    onPowerUpUsed?: (type: string) => void;
    hidePowerUps?: boolean;
}

type SavedQuizState = {
    quizId: string;
    currentQuestion: number;
    answers: Record<number, string | number>;
    timeLeft: number;
    lastUpdated: number;
};

const QuizTaking: React.FC<QuizTakingProps> = ({ quiz, user, onComplete, onBack, onProgress, powerUps, onPowerUpUsed, hidePowerUps }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | number>>({});
    const [answerCodes, setAnswerCodes] = useState<Record<number, string>>({}); // Store generated code for block questions
    const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
    const startTimeRef = useRef(0);
    const [fiftyUsed, setFiftyUsed] = useState(false);
    const [eliminatedOptions, setEliminatedOptions] = useState<Set<number>>(new Set());
    const [timeFreezeUsed, setTimeFreezeUsed] = useState(false);
    const [hintUsed, setHintUsed] = useState(false);
    const [hintMessage, setHintMessage] = useState<string | null>(null);
    const [blockHintUsed, setBlockHintUsed] = useState(false);
    const [blockHintMessage, setBlockHintMessage] = useState<string | null>(null);
    const [codeSnippetUsed, setCodeSnippetUsed] = useState(false);
    const [codeSnippetMessage, setCodeSnippetMessage] = useState<string | null>(null);
    const [debugHelperUsed, setDebugHelperUsed] = useState(false);
    const [debugHelperMessage, setDebugHelperMessage] = useState<string | null>(null);
    const [usedPowerUps, setUsedPowerUps] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const quizIdentifier = quiz.id || quiz._id || quiz.title;
    const storageKey = `quiz_progress_${user.userId}_${quizIdentifier}`;

    const initialSavedState = useMemo(() => {
        const saved = sessionStorage.getItem(storageKey);
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            if (parsed.quizId === quizIdentifier && parsed.timeLeft > 0) {
                return parsed as SavedQuizState;
            }
        } catch (e) {
            console.error("Failed to parse saved state", e);
        }
        return null;
    }, [quizIdentifier, storageKey]);

    // Resume State
    const [showResumePrompt, setShowResumePrompt] = useState(Boolean(initialSavedState));
    const [savedState, setSavedState] = useState<SavedQuizState | null>(initialSavedState);

    useEffect(() => {
        startTimeRef.current = Date.now();
    }, [quizIdentifier]);

    // Save state on change
    useEffect(() => {
        if (showResumePrompt || isSubmitting) return; // Don't save while prompting or submitting

        const state = {
            quizId: quizIdentifier,
            currentQuestion,
            answers,
            timeLeft,
            lastUpdated: Date.now()
        };
        sessionStorage.setItem(storageKey, JSON.stringify(state));
    }, [currentQuestion, answers, timeLeft, quizIdentifier, storageKey, showResumePrompt, isSubmitting]);

    const handleResume = () => {
        if (savedState) {
            setCurrentQuestion(savedState.currentQuestion);
            setAnswers(savedState.answers);
            setTimeLeft(savedState.timeLeft);
        }
        resetQuestionState();
        setShowResumePrompt(false);
    };

    const handleStartNew = () => {
        sessionStorage.removeItem(storageKey);
        setSavedState(null);
        setShowResumePrompt(false);
        resetQuestionState();
    };

    const availablePowerUps = powerUps || user.powerUps || [];
    const countPowerUp = (type: string) => availablePowerUps.find(p => p.type === type)?.quantity || 0;

    const resetQuestionState = () => {
        setFiftyUsed(false);
        setEliminatedOptions(new Set());
        setHintUsed(false);
        setHintMessage(null);
        setBlockHintUsed(false);
        setBlockHintMessage(null);
        setCodeSnippetUsed(false);
        setCodeSnippetMessage(null);
        setDebugHelperUsed(false);
        setDebugHelperMessage(null);
    };

    const handleAnswer = (answer: string | number, code?: string) => {
        if (isSubmitting) return;
        const newAnswers = {
            ...answers,
            [currentQuestion]: answer
        };
        setAnswers(newAnswers);

        // Store generated code for block questions
        if (code !== undefined) {
            setAnswerCodes(prev => ({
                ...prev,
                [currentQuestion]: code
            }));
        }

        // Calculate provisional score for progress tracking
        if (onProgress) {
            let currentScore = 0;
            quiz.questions.forEach((q, idx) => {
                if (newAnswers[idx] !== undefined && q.type !== 'text') {
                    if (newAnswers[idx] === q.correctAnswer) {
                        currentScore += q.points;
                    }
                }
            });
            onProgress(currentScore, Object.keys(newAnswers).length);
        }
    };

    const useFiftyFifty = () => {
        if (isSubmitting) return;
        const q = quiz.questions[currentQuestion];
        if (fiftyUsed || (q.type === 'text') || countPowerUp('5050') <= 0) return;
        const incorrect = q.options?.map((_, idx) => idx).filter(idx => idx !== q.correctAnswer) || [];
        if (incorrect.length <= 1) return;
        const shuffled = [...incorrect].sort(() => Math.random() - 0.5);
        setEliminatedOptions(new Set(shuffled.slice(0, 2)));
        setFiftyUsed(true);
        setUsedPowerUps(prev => [...prev, '5050']);
        onPowerUpUsed?.('5050');
    };

    const useTimeFreeze = () => {
        if (isSubmitting) return;
        if (timeFreezeUsed || countPowerUp('time_freeze') <= 0) return;
        setTimeLeft(prev => prev + 20);
        setTimeFreezeUsed(true);
        setUsedPowerUps(prev => [...prev, 'time_freeze']);
        onPowerUpUsed?.('time_freeze');
    };

    const useHint = () => {
        if (isSubmitting) return;
        const q = quiz.questions[currentQuestion];
        if (hintUsed || countPowerUp('hint') <= 0) return;

        // Works for multiple choice questions
        if (!q.isBlock && !q.isCompiler && q.type !== 'text' && q.options) {
            const correctIndex = q.correctAnswer;
            if (correctIndex === undefined || correctIndex === null) return;
            const correctLetter = String.fromCharCode(65 + correctIndex);
            setHintMessage(`💡 Smart Hint: The answer is likely Option ${correctLetter}`);
        }
        // For block/compiler questions, show general hint
        else if (q.isBlock || q.isCompiler) {
            setHintMessage(`💡 Smart Hint: Think about the logical flow and what each step should accomplish`);
        }

        setHintUsed(true);
        setUsedPowerUps(prev => [...prev, 'hint']);
        onPowerUpUsed?.('hint');
    };

    const useBlockHint = () => {
        if (isSubmitting) return;
        const q = quiz.questions[currentQuestion];
        if (blockHintUsed || countPowerUp('block_hint') <= 0) return;
        if (!q.isBlock) return; // Only for block questions

        // Analyze reference XML to determine block categories
        if (q.blockConfig?.referenceXml) {
            const categories = [];
            if (q.blockConfig.referenceXml.includes('event_')) categories.push('Events');
            if (q.blockConfig.referenceXml.includes('motion_')) categories.push('Motion');
            if (q.blockConfig.referenceXml.includes('looks_')) categories.push('Looks');

            const hint = categories.length > 0
                ? `🎯 Block Hint: You'll need blocks from: ${categories.join(', ')}`
                : `🎯 Block Hint: Start with an event block to trigger your code`;

            setBlockHintMessage(hint);
        }

        setBlockHintUsed(true);
        setUsedPowerUps(prev => [...prev, 'block_hint']);
        onPowerUpUsed?.('block_hint');
    };

    const useCodeSnippet = () => {
        if (isSubmitting) return;
        const q = quiz.questions[currentQuestion];
        if (codeSnippetUsed || countPowerUp('code_snippet') <= 0) return;
        if (!q.isBlock && !q.isCompiler) return;

        let snippet = '';
        if (q.isBlock) {
            snippet = `📝 Code Structure:
1. Start with an event trigger
2. Add your action blocks
3. Connect them in sequence`;
        } else if (q.isCompiler) {
            const lang = q.compilerConfig?.language || 'javascript';
            if (lang === 'javascript') {
                snippet = `📝 Example Structure:
function solution() {
  // Your code here
  return result;
}`;
            } else if (lang === 'python') {
                snippet = `📝 Example Structure:
def solution():
    # Your code here
    return result`;
            }
        }

        setCodeSnippetMessage(snippet);
        setCodeSnippetUsed(true);
        setUsedPowerUps(prev => [...prev, 'code_snippet']);
        onPowerUpUsed?.('code_snippet');
    };

    const useDebugHelper = () => {
        if (isSubmitting) return;
        const q = quiz.questions[currentQuestion];
        if (debugHelperUsed || countPowerUp('debug_helper') <= 0) return;
        if (!q.isBlock && !q.isCompiler) return;

        const tips = [];
        if (q.isBlock) {
            tips.push('✓ Make sure blocks are connected properly');
            tips.push('✓ Check that values in number fields are correct');
            tips.push('✓ Verify the order of your blocks');
        } else if (q.isCompiler) {
            tips.push('✓ Check for syntax errors');
            tips.push('✓ Verify variable names');
            tips.push('✓ Make sure you return the correct value');
        }

        setDebugHelperMessage(`🐛 Debug Tips:\n${tips.join('\n')}`);
        setDebugHelperUsed(true);
        setUsedPowerUps(prev => [...prev, 'debug_helper']);
        onPowerUpUsed?.('debug_helper');
    };

    const handleQuizComplete = useCallback(() => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // Clear saved progress
        sessionStorage.removeItem(storageKey);

        const startTime = startTimeRef.current || Date.now();
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);

        // Ensure Blockly blocks are registered for grading
        try {
            registerBlocklyBlocks();
        } catch (e) {
            console.error("Error registering blocks for grading:", e);
        }

        // Calculate score and correct answers
        let score = 0;
        let correctAnswers = 0;
        const detailedAnswers: AttemptAnswers = {};

        quiz.questions.forEach((question, index) => {
            const selectedAnswer = answers[index];
            const isText = question.type === 'text';
            const isBlock = question.isBlock;
            const isCompiler = question.isCompiler;
            let isCorrect = false;

            if (isCompiler) {
                // Compare with reference code if available
                if (question.compilerConfig?.referenceCode && selectedAnswer) {
                    const normalizeCode = (str: string) => {
                        return str
                            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove JS block comments
                            .replace(/\/\/.*/g, '')           // Remove JS line comments
                            .replace(/#.*/g, '')              // Remove Python line comments
                            .replace(/\s+/g, '')              // Remove whitespace
                            .replace(/;/g, '')                // Remove semicolons
                            .replace(/'/g, '"')               // Normalize quotes
                            .trim();
                    };
                    const userCode = normalizeCode(String(selectedAnswer));
                    const refCode = normalizeCode(question.compilerConfig.referenceCode);

                    isCorrect = userCode === refCode;

                    if (!isCorrect) {
                        console.log(`Compiler Grading Mismatch:\nUser: ${userCode}\nRef:  ${refCode}`);
                    }
                } else {
                    isCorrect = false;
                }

                if (isCorrect) {
                    score += question.points;
                    correctAnswers++;
                }
            } else if (isBlock) {
                // Block-based grading using GENERATED CODE comparison
                if (question.blockConfig?.referenceXml && selectedAnswer) {
                    try {
                        // Generate code from reference XML
                        const headless = new Blockly.Workspace();
                        const xmlDom = Blockly.utils.xml.textToDom(question.blockConfig.referenceXml);
                        Blockly.Xml.domToWorkspace(xmlDom, headless);
                        const refCode = javascriptGenerator.workspaceToCode(headless);
                        headless.dispose();

                        // Get user's generated code
                        const userCode = answerCodes[index];

                        // Normalization helper
                        const normalizeCode = (str: string) => {
                            return str
                                .replace(/\/\*[\s\S]*?\*\//g, '')
                                .replace(/\/\/.*/g, '')
                                .replace(/#.*/g, '')
                                .replace(/\s+/g, '')
                                .replace(/;/g, '')
                                .replace(/'/g, '"')
                                .trim();
                        };

                        // Compare generated code (logic-based, not structure-based)
                        if (userCode && refCode) {
                            const normUser = normalizeCode(userCode);
                            const normRef = normalizeCode(refCode);
                            isCorrect = normUser === normRef;

                            if (!isCorrect) {
                                console.log(`Block Grading Mismatch:\nUser: ${normUser}\nRef:  ${normRef}`);
                            }
                        } else {
                            // Fallback: if code generation failed, mark as incorrect
                            isCorrect = false;
                        }

                        if (isCorrect) {
                            score += question.points;
                            correctAnswers++;
                        }
                    } catch (e) {
                        console.error("Block grading error:", e);
                        isCorrect = false;
                    }
                }
            } else if (isText) {
                // For text questions, manual review required
                isCorrect = false;
            } else {
                // Multiple choice questions
                isCorrect = selectedAnswer === question.correctAnswer;
                if (isCorrect) {
                    score += question.points;
                    correctAnswers++;
                }
            }

            const answerDetail: DetailedAnswer = {
                selected: selectedAnswer,
                isCorrect,
                type: question.type || 'multiple-choice'
            };
            detailedAnswers[index] = answerDetail;
        });

        const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
        const percentage = Math.round((score / totalPoints) * 100);

        onComplete({
            score: correctAnswers,
            totalQuestions: quiz.questions.length,
            percentage,
            timeTaken,
            answers: detailedAnswers,
            passed: percentage >= quiz.passingScore,
            reviewStatus: quiz.questions.some(q => q.type === 'text') ? 'pending' : 'completed',
            powerUpsUsed: usedPowerUps
        });
    }, [answers, answerCodes, onComplete, quiz, storageKey, usedPowerUps, isSubmitting]);

    useEffect(() => {
        if (showResumePrompt || isSubmitting) return; // Pause timer while prompting or submitting

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleQuizComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [handleQuizComplete, showResumePrompt, isSubmitting]);

    const nextQuestion = () => {
        if (isSubmitting) return;
        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            resetQuestionState();
        } else {
            handleQuizComplete();
        }
    };

    const previousQuestion = () => {
        if (isSubmitting) return;
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
            resetQuestionState();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const q = quiz.questions && quiz.questions.length > 0 ? quiz.questions[currentQuestion] : null;
    const progress = quiz.questions ? ((currentQuestion + 1) / quiz.questions.length) * 100 : 0;
    const selectedAnswer = answers[currentQuestion];
    const answeredCount = Object.keys(answers).length;
    const isTextQuestion = q ? q.type === 'text' : false;

    // Keyboard Shortcuts
    useEffect(() => {
        if (showResumePrompt || isSubmitting) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Number keys 1-4 for options
            if (['1', '2', '3', '4'].includes(e.key)) {
                if (isTextQuestion) return;
                const index = parseInt(e.key) - 1;
                // Check if option exists and not eliminated
                if (quiz.questions[currentQuestion].options && index < (quiz.questions[currentQuestion].options?.length || 0)) {
                    if (!eliminatedOptions.has(index)) {
                        handleAnswer(index);
                    }
                }
            }

            // Enter for Next / Submit
            if (e.key === 'Enter') {
                if (selectedAnswer !== undefined) {
                    if (currentQuestion < quiz.questions.length - 1) {
                        nextQuestion();
                    } else {
                        handleQuizComplete();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQuestion, answers, showResumePrompt, isSubmitting, quiz.questions, selectedAnswer, eliminatedOptions]);

    if (!quiz.questions || quiz.questions.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
                <Navbar
                    user={user}
                    onBack={onBack}
                    showBack={true}
                    title={quiz.title}
                    onViewProfile={() => { }}
                    onViewLeaderboard={() => { }}
                    onLogout={() => { }}
                    showActions={false}
                />
                <div className="max-w-3xl mx-auto p-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 text-center">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Quiz Unavailable</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            This quiz has no questions yet. Please try another quiz.
                        </p>
                        <button
                            onClick={onBack}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Back to Quizzes
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!q) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
            <Navbar
                user={user}
                onBack={onBack}
                showBack={true}
                title={quiz.title}
                onViewProfile={() => { }}
                onViewLeaderboard={() => { }}
                onLogout={() => { }}
                showActions={false}
            />
            <div className="w-full px-4 md:px-8 py-6">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 md:p-6 mb-4 md:mb-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
                                <p className="text-gray-600 dark:text-gray-400 text-sm hidden md:block">
                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs mr-2">Pro Tip</span>
                                    Use <kbd className="font-mono bg-gray-200 dark:bg-gray-600 px-1 rounded">1</kbd>-<kbd className="font-mono bg-gray-200 dark:bg-gray-600 px-1 rounded">4</kbd> to answer, <kbd className="font-mono bg-gray-200 dark:bg-gray-600 px-1 rounded">Enter</kbd> for next
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className={`text-center transition-colors duration-300 ${timeLeft < 60 ? 'animate-pulse' : ''}`}>
                                <div className={`flex items-center gap-2 text-lg font-bold ${timeLeft < 60
                                    ? 'text-red-600 dark:text-red-400 scale-110'
                                    : 'text-purple-600 dark:text-purple-400'
                                    } transition-all duration-300`}>
                                    <Clock className={`w-5 h-5 ${timeLeft < 60 ? 'animate-bounce' : ''}`} />
                                    {formatTime(timeLeft)}
                                </div>
                                <div className={`text-xs ${timeLeft < 60 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {timeLeft < 60 ? 'Hurry up!' : 'Time Left'}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{answeredCount}/{quiz.questions.length}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Answered</div>
                            </div>
                        </div>
                    </div>

                    <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${timeLeft < 60 ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Question {currentQuestion + 1} of {quiz.questions.length}
                    </div>
                </div>

                {/* Main Content Grid with Sidebar */}
                <div className={`grid grid-cols-1 ${!hidePowerUps ? 'lg:grid-cols-[200px_1fr]' : ''} gap-4`}>
                    {/* Power-Ups Sidebar */}
                    {!hidePowerUps && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                Power-Ups
                            </h3>

                            {/* 50/50 Power-Up */}
                            <button
                                onClick={useFiftyFifty}
                                disabled={fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion}
                                className={`group relative w-full p-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                    ? 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                    : 'border-blue-400 dark:border-blue-500/50 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/40 dark:to-cyan-900/40 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 cursor-pointer'
                                    }`}
                            >
                                {/* Animated background */}
                                {!fiftyUsed && countPowerUp('5050') > 0 && !isTextQuestion && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                )}

                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 mx-auto transition-all ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                        ? 'bg-gray-300 dark:bg-slate-700'
                                        : 'bg-gradient-to-br from-blue-500 to-cyan-500 group-hover:scale-105 shadow-md'
                                        }`}>
                                        <Target className="w-5 h-5 text-white" />
                                    </div>

                                    {/* Title */}
                                    <div className="text-center mb-1.5">
                                        <div className={`text-base font-black ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                            ? 'text-gray-500 dark:text-slate-500'
                                            : 'text-blue-700 dark:text-white'
                                            }`}>
                                            50/50
                                        </div>
                                        <div className={`text-[10px] leading-tight ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                            ? 'text-gray-400 dark:text-slate-600'
                                            : 'text-blue-600 dark:text-blue-300'
                                            }`}>
                                            Remove 2 options
                                        </div>
                                    </div>

                                    {/* Quantity Badge */}
                                    <div className="flex justify-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${fiftyUsed || countPowerUp('5050') <= 0 || isTextQuestion
                                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
                                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                            }`}>
                                            <Zap className="w-2.5 h-2.5" />
                                            x{countPowerUp('5050')}
                                        </div>
                                    </div>

                                    {fiftyUsed && (
                                        <div className="mt-1 text-[10px] text-green-600 dark:text-green-400 font-semibold text-center">✓ Used</div>
                                    )}
                                </div>
                            </button>

                            {/* Time Freeze Power-Up */}
                            <button
                                onClick={useTimeFreeze}
                                disabled={timeFreezeUsed || countPowerUp('time_freeze') <= 0}
                                className={`group relative w-full p-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                    ? 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                    : 'border-orange-400 dark:border-orange-500/50 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/40 dark:to-red-900/40 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 hover:-translate-y-0.5 cursor-pointer'
                                    }`}
                            >
                                {/* Animated background */}
                                {!timeFreezeUsed && countPowerUp('time_freeze') > 0 && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                )}

                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 mx-auto transition-all ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                        ? 'bg-gray-300 dark:bg-slate-700'
                                        : 'bg-gradient-to-br from-orange-500 to-red-500 group-hover:scale-105 shadow-md'
                                        }`}>
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>

                                    {/* Title */}
                                    <div className="text-center mb-1.5">
                                        <div className={`text-base font-black ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                            ? 'text-gray-500 dark:text-slate-500'
                                            : 'text-orange-700 dark:text-white'
                                            }`}>
                                            Time Freeze
                                        </div>
                                        <div className={`text-[10px] leading-tight ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                            ? 'text-gray-400 dark:text-slate-600'
                                            : 'text-orange-600 dark:text-orange-300'
                                            }`}>
                                            +20 seconds
                                        </div>
                                    </div>

                                    {/* Quantity Badge */}
                                    <div className="flex justify-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${timeFreezeUsed || countPowerUp('time_freeze') <= 0
                                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
                                            : 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                                            }`}>
                                            <Zap className="w-2.5 h-2.5" />
                                            x{countPowerUp('time_freeze')}
                                        </div>
                                    </div>

                                    {timeFreezeUsed && (
                                        <div className="mt-1 text-[10px] text-green-600 dark:text-green-400 font-semibold text-center">✓ Used</div>
                                    )}
                                </div>
                            </button>

                            {/* Hint Power-Up */}
                            <button
                                onClick={useHint}
                                disabled={hintUsed || countPowerUp('hint') <= 0 || isTextQuestion}
                                className={`group relative w-full p-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${hintUsed || countPowerUp('hint') <= 0 || isTextQuestion
                                    ? 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                    : 'border-purple-400 dark:border-purple-500/50 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/40 dark:to-pink-900/40 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5 cursor-pointer'
                                    }`}
                            >
                                {/* Animated background */}
                                {!hintUsed && countPowerUp('hint') > 0 && !isTextQuestion && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                )}

                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 mx-auto transition-all ${hintUsed || countPowerUp('hint') <= 0 || isTextQuestion
                                        ? 'bg-gray-300 dark:bg-slate-700'
                                        : 'bg-gradient-to-br from-purple-500 to-pink-500 group-hover:scale-105 shadow-md'
                                        }`}>
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>

                                    {/* Title */}
                                    <div className="text-center mb-1.5">
                                        <div className={`text-base font-black ${hintUsed || countPowerUp('hint') <= 0 || isTextQuestion
                                            ? 'text-gray-500 dark:text-slate-500'
                                            : 'text-purple-700 dark:text-white'
                                            }`}>
                                            Smart Hint
                                        </div>
                                        <div className={`text-[10px] leading-tight ${hintUsed || countPowerUp('hint') <= 0 || isTextQuestion
                                            ? 'text-gray-400 dark:text-slate-600'
                                            : 'text-purple-600 dark:text-purple-300'
                                            }`}>
                                            Reveal clue
                                        </div>
                                    </div>

                                    {/* Quantity Badge */}
                                    <div className="flex justify-center">
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${hintUsed || countPowerUp('hint') <= 0 || isTextQuestion
                                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
                                            : 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                                            }`}>
                                            <Zap className="w-2.5 h-2.5" />
                                            x{countPowerUp('hint')}
                                        </div>
                                    </div>

                                    {hintUsed && (
                                        <div className="mt-1 text-[10px] text-green-600 dark:text-green-400 font-semibold text-center">✓ Used</div>
                                    )}
                                </div>
                            </button>

                            {/* Block Hint Power-Up - Only for Block Questions */}
                            {q.isBlock && (
                                <button
                                    onClick={useBlockHint}
                                    disabled={blockHintUsed || countPowerUp('block_hint') <= 0}
                                    className={`group relative w-full p-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${blockHintUsed || countPowerUp('block_hint') <= 0
                                        ? 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                        : 'border-green-400 dark:border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-0.5 cursor-pointer'
                                        }`}
                                >
                                    <div className="relative z-10">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 mx-auto transition-all ${blockHintUsed || countPowerUp('block_hint') <= 0
                                            ? 'bg-gray-300 dark:bg-slate-700'
                                            : 'bg-gradient-to-br from-green-500 to-emerald-500 group-hover:scale-105 shadow-md'
                                            }`}>
                                            <Target className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="text-center mb-1.5">
                                            <div className={`text-base font-black ${blockHintUsed || countPowerUp('block_hint') <= 0
                                                ? 'text-gray-500 dark:text-slate-500'
                                                : 'text-green-700 dark:text-white'
                                                }`}>
                                                Block Hint
                                            </div>
                                            <div className={`text-[10px] leading-tight ${blockHintUsed || countPowerUp('block_hint') <= 0
                                                ? 'text-gray-400 dark:text-slate-600'
                                                : 'text-green-600 dark:text-green-300'
                                                }`}>
                                                Show categories
                                            </div>
                                        </div>
                                        <div className="flex justify-center">
                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${blockHintUsed || countPowerUp('block_hint') <= 0
                                                ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
                                                : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                                                }`}>
                                                <Zap className="w-2.5 h-2.5" />
                                                x{countPowerUp('block_hint')}
                                            </div>
                                        </div>
                                        {blockHintUsed && (
                                            <div className="mt-1 text-[10px] text-green-600 dark:text-green-400 font-semibold text-center">✓ Used</div>
                                        )}
                                    </div>
                                </button>
                            )}

                            {/* Code Snippet Power-Up - For Block & Compiler Questions */}
                            {(q.isBlock || q.isCompiler) && (
                                <button
                                    onClick={useCodeSnippet}
                                    disabled={codeSnippetUsed || countPowerUp('code_snippet') <= 0}
                                    className={`group relative w-full p-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${codeSnippetUsed || countPowerUp('code_snippet') <= 0
                                        ? 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                        : 'border-indigo-400 dark:border-indigo-500/50 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/40 dark:to-blue-900/40 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 cursor-pointer'
                                        }`}
                                >
                                    <div className="relative z-10">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 mx-auto transition-all ${codeSnippetUsed || countPowerUp('code_snippet') <= 0
                                            ? 'bg-gray-300 dark:bg-slate-700'
                                            : 'bg-gradient-to-br from-indigo-500 to-blue-500 group-hover:scale-105 shadow-md'
                                            }`}>
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="text-center mb-1.5">
                                            <div className={`text-base font-black ${codeSnippetUsed || countPowerUp('code_snippet') <= 0
                                                ? 'text-gray-500 dark:text-slate-500'
                                                : 'text-indigo-700 dark:text-white'
                                                }`}>
                                                Code Snippet
                                            </div>
                                            <div className={`text-[10px] leading-tight ${codeSnippetUsed || countPowerUp('code_snippet') <= 0
                                                ? 'text-gray-400 dark:text-slate-600'
                                                : 'text-indigo-600 dark:text-indigo-300'
                                                }`}>
                                                Show structure
                                            </div>
                                        </div>
                                        <div className="flex justify-center">
                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${codeSnippetUsed || countPowerUp('code_snippet') <= 0
                                                ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
                                                : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                                }`}>
                                                <Zap className="w-2.5 h-2.5" />
                                                x{countPowerUp('code_snippet')}
                                            </div>
                                        </div>
                                        {codeSnippetUsed && (
                                            <div className="mt-1 text-[10px] text-green-600 dark:text-green-400 font-semibold text-center">✓ Used</div>
                                        )}
                                    </div>
                                </button>
                            )}

                            {/* Debug Helper Power-Up - For Block & Compiler Questions */}
                            {(q.isBlock || q.isCompiler) && (
                                <button
                                    onClick={useDebugHelper}
                                    disabled={debugHelperUsed || countPowerUp('debug_helper') <= 0}
                                    className={`group relative w-full p-3 rounded-xl border-2 transition-all duration-300 overflow-hidden ${debugHelperUsed || countPowerUp('debug_helper') <= 0
                                        ? 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                        : 'border-yellow-400 dark:border-yellow-500/50 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/40 dark:to-amber-900/40 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20 hover:-translate-y-0.5 cursor-pointer'
                                        }`}
                                >
                                    <div className="relative z-10">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 mx-auto transition-all ${debugHelperUsed || countPowerUp('debug_helper') <= 0
                                            ? 'bg-gray-300 dark:bg-slate-700'
                                            : 'bg-gradient-to-br from-yellow-500 to-amber-500 group-hover:scale-105 shadow-md'
                                            }`}>
                                            <Zap className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="text-center mb-1.5">
                                            <div className={`text-base font-black ${debugHelperUsed || countPowerUp('debug_helper') <= 0
                                                ? 'text-gray-500 dark:text-slate-500'
                                                : 'text-yellow-700 dark:text-white'
                                                }`}>
                                                Debug Helper
                                            </div>
                                            <div className={`text-[10px] leading-tight ${debugHelperUsed || countPowerUp('debug_helper') <= 0
                                                ? 'text-gray-400 dark:text-slate-600'
                                                : 'text-yellow-600 dark:text-yellow-300'
                                                }`}>
                                                Avoid mistakes
                                            </div>
                                        </div>
                                        <div className="flex justify-center">
                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${debugHelperUsed || countPowerUp('debug_helper') <= 0
                                                ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
                                                : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                                                }`}>
                                                <Zap className="w-2.5 h-2.5" />
                                                x{countPowerUp('debug_helper')}
                                            </div>
                                        </div>
                                        {debugHelperUsed && (
                                            <div className="mt-1 text-[10px] text-green-600 dark:text-green-400 font-semibold text-center">✓ Used</div>
                                        )}
                                    </div>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Question Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 md:p-8 border border-gray-100 dark:border-gray-700">
                        <div className="mb-6">
                            <div className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full font-semibold mb-4">
                                Question {q.id}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white whitespace-pre-line">{q.question}</h2>
                            {q.imageUrl && (
                                <div className="mt-4">
                                    <img src={q.imageUrl} alt="Question visual" className="rounded-xl border border-gray-200 dark:border-gray-700 max-h-64 object-contain" />
                                </div>
                            )}
                            {q.codeSnippet && (
                                <pre className="mt-4 p-4 bg-gray-900 text-green-100 rounded-xl text-sm overflow-x-auto">
                                    {q.codeSnippet}
                                </pre>
                            )}
                            {q.audioUrl && (
                                <div className="mt-4">
                                    <audio controls src={q.audioUrl} className="w-full" />
                                </div>
                            )}

                            {/* Hint Message Display */}
                            {hintMessage && (
                                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                                            <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-yellow-800 dark:text-yellow-200">Hint Revealed!</p>
                                            <p className="text-yellow-700 dark:text-yellow-300/90 text-sm mt-0.5">
                                                {hintMessage.replace('💡 Smart Hint: ', '')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Block Hint Message Display */}
                            {blockHintMessage && (
                                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                                            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-green-800 dark:text-green-200">Block Hint!</p>
                                            <p className="text-green-700 dark:text-green-300/90 text-sm mt-0.5">
                                                {blockHintMessage.replace('🎯 Block Hint: ', '')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Code Snippet Message Display */}
                            {codeSnippetMessage && (
                                <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-700/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                                            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-indigo-800 dark:text-indigo-200 mb-2">Code Structure!</p>
                                            <pre className="text-indigo-700 dark:text-indigo-300/90 text-sm whitespace-pre-wrap font-mono bg-indigo-100/50 dark:bg-indigo-900/20 p-3 rounded-lg">
                                                {codeSnippetMessage.replace('📝 Code Structure:\n', '').replace('📝 Example Structure:\n', '')}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Debug Helper Message Display */}
                            {debugHelperMessage && (
                                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-700/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                                            <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">Debug Tips!</p>
                                            <pre className="text-yellow-700 dark:text-yellow-300/90 text-sm whitespace-pre-wrap">
                                                {debugHelperMessage.replace('🐛 Debug Tips:\n', '')}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 mb-6">
                            {q.isBlock ? (
                                <React.Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader /></div>}>
                                    <BlockQuestion
                                        initialXml={selectedAnswer as string || q.blockConfig?.initialXml}
                                        toolbox={q.blockConfig?.toolbox}
                                        onChange={(xml, code) => handleAnswer(xml, code)}
                                        readOnly={isSubmitting}
                                    />
                                </React.Suspense>
                            ) : q.isCompiler ? (
                                <React.Suspense fallback={<div className="h-[600px] flex items-center justify-center"><Loader /></div>}>
                                    <CompilerQuestion
                                        language={q.compilerConfig?.language || 'javascript'}
                                        allowedLanguages={q.compilerConfig?.allowedLanguages || ['javascript']}
                                        initialCode={selectedAnswer as string || q.compilerConfig?.initialCode}
                                        onChange={(code) => handleAnswer(code)}
                                        readOnly={isSubmitting}
                                    />
                                </React.Suspense>
                            ) : isTextQuestion ? (
                                <textarea
                                    value={selectedAnswer as string || ''}
                                    onChange={(e) => handleAnswer(e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none min-h-[150px]"
                                />
                            ) : (
                                q.options?.map((option, index) => {
                                    const isSelected = selectedAnswer === index;
                                    if (eliminatedOptions.has(index)) return null;

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleAnswer(index)}
                                            className={`w-full p-5 rounded-xl text-left transition-all flex items-center gap-4 font-medium text-lg group ${isSelected
                                                ? 'bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-500 text-purple-900 dark:text-purple-100'
                                                : 'bg-gray-100 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-gray-200 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-200'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${isSelected ? 'bg-purple-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                                }`}>
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <span className="flex-1">{option}</span>
                                            <span className="opacity-0 group-hover:opacity-50 text-xs font-mono border border-current px-1.5 rounded hidden lg:inline-block">
                                                {index + 1}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex gap-4">
                            {currentQuestion > 0 && (
                                <button
                                    onClick={previousQuestion}
                                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-4 rounded-xl font-bold text-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                                >
                                    Previous
                                </button>
                            )}
                            <button
                                onClick={nextQuestion}
                                disabled={selectedAnswer === undefined || isSubmitting}
                                className={`flex-1 py-4 rounded-xl font-bold text-xl transition-all ${selectedAnswer !== undefined && !isSubmitting
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                        Submitting...
                                    </span>
                                ) : (
                                    currentQuestion < quiz.questions.length - 1 ? (
                                        <span className="flex items-center justify-center gap-2">
                                            Next Question
                                            <span className="text-xs font-normal opacity-70 hidden lg:inline-block border border-white/30 px-1.5 rounded ml-1">↵</span>
                                        </span>
                                    ) : 'Submit Quiz'
                                )}
                            </button>
                        </div>

                        {selectedAnswer === undefined && (
                            <p className="text-center text-sm text-gray-500 mt-4">
                                Please select an answer to continue
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Resume Prompt Modal */}
            {showResumePrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Resume Quiz?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    We found an unfinished attempt from {savedState ? new Date(savedState.lastUpdated).toLocaleDateString() : ''}
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-8">
                            Would you like to continue where you left off or start over from the beginning?
                        </p>

                        <div className="flex gap-4">
                            <button
                                onClick={handleStartNew}
                                className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Start Over
                            </button>
                            <button
                                onClick={handleResume}
                                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-purple-500/25"
                            >
                                Resume
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizTaking;
