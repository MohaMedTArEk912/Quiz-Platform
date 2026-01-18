import React, { useState } from 'react';
import { Check, BookOpen } from 'lucide-react';
import Avatar from '../Avatar.tsx';
import type { AttemptData, Quiz, UserData } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface ReviewManagementProps {
    currentUser: UserData;
    users: UserData[];
    quizzes: Quiz[];
    pendingReviews: AttemptData[];
    onRefresh: () => void;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const ReviewManagement: React.FC<ReviewManagementProps> = ({ currentUser, users, quizzes, pendingReviews, onRefresh, onNotification }) => {
    const [reviewingAttempt, setReviewingAttempt] = useState<AttemptData | null>(null);
    const [reviewFeedback, setReviewFeedback] = useState<Record<number, string>>({});
    const [reviewScores, setReviewScores] = useState<Record<string, number>>({});

    const getQuizForAttempt = (attempt: AttemptData) => {
        return quizzes.find(q => q.id === attempt.quizId || q._id === attempt.quizId);
    };

    const handleReviewSubmit = async () => {
        if (!reviewingAttempt) return;
        const additionalPoints = Object.values(reviewScores).reduce((sum, score) => sum + score, 0);

        try {
            await api.submitReview(reviewingAttempt.attemptId, {
                feedback: reviewFeedback,
                scoreAdjustment: additionalPoints
            }, currentUser.userId);

            setReviewingAttempt(null);
            setReviewFeedback({});
            setReviewScores({});
            onNotification('success', 'Review submitted successfully');
            onRefresh();
        } catch (error) {
            console.error('Submit review error:', error);
            onNotification('error', 'Failed to submit review');
        }
    };



    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {pendingReviews.length === 0 && !reviewingAttempt ? (
                <div className="py-20 text-center bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-sm">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-10 h-10 text-emerald-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-sm">All caught up! No pending reviews.</p>
                </div>
            ) : reviewingAttempt ? (
                <div className="space-y-6">
                    {/* Header Workspace */}
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-white/70 dark:bg-[#1e1e2d]/70 backdrop-blur-3xl p-5 sm:p-6 rounded-3xl border border-white/20 dark:border-white/5 sticky top-2 z-20 shadow-2xl">
                        <div className="flex items-center gap-4 mb-4 sm:mb-0">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 shadow-xl">
                                <div className="w-full h-full bg-white dark:bg-[#1e1e2d] rounded-[14px] flex items-center justify-center overflow-hidden">
                                    {(() => {
                                        const student = users?.find(u => u.userId === reviewingAttempt.userId);
                                        return student?.avatar ? (
                                            <Avatar config={student.avatar} size="md" className="w-full h-full" />
                                        ) : (
                                            <span className="font-black text-purple-600 text-lg">{reviewingAttempt.userName.charAt(0)}</span>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Grading <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-500">{reviewingAttempt.userName}</span>
                                </h3>
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Quiz: {getQuizForAttempt(reviewingAttempt)?.title}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="px-5 py-2.5 rounded-2xl bg-gray-50 dark:bg-black/20 border border-white/10 text-center flex-1 sm:flex-none">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Adjustment</div>
                                <div className={`text-lg font-black ${Object.values(reviewScores).reduce((a, b) => a + b, 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {Object.values(reviewScores).reduce((a, b) => a + b, 0) > 0 ? '+' : ''}{Object.values(reviewScores).reduce((a, b) => a + b, 0)} pts
                                </div>
                            </div>
                            <button
                                onClick={() => setReviewingAttempt(null)}
                                className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-2xl text-gray-600 dark:text-gray-400 font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReviewSubmit}
                                className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all transform hover:-translate-y-0.5"
                            >
                                Submit Review
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {getQuizForAttempt(reviewingAttempt)?.questions.map((q, idx) => {
                            if (q.type !== 'text') return null;
                            const ans = reviewingAttempt.answers[q.id];

                            return (
                                <div key={q.id} className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/5 space-y-5 shadow-sm hover:shadow-xl transition-shadow group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest border border-purple-500/20">
                                                    Quest {idx + 1}
                                                </span>
                                                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                    Open Text
                                                </span>
                                            </div>
                                            <p className="text-gray-900 dark:text-white text-lg font-black leading-tight tracking-tight uppercase">{q.question}</p>
                                        </div>
                                        <div className="flex flex-col items-center p-2 rounded-2xl bg-gray-50 dark:bg-black/20 border border-white/5 min-w-[70px]">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Points</span>
                                            <span className="text-lg font-black text-indigo-500">{q.points || 1}</span>
                                        </div>
                                    </div>

                                    {/* User Answer Container */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Student Response</label>
                                        <div className="bg-gray-50/50 dark:bg-[#050505]/50 p-6 rounded-3xl text-gray-900 dark:text-gray-100 font-bold text-sm leading-relaxed border-2 border-indigo-500/5 shadow-inner group-hover:border-indigo-500/20 transition-all">
                                            {(() => {
                                                if (typeof ans === 'object' && ans !== null) {
                                                    return (ans as any).selected || JSON.stringify(ans);
                                                }
                                                return ans || <span className="text-gray-400 italic">No answer provided by students.</span>;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Reference Panel */}
                                    {q.explanation && (
                                        <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 flex gap-3 items-start">
                                            <div className="p-2 rounded-xl bg-emerald-500/10 mt-0.5">
                                                <BookOpen className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Reference Guide</div>
                                                <p className="text-gray-500 dark:text-gray-400 text-xs font-bold leading-relaxed">{q.explanation}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Grading Controls */}
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                                        <div className="sm:col-span-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1.5 block">Score Adj.</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="w-full bg-gray-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-black outline-none transition-all placeholder:text-gray-300"
                                                    onChange={e => setReviewScores({ ...reviewScores, [q.id]: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1.5 block">Written Feedback</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Excellent detail in your explanation..."
                                                className="w-full bg-gray-50 dark:bg-black/40 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-5 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all placeholder:text-gray-400"
                                                onChange={e => setReviewFeedback({ ...reviewFeedback, [q.id]: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingReviews.map(attempt => (
                        <div key={attempt.attemptId} className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-5 rounded-3xl border border-white/20 dark:border-white/5 hover:border-indigo-500/30 transition-all group shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg group-hover:scale-110 transition-transform">
                                    <div className="w-full h-full bg-white dark:bg-[#1e1e2d] rounded-[14px] flex items-center justify-center overflow-hidden font-black text-indigo-600">
                                        {(() => {
                                            const student = users?.find(u => u.userId === attempt.userId);
                                            return student?.avatar ? (
                                                <Avatar config={student.avatar} size="sm" className="w-full h-full" />
                                            ) : (
                                                attempt.userName.charAt(0)
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {attempt.userName}
                                    </h4>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                        <span className="text-indigo-500">{attempt.quizTitle}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span>{new Date(attempt.completedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setReviewingAttempt(attempt)}
                                className="px-5 py-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-[1.25rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all transform hover:-translate-x-1"
                            >
                                Review
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewManagement;
