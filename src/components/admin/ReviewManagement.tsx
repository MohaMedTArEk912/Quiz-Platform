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
        <div className="space-y-4">
            {pendingReviews.length === 0 && !reviewingAttempt ? (
                <div className="py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <Check className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 font-bold">All caught up! No pending reviews.</p>
                </div>
            ) : reviewingAttempt ? (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white dark:bg-[#13141f] p-6 rounded-2xl border border-gray-200 dark:border-white/10 sticky top-0 z-10 shadow-xl backdrop-blur-xl">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Grading: <span className="text-purple-600 dark:text-purple-400">{reviewingAttempt.userName}</span></h3>
                            <p className="text-sm text-gray-500">Quiz: {getQuizForAttempt(reviewingAttempt)?.title}</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Adjustment</div>
                                <div className={`text-xl font-black ${Object.values(reviewScores).reduce((a, b) => a + b, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {Object.values(reviewScores).reduce((a, b) => a + b, 0) > 0 ? '+' : ''}{Object.values(reviewScores).reduce((a, b) => a + b, 0)}
                                </div>
                            </div>
                            <button onClick={() => setReviewingAttempt(null)} className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-gray-600 dark:text-gray-300 font-bold transition-colors">Cancel</button>
                            <button onClick={handleReviewSubmit} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-purple-500/25 transition-all">Submit Review</button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {getQuizForAttempt(reviewingAttempt)?.questions.map((q, idx) => {
                            if (q.type !== 'text') return null;
                            const ans = reviewingAttempt.answers[q.id];

                            return (
                                <div key={q.id} className="bg-white dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 space-y-4 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="mb-2">
                                            <span className="inline-block px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">Question {idx + 1}</span>
                                            <p className="text-gray-900 dark:text-white text-lg font-medium leading-relaxed">{q.question}</p>
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">
                                            {q.points || 1} pts
                                        </div>
                                    </div>

                                    {/* User Answer */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Student Answer</label>
                                        <div className="bg-gray-50 dark:bg-[#0a0a0b] p-5 rounded-2xl text-gray-900 dark:text-gray-200 font-mono text-sm border border-gray-200 dark:border-white/10 shadow-inner">
                                            {(() => {
                                                if (typeof ans === 'object' && ans !== null) {
                                                    return (ans as any).selected || JSON.stringify(ans);
                                                }
                                                return ans || <span className="text-gray-600 italic">No Answer Provided</span>;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Reference / Explanation */}
                                    {q.explanation && (
                                        <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                                            <div className="flex gap-2 text-blue-300 mb-1 pointer-events-none">
                                                <BookOpen className="w-4 h-4 mt-0.5" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Reference / Explanation</span>
                                            </div>
                                            <p className="text-gray-400 text-sm">{q.explanation}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Score Adj.</label>
                                            <input
                                                type="number"
                                                placeholder="+/- Points"
                                                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500/50 transition-colors"
                                                onChange={e => setReviewScores({ ...reviewScores, [q.id]: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Feedback</label>
                                            <input
                                                type="text"
                                                placeholder="Great job, but consider..."
                                                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500/50 transition-colors"
                                                onChange={e => setReviewFeedback({ ...reviewFeedback, [q.id]: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {getQuizForAttempt(reviewingAttempt)?.questions.filter(q => q.type === 'text').length === 0 && (
                            <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                <p className="text-gray-500 font-bold">No text questions found to review manually.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingReviews.map(attempt => (
                        <div key={attempt.attemptId} className="flex justify-between items-center bg-white dark:bg-white/5 p-6 rounded-2xl border border-gray-200 dark:border-white/5 hover:border-purple-500/30 transition-all group shadow-sm">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5 flex items-center justify-center shadow-md overflow-hidden">
                                        <div className="w-full h-full bg-white dark:bg-[#13141f] rounded-full overflow-hidden flex items-center justify-center">
                                            {(() => {
                                                const student = users?.find(u => u.userId === attempt.userId);
                                                return student?.avatar ? (
                                                    <Avatar config={student.avatar} size="sm" className="w-full h-full" />
                                                ) : (
                                                    <span className="font-bold text-gray-700 dark:text-gray-200 text-xs">{attempt.userName.charAt(0)}</span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="text-gray-900 dark:text-white font-bold text-lg group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{attempt.userName}</div>
                                </div>
                                <div className="text-gray-500 text-sm ml-11">{attempt.quizTitle} • {new Date(attempt.completedAt).toLocaleDateString()}</div>
                            </div>
                            <button onClick={() => setReviewingAttempt(attempt)} className="px-6 py-3 bg-purple-50 dark:bg-white/5 text-purple-600 dark:text-purple-400 rounded-xl font-bold hover:bg-purple-600 hover:text-white transition-all shadow-lg">Review</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewManagement;
