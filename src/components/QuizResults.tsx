import React, { useRef, useState, useEffect } from 'react';
import type { Quiz, UserData } from '../types/index.ts';
import { Award, RotateCcw, Home, Clock, Download, Loader2 } from 'lucide-react';
import Navbar from './Navbar.tsx';
import { Certificate } from './Certificate.tsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';

interface QuizResultsProps {
    result: any;
    quiz: Quiz;
    user: UserData;
    onBackToQuizzes: () => void;
    onRetake: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ result, quiz, user, onBackToQuizzes, onRetake }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (result.passed) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [result.passed]);

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const handleDownloadCertificate = async () => {
        if (!certificateRef.current) return;

        setIsGenerating(true);
        try {
            // Wait a bit to ensure rendering
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(certificateRef.current, {
                scale: 2, // Higher resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1000, 700] // Match the component dimensions
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 1000, 700);
            pdf.save(`${quiz.title.replace(/\s+/g, '_')}_Certificate.pdf`);
        } catch (error) {
            console.error('Error generating certificate:', error);
            alert('Failed to generate certificate. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex flex-col transition-colors">
            <Navbar
                user={user}
                onBack={onBackToQuizzes}
                showBack={true}
                title="Quiz Results"
                onViewProfile={() => { }}
                onViewLeaderboard={() => { }}
                onLogout={() => { }}
                showActions={false}
            />
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 transition-colors">
                    <div className="text-center">
                        <Award className={`w-24 h-24 mx-auto mb-6 ${getScoreColor(result.percentage)}`} />
                        <h1 className={`text-4xl font-bold mb-4 ${getScoreColor(result.percentage)}`}>
                            {result.passed ? 'Congratulations!' : 'Keep Trying!'}
                        </h1>
                        <div className={`text-6xl font-bold mb-6 ${getScoreColor(result.percentage)}`}>
                            {result.percentage}%
                        </div>
                        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
                            You scored {result.score} out of {result.totalQuestions} questions
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4">
                                <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-semibold">Time Taken</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(result.timeTaken)}</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                                <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                    <Award className="w-5 h-5" />
                                    <span className="font-semibold">Status</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {result.passed ? 'Passed' : 'Failed'}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        {result.percentage >= 80 && (
                            <p className="text-xl text-green-600 mb-6">
                                Excellent! You've mastered this topic! 🌟
                            </p>
                        )}
                        {result.percentage >= 60 && result.percentage < 80 && (
                            <p className="text-xl text-yellow-600 mb-6">
                                Good job! A bit more practice will make you perfect! 💪
                            </p>
                        )}
                        {result.percentage < 60 && (
                            <p className="text-xl text-red-600 mb-6">
                                Don't give up! Review the material and try again! 📚
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-4">
                            {/* Certificate Button */}
                            {result.passed && (
                                <button
                                    onClick={handleDownloadCertificate}
                                    disabled={isGenerating}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-yellow-600 hover:to-amber-600 transition-all shadow-lg transform hover:-translate-y-1"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            Generating Certificate...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-6 h-6" />
                                            Download Certificate
                                        </>
                                    )}
                                </button>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={onBackToQuizzes}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    <Home className="w-6 h-6" />
                                    Back to Quizzes
                                </button>
                                <button
                                    onClick={onRetake}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                                >
                                    <RotateCcw className="w-6 h-6" />
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Certificate Component */}
            <div style={{ position: 'absolute', top: -10000, left: -10000 }}>
                <Certificate
                    ref={certificateRef}
                    userName={user.name}
                    courseTitle={quiz.title}
                    score={result.score}
                    totalQuestions={result.totalQuestions}
                    date={new Date().toLocaleDateString()}
                    certificateId={Date.now().toString(36)}
                />
            </div>
        </div>
    );
};

export default QuizResults;
