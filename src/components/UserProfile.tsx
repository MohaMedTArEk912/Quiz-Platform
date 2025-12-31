import React, { useRef, useState } from 'react';
import type { UserData, AttemptData } from '../types/index.ts';
import { Trophy, TrendingUp, Award, Download, Loader2, Star, Zap, Flame, Settings, Calendar, History } from 'lucide-react';
import Navbar from './Navbar.tsx';
import { Certificate } from './Certificate.tsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { calculateLevel } from '../lib/gamification';
import UserSettings from './UserSettings.tsx';
import AnalyticsPanel from './engage/AnalyticsPanel.tsx';

interface UserProfileProps {
    user: UserData;
    attempts: AttemptData[];
    allUsers: UserData[];
    onBack: () => void;
    onUserUpdate?: (updatedUser: UserData) => void;
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

const UserProfile: React.FC<UserProfileProps> = ({ user, attempts, allUsers, onBack, onUserUpdate }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [downloadingAttemptId, setDownloadingAttemptId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserData>(user);

    const currentXP = currentUser.xp || 0;
    const level = calculateLevel(currentXP);
    const xpForCurrentLevel = Math.pow(Math.max(level - 1, 0), 2) * 100;
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpIntoLevel = Math.max(0, currentXP - xpForCurrentLevel);
    const xpToNextLevel = Math.max(0, xpForNextLevel - currentXP);
    const levelProgress = xpForNextLevel === xpForCurrentLevel
        ? 0
        : Math.min(100, (xpIntoLevel / (xpForNextLevel - xpForCurrentLevel)) * 100);

    const sortedUsers = [...allUsers].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const rank = sortedUsers.findIndex(u => u.userId === currentUser.userId) + 1;

    const handleUserUpdate = (updatedUser: UserData) => {
        setCurrentUser(updatedUser);
        if (onUserUpdate) {
            onUserUpdate(updatedUser);
        }
    };

    const recentAttempts = [...attempts]
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0, 10);

    const handleDownloadCertificate = async (attempt: AttemptData) => {
        setDownloadingAttemptId(attempt.attemptId);
        setError(null);

        try {
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
            setError('Failed to generate certificate');
        } finally {
            setDownloadingAttemptId(null);
        }
    };

    const currentCertificateAttempt = attempts.find(a => a.attemptId === downloadingAttemptId);

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-purple-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen" />
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[128px] mix-blend-screen" />
            </div>

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

            <div className="relative max-w-7xl mx-auto px-6 py-8 md:py-12">
                {/* Profile Card */}
                <div className="relative bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl overflow-hidden mb-12">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-600/20 to-purple-600/20" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 pt-4">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full bg-[#0a0a0b] p-1.5 ring-4 ring-indigo-500/50 shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-500">
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl font-black text-white">
                                    {currentUser.name.charAt(0)}
                                </div>
                            </div>
                            <div className="absolute -bottom-3 -right-3 z-20 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-black px-4 py-1.5 rounded-full shadow-lg border-2 border-[#0a0a0b]">
                                Lvl {currentUser.level || 1}
                            </div>
                            {/* Settings Button */}
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="absolute -top-2 -right-2 z-20 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 transition-all hover:rotate-180"
                                title="Account Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 text-center md:text-left w-full">
                            <div className="mb-6">
                                <h2 className="text-4xl font-black text-white mb-2 tracking-tight">{currentUser.name}</h2>
                                <p className="text-lg text-gray-400 font-medium">{currentUser.email}</p>
                            </div>

                            {/* Level Progress */}
                            <div className="mb-8 max-w-xl mx-auto md:mx-0">
                                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    <span>Progress</span>
                                    <span>{xpToNextLevel} XP to Level {level + 1}</span>
                                </div>
                                <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out relative overflow-hidden"
                                        style={{ width: `${levelProgress}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                <div className="pl-2 pr-5 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                        <Trophy className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <span className="font-bold text-indigo-200">Rank #{rank}</span>
                                </div>
                                <div className="pl-2 pr-5 py-2 bg-orange-500/10 rounded-xl border border-orange-500/20 flex items-center gap-3">
                                    <div className="p-1.5 bg-orange-500/20 rounded-lg">
                                        <Flame className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <span className="font-bold text-orange-200">{currentUser.streak || 0} Day Streak</span>
                                </div>
                                <div className="pl-2 pr-5 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center gap-3">
                                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                        <Calendar className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <span className="font-bold text-blue-200">Joined {new Date(currentUser.createdAt || currentUser.lastLoginDate || new Date()).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges Section */}
                {currentUser.badges && currentUser.badges.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <Award className="w-6 h-6 text-yellow-400" />
                            <h3 className="text-2xl font-black text-white">Badges Earned</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {currentUser.badges.map(badge => (
                                <div key={badge.id} className="group bg-[#13141f] p-6 rounded-[2rem] border border-white/5 flex flex-col items-center text-center hover:bg-white/10 transition-colors duration-300">
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                            <BadgeIcon icon={badge.icon} className="w-8 h-8" />
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-white mb-1">{badge.name}</h4>
                                    <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">{badge.description}</p>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-black/20 px-2 py-1 rounded-lg">
                                        {new Date(badge.dateEarned).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats & Analytics */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="w-6 h-6 text-blue-400" />
                        <h3 className="text-2xl font-black text-white">Performance Analytics</h3>
                    </div>
                    {/* Assuming AnalyticsPanel can accept dark mode styles or is already styled cleanly */}
                    <div className="bg-[#13141f] rounded-[2.5rem] p-6 border border-white/5">
                        <AnalyticsPanel user={currentUser} />
                    </div>
                </div>

                {/* Recent Attempts */}
                <div className="bg-[#13141f] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex flex-wrap justify-between items-center gap-4 bg-white/5">
                        <div className="flex items-center gap-3">
                            <History className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-black text-white">Recent Activity</h2>
                        </div>
                        {error && <span className="bg-red-500/10 text-red-400 px-4 py-2 rounded-xl text-sm font-bold border border-red-500/20 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> {error}
                        </span>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/5 bg-black/20 text-xs font-black text-gray-400 uppercase tracking-wider">
                                    <th className="px-8 py-5 text-left">Quiz</th>
                                    <th className="px-8 py-5 text-left">Score</th>
                                    <th className="px-8 py-5 text-left">Time</th>
                                    <th className="px-8 py-5 text-left">Date</th>
                                    <th className="px-8 py-5 text-right">Certificate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {recentAttempts.map((attempt) => (
                                    <tr key={attempt.attemptId} className="group hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-5">
                                            <span className="font-bold text-white text-lg">{attempt.quizTitle}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${attempt.percentage >= 60
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}
                                            >
                                                {attempt.score}/{attempt.totalQuestions} ({attempt.percentage}%)
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-gray-400 font-medium">
                                            {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                        </td>
                                        <td className="px-8 py-5 text-gray-500 font-medium">
                                            {new Date(attempt.completedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {attempt.percentage === 100 ? (
                                                <button
                                                    onClick={() => handleDownloadCertificate(attempt)}
                                                    disabled={downloadingAttemptId === attempt.attemptId}
                                                    className="inline-flex pl-3 pr-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-xl transition-all font-bold text-xs uppercase tracking-wider gap-2 items-center border border-yellow-500/20 hover:border-yellow-500/40"
                                                    title="Download Certificate (100% Score)"
                                                >
                                                    {downloadingAttemptId === attempt.attemptId ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Download className="w-4 h-4" />
                                                    )}
                                                    Certificate
                                                </button>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                                                    {attempt.percentage >= 60 ? '100% required' : 'Not earned'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {recentAttempts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-16 text-center text-gray-500 font-medium text-lg">
                                            No recent activity. Start a quiz to build your legacy!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Hidden Certificate Component */}
            {currentCertificateAttempt && (
                <div style={{ position: 'absolute', top: -10000, left: -10000 }}>
                    <Certificate
                        ref={certificateRef}
                        userName={currentUser.name}
                        courseTitle={currentCertificateAttempt.quizTitle}
                        score={currentCertificateAttempt.score}
                        totalQuestions={currentCertificateAttempt.totalQuestions}
                        date={new Date(currentCertificateAttempt.completedAt).toLocaleDateString()}
                        certificateId={currentCertificateAttempt.attemptId}
                    />
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <UserSettings
                    user={currentUser}
                    onClose={() => setIsSettingsOpen(false)}
                    onUpdate={handleUserUpdate}
                />
            )}
        </div>
    );
};

export default UserProfile;
