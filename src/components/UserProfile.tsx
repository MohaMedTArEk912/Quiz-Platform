import React, { useRef, useState } from 'react';
import type { UserData, AttemptData } from '../types/index.ts';
import { Trophy, Clock, TrendingUp, Award, Download, Loader2, Star, Zap, Flame } from 'lucide-react';
import Navbar from './Navbar.tsx';
import { Certificate } from './Certificate.tsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { XP_PER_LEVEL } from '../utils/gamification.ts';

interface UserProfileProps {
    user: UserData;
    attempts: AttemptData[];
    allUsers: UserData[];
    onBack: () => void;
}

const BadgeIcon = ({ icon, className }: { icon: string, className?: string }) => {
    switch (icon) {
        case 'Trophy': return <Trophy className={className} />;
        case 'Star': return <Star className={className} />;
        case 'Zap': return <Zap className={className} />;
        case 'Flame': return <Flame className={className} />;
        default: return <Award className={className} />;
    }
};

const UserProfile: React.FC<UserProfileProps> = ({ user, attempts, allUsers, onBack }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [downloadingAttemptId, setDownloadingAttemptId] = useState<string | null>(null);

    // Calculate rank
    const sortedUsers = [...allUsers].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const rank = sortedUsers.findIndex(u => u.userId === user.userId) + 1;

    const totalTime = attempts.reduce((sum, a) => sum + a.timeTaken, 0);
    const avgScore = attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
        : 0;

    const recentAttempts = [...attempts]
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0, 10);

    const handleDownloadCertificate = async (attempt: AttemptData) => {
        setDownloadingAttemptId(attempt.attemptId);

        try {
            // Wait a bit to ensure rendering
            await new Promise(resolve => setTimeout(resolve, 500));

            if (!certificateRef.current) return;

            const canvas = await html2canvas(certificateRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1000, 700]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 1000, 700);
            pdf.save(`${attempt.quizTitle.replace(/\s+/g, '_')}_Certificate.pdf`);
        } catch (error) {
            console.error('Error generating certificate:', error);
            alert('Failed to generate certificate');
        } finally {
            setDownloadingAttemptId(null);
        }
    };

    // Helper to find the attempt currently being downloaded
    const currentCertificateAttempt = attempts.find(a => a.attemptId === downloadingAttemptId);

    const currentLevelXP = ((user.xp || 0) % XP_PER_LEVEL);
    const progressPercent = (currentLevelXP / XP_PER_LEVEL) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
            <Navbar
                user={user}
                onBack={onBack}
                showBack={true}
                title="My Profile"
                onViewProfile={() => { }}
                onViewLeaderboard={() => { }}
                onLogout={() => { }}
                showActions={false}
            />

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Profile Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-4xl font-bold border-4 border-white dark:border-gray-700 shadow-xl">
                                {user.name.charAt(0)}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white dark:border-gray-700">
                                Lvl {user.level || 1}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left w-full">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{user.name}</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{user.email}</p>

                            {/* Level Progress */}
                            <div className="mb-4 max-w-lg mx-auto md:mx-0">
                                <div className="flex justify-between text-sm mb-1 text-gray-600 dark:text-gray-400 font-semibold">
                                    <span>{currentLevelXP} XP</span>
                                    <span>{XP_PER_LEVEL} XP to next level</span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg font-semibold flex items-center gap-2">
                                    <Trophy className="w-4 h-4" />
                                    Rank #{rank}
                                </div>
                                <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-lg font-semibold flex items-center gap-2">
                                    <Flame className="w-4 h-4" />
                                    {user.streak || 0} Day Streak
                                </div>
                                <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg font-semibold">
                                    Member since {new Date(user.createdAt || user.lastLoginDate || new Date()).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges Section */}
                {user.badges && user.badges.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Award className="w-6 h-6 text-yellow-500" />
                            Badges Earned
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {user.badges.map(badge => (
                                <div key={badge.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white mb-3 shadow-lg">
                                        <BadgeIcon icon={badge.icon} className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{badge.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{badge.description}</p>
                                    <span className="text-[10px] text-gray-400 mt-2">{new Date(badge.dateEarned).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                            <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Score</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{user.totalScore || 0}</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Quizzes Taken</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{user.totalAttempts || 0}</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Avg Score</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{avgScore}%</div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Time</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {Math.floor(totalTime / 60)}m
                        </div>
                    </div>
                </div>

                {/* Recent Attempts */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Recent Quiz Attempts</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Quiz</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Score</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Time</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Certificate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {recentAttempts.map((attempt) => (
                                    <tr key={attempt.attemptId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900 dark:text-white">{attempt.quizTitle}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${attempt.percentage >= 60
                                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                                    : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                                                    }`}
                                            >
                                                {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {new Date(attempt.completedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {attempt.percentage >= 60 && (
                                                <button
                                                    onClick={() => handleDownloadCertificate(attempt)}
                                                    disabled={downloadingAttemptId === attempt.attemptId}
                                                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
                                                    title="Download Certificate"
                                                >
                                                    {downloadingAttemptId === attempt.attemptId ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Download className="w-5 h-5" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {recentAttempts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            No quiz attempts yet. Start taking quizzes to see your progress!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Hidden Certificate Component - Renders based on selection */}
            {currentCertificateAttempt && (
                <div style={{ position: 'absolute', top: -10000, left: -10000 }}>
                    <Certificate
                        ref={certificateRef}
                        userName={user.name}
                        courseTitle={currentCertificateAttempt.quizTitle}
                        score={currentCertificateAttempt.score}
                        totalQuestions={currentCertificateAttempt.totalQuestions}
                        date={new Date(currentCertificateAttempt.completedAt).toLocaleDateString()}
                        certificateId={currentCertificateAttempt.attemptId}
                    />
                </div>
            )}
        </div>
    );
};

export default UserProfile;
