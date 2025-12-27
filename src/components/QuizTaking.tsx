import React, { useState, useEffect } from 'react';
import type { Quiz, UserData } from '../types/index.ts';
import { ArrowLeft, Clock } from 'lucide-react';

interface QuizTakingProps {
    quiz: Quiz;
    user: UserData;
    onComplete: (result: any) => void;
    onBack: () => void;
}

const QuizTaking: React.FC<QuizTakingProps> = ({ quiz, onComplete, onBack }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60);
    const [startTime] = useState(Date.now());

    useEffect(() => {
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
    }, []);

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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
                                <p className="text-gray-600 text-sm">{q.part}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <div className="flex items-center gap-2 text-lg font-bold text-purple-600">
                                    <Clock className="w-5 h-5" />
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="text-xs text-gray-600">Time Left</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{answeredCount}/{quiz.questions.length}</div>
                                <div className="text-xs text-gray-600">Answered</div>
                            </div>
                        </div>
                    </div>

                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-center text-sm text-gray-600 mt-2">
                        Question {currentQuestion + 1} of {quiz.questions.length}
                    </div>
                </div>

                {/* Question */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="mb-6">
                        <div className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-semibold mb-4">
                            Question {q.id}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 whitespace-pre-line">{q.question}</h2>
                    </div>

                    <div className="space-y-4 mb-6">
                        {q.options.map((option, index) => {
                            const isSelected = selectedAnswer === index;

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswer(index)}
                                    className={`w-full p-5 rounded-xl text-left transition-all flex items-center gap-4 font-medium text-lg ${isSelected
                                            ? 'bg-purple-100 border-2 border-purple-500 text-purple-900'
                                            : 'bg-gray-50 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${isSelected ? 'bg-purple-500 text-white' : 'bg-gray-300 text-gray-700'
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
                                className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-bold text-xl hover:bg-gray-300 transition-all"
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
        </div>
    );
};

export default QuizTaking;
