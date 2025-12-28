import React, { useState, useEffect } from 'react';
import type { Quiz, UserData } from '../types/index.ts';
import { Clock } from 'lucide-react';
import Navbar from './Navbar.tsx';

interface QuizTakingProps {
    quiz: Quiz;
    user: UserData;
    onComplete: (result: any) => void;
    onBack: () => void;
}

const QuizTaking: React.FC<QuizTakingProps> = ({ quiz, user, onComplete, onBack }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
    const [startTime] = useState(Date.now());

    // Resume State
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [savedState, setSavedState] = useState<any>(null);

    const storageKey = `quiz_progress_${user.userId}_${quiz.id}`;

    // Load saved state on mount
    useEffect(() => {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Basic validation
                if (parsed.quizId === quiz.id && parsed.timeLeft > 0) {
                    setSavedState(parsed);
                    setShowResumePrompt(true);
                }
            } catch (e) {
                console.error("Failed to parse saved state", e);
                sessionStorage.removeItem(storageKey);
            }
        }
    }, [quiz.id, storageKey]);

    // Save state on change
    useEffect(() => {
        if (showResumePrompt) return; // Don't save while prompting

        const state = {
            quizId: quiz.id,
            currentQuestion,
            answers,
            timeLeft,
            lastUpdated: Date.now()
        };
        sessionStorage.setItem(storageKey, JSON.stringify(state));
    }, [currentQuestion, answers, timeLeft, quiz.id, storageKey, showResumePrompt]);

    const handleResume = () => {
        if (savedState) {
            setCurrentQuestion(savedState.currentQuestion);
            setAnswers(savedState.answers);
            setTimeLeft(savedState.timeLeft);
        }
        setShowResumePrompt(false);
    };

    const handleStartNew = () => {
        sessionStorage.removeItem(storageKey);
        setSavedState(null);
        setShowResumePrompt(false);
    };

    useEffect(() => {
        if (showResumePrompt) return; // Pause timer while prompting

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
    }, [showResumePrompt]);

    const handleAnswer = (index: number) => {
        setAnswers({
            ...answers,
            [currentQuestion]: index
        });
    };

    const nextQuestion = () => {
        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            handleQuizComplete();
        }
    };

    const previousQuestion = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const handleQuizComplete = () => {
        // Clear saved progress
        sessionStorage.removeItem(storageKey);

        const timeTaken = Math.floor((Date.now() - startTime) / 1000);

        // Calculate score
        let score = 0;
        const detailedAnswers: Record<number, any> = {};

        quiz.questions.forEach((question, index) => {
            const selectedAnswer = answers[index];
            const isCorrect = selectedAnswer === question.correctAnswer;

            if (isCorrect) {
                score += question.points;
            }

            detailedAnswers[index] = {
                selected: selectedAnswer,
                correct: isCorrect
            };
        });

        const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
        const percentage = Math.round((score / totalPoints) * 100);

        onComplete({
            score,
            totalQuestions: quiz.questions.length,
            percentage,
            timeTaken,
            answers: detailedAnswers,
            passed: percentage >= quiz.passingScore
        });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const q = quiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
    const selectedAnswer = answers[currentQuestion];
    const answeredCount = Object.keys(answers).length;

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
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">{q.part}</p>
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

                {/* Question */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                    <div className="mb-6">
                        <div className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full font-semibold mb-4">
                            Question {q.id}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white whitespace-pre-line">{q.question}</h2>
                    </div>

                    <div className="space-y-4 mb-6">
                        {q.options.map((option, index) => {
                            const isSelected = selectedAnswer === index;

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswer(index)}
                                    className={`w-full p-5 rounded-xl text-left transition-all flex items-center gap-4 font-medium text-lg ${isSelected
                                        ? 'bg-purple-100 dark:bg-purple-900/40 border-2 border-purple-500 text-purple-900 dark:text-purple-100'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-200'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${isSelected ? 'bg-purple-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {String.fromCharCode(65 + index)}
                                    </div>
                                    <span className="flex-1">{option}</span>
                                </button>
                            );
                        })}
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
                            disabled={selectedAnswer === undefined}
                            className={`flex-1 py-4 rounded-xl font-bold text-xl transition-all ${selectedAnswer !== undefined
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {currentQuestion < quiz.questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
                        </button>
                    </div>

                    {selectedAnswer === undefined && (
                        <p className="text-center text-sm text-gray-500 mt-4">
                            Please select an answer to continue
                        </p>
                    )}
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
