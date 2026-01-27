import React, { useState, useEffect } from 'react';
import { Zap, Plus, Edit2, Trash2, RefreshCw, Code2, Calendar } from 'lucide-react';
import Modal from '../common/Modal';
import type { UserData, Quiz, BadgeDefinition, CompilerQuestion } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import CompilerQuestionManagement from './CompilerQuestionManagement';

interface DailyChallengeManagementProps {
    currentUser: UserData;
    quizzes: Quiz[]; // Kept for type compatibility but not used for new challenges
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const DailyChallengeManagement: React.FC<DailyChallengeManagementProps> = ({ currentUser, onNotification }) => {
    const [activeTab, setActiveTab] = useState<'schedule' | 'questions'>('schedule');
    const [dailyChallenges, setDailyChallenges] = useState<any[]>([]);
    const [compilerQuestions, setCompilerQuestions] = useState<CompilerQuestion[]>([]);
    const [editingChallenge, setEditingChallenge] = useState<any | null>(null);
    const [badges, setBadges] = useState<BadgeDefinition[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'reschedule', item: any } | null>(null);

    useEffect(() => {
        if (activeTab === 'schedule') {
            loadData();
        }
    }, [currentUser.userId, activeTab]);

    const loadData = async () => {
        try {
            const [challengesData, badgesData, questionsData] = await Promise.all([
                api.getDailyChallengesAdmin(currentUser.userId),
                api.getBadgeNodes(),
                api.getCompilerQuestionsAdmin(currentUser.userId)
            ]);
            setDailyChallenges(challengesData);
            setBadges(badgesData);
            setCompilerQuestions(questionsData);
        } catch (err) {
            console.error('Failed to load data', err);
            onNotification('error', 'Failed to load daily challenges data');
        }
    }

    const handleSaveChallenge = async () => {
        if (!editingChallenge) return;

        if (!editingChallenge.compilerQuestionId) {
            onNotification('error', 'Please select a compiler question');
            return;
        }

        try {
            // Check if exists
            const exists = dailyChallenges.some(c => new Date(c.date).toDateString() === new Date(editingChallenge.date).toDateString());

            // Prepare payload
            const { _isNew, _id, ...payload } = editingChallenge;

            // Clean up old quiz fields if present
            delete payload.quizId;
            delete payload.criteria;

            if (!editingChallenge._id) {
                if (exists && editingChallenge._isNew) {
                    // Let backend handle duplicate date error (409)
                }
                await api.createDailyChallenge(payload, currentUser.userId);
                onNotification('success', 'Challenge scheduled');
            } else {
                await api.updateDailyChallenge(editingChallenge._id, payload, currentUser.userId);
                onNotification('success', 'Challenge updated');
            }
            setEditingChallenge(null);
            loadData();
        } catch (error) {
            console.error('Save challenge error:', error);
            onNotification('error', 'Failed to save challenge');
        }
    };

    const executeAction = async () => {
        if (!confirmAction) return;
        const { type, item } = confirmAction;

        try {
            if (type === 'delete') {
                await api.deleteDailyChallenge(item._id || item.challengeId, currentUser.userId);
                setDailyChallenges(prev => prev.filter(c => (c._id || c.challengeId) !== (item._id || item.challengeId)));
                onNotification('success', 'Challenge deleted');
            } else if (type === 'reschedule') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStr = today.toISOString();

                const id = item._id || item.challengeId;
                const { _id, challengeId, ...rest } = item;
                const newPayload = { ...rest, date: todayStr };

                await api.updateDailyChallenge(id, newPayload, currentUser.userId);
                loadData();
                onNotification('success', 'Challenge rescheduled to today');
            }
        } catch (err: any) {
            console.error(err);
            if (err.message && err.message.includes('exists')) {
                onNotification('error', 'A challenge already exists for today. Delete it first.');
            } else {
                onNotification('error', `Failed to ${type} challenge`);
            }
        } finally {
            setConfirmAction(null);
        }
    };

    if (activeTab === 'questions') {
        return (
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('schedule')}
                        className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        ← Back to Schedule
                    </button>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        Manage Question Bank
                    </h2>
                </div>
                <CompilerQuestionManagement adminId={currentUser.userId} />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 rounded-2xl">
                        <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Daily Challenges</h2>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Schedule recurring coding tasks</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('questions')}
                        className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                        <Code2 className="w-4 h-4" /> Question Bank
                    </button>
                    <button
                        onClick={() => setEditingChallenge({ date: new Date().toISOString(), rewardCoins: 100, rewardXP: 50, _isNew: true })}
                        className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Schedule New
                    </button>
                </div>
            </div>

            {/* Main Content Table */}
            <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-black/20 text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
                                <th className="px-6 py-4">Status & Date</th>
                                <th className="px-6 py-4">Questions</th>
                                <th className="px-6 py-4">Rewards</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {dailyChallenges.map((challenge) => {
                                const isPast = new Date(challenge.date) < new Date(new Date().setHours(0, 0, 0, 0));
                                const isToday = new Date(challenge.date).toDateString() === new Date().toDateString();

                                // Find associated question title if available
                                const question = compilerQuestions.find(q => q.questionId === challenge.compilerQuestionId);

                                return (
                                    <tr key={challenge._id || challenge.date} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : isPast ? 'bg-gray-300' : 'bg-indigo-500'}`} />
                                                <span className={`font-black uppercase text-xs tracking-tight ${isPast ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                    {new Date(challenge.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 dark:text-white uppercase text-sm tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {question?.title || challenge.title || 'Unknown Question'}
                                            </div>
                                            <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[180px] font-medium">
                                                {question?.category || 'General'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <div className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-black flex items-center gap-1">
                                                    <span>🪙</span> {challenge.rewardCoins}
                                                </div>
                                                <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black flex items-center gap-1">
                                                    <span>⚡</span> {challenge.rewardXP}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => setEditingChallenge(challenge)}
                                                    className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all hover:scale-110"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'reschedule', item: challenge })}
                                                    className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all hover:scale-110"
                                                    title="Reschedule to Today"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'delete', item: challenge })}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {dailyChallenges.length === 0 && (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="py-20 text-center">
                                            <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Calendar className="w-10 h-10 text-indigo-500/20" />
                                            </div>
                                            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No active challenges found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Confirmation Modal */}
            {/* Confirmation Modal */}
            <Modal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                title="Confirm Action"
                description={confirmAction?.type === 'delete' ? 'Are you sure you want to permanently delete this daily challenge?' : 'Do you want to move this challenge to today?'}
                icon={confirmAction?.type === 'delete' ? <Trash2 className="w-6 h-6 text-red-500" /> : <RefreshCw className="w-6 h-6 text-emerald-500" />}
                maxWidth="max-w-md"
                footer={
                    <>
                        <button
                            onClick={() => setConfirmAction(null)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors hover:bg-gray-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={executeAction}
                            className={`flex-1 py-3 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all transform hover:-translate-y-0.5 ${confirmAction?.type === 'delete' ? 'bg-red-600 shadow-red-500/20 hover:bg-red-700' : 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700'}`}
                        >
                            Execute
                        </button>
                    </>
                }
            >
                <div className={`p-4 rounded-2xl border ${confirmAction?.type === 'delete' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <p className={`text-sm font-bold text-center ${confirmAction?.type === 'delete' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {confirmAction?.type === 'delete' ? '⚠️ This action cannot be undone.' : '📅 This will update the challenge date.'}
                    </p>
                </div>
            </Modal>

            {/* Edit Challenge Modal */}
            {/* Edit Challenge Modal */}
            <Modal
                isOpen={!!editingChallenge}
                onClose={() => setEditingChallenge(null)}
                title="Edit Schedule"
                description="Configure daily goal parameters"
                maxWidth="max-w-2xl"
                icon={<Calendar className="w-6 h-6 text-purple-500" />}
                footer={
                    <>
                        <button
                            onClick={() => setEditingChallenge(null)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        >
                            Discard Changes
                        </button>
                        <button
                            onClick={handleSaveChallenge}
                            className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-1 transition-all"
                        >
                            Save Challenge
                        </button>
                    </>
                }
            >
                <div className="space-y-6">
                    {/* Date */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-2">Date</label>
                            <input
                                type="date"
                                value={editingChallenge ? new Date(editingChallenge.date).toISOString().split('T')[0] : ''}
                                onChange={e => editingChallenge && setEditingChallenge({ ...editingChallenge, date: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500/50 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white font-bold outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Settings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-black/20 rounded-3xl border border-gray-200 dark:border-white/5">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-2">Compiler Question</h4>
                            <select
                                value={editingChallenge?.compilerQuestionId || ''}
                                onChange={e => editingChallenge && setEditingChallenge({ ...editingChallenge, compilerQuestionId: e.target.value })}
                                className="w-full bg-white dark:bg-[#111219] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all cursor-pointer"
                            >
                                <option value="">Select a Question...</option>
                                {compilerQuestions.filter(q => q.isActive).map(q => (
                                    <option key={q.questionId} value={q.questionId}>
                                        {q.title} ({q.difficulty})
                                    </option>
                                ))}
                            </select>

                            <p className="text-xs text-gray-400 dark:text-gray-500 pl-2">
                                Select the coding question for this date. If left empty, the system will auto-select one.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] ml-2">Rewards Override</h4>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🪙</span>
                                    <input
                                        type="number"
                                        placeholder="Coins"
                                        value={editingChallenge?.rewardCoins || 0}
                                        onChange={e => editingChallenge && setEditingChallenge({ ...editingChallenge, rewardCoins: parseInt(e.target.value) })}
                                        className="w-full bg-white dark:bg-[#111219] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-amber-500/50 rounded-xl px-4 py-3 pl-10 text-gray-900 dark:text-white font-black outline-none transition-all"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">⚡</span>
                                    <input
                                        type="number"
                                        placeholder="XP"
                                        value={editingChallenge?.rewardXP || 0}
                                        onChange={e => editingChallenge && setEditingChallenge({ ...editingChallenge, rewardXP: parseInt(e.target.value) })}
                                        className="w-full bg-white dark:bg-[#111219] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/50 rounded-xl px-4 py-3 pl-10 text-gray-900 dark:text-white font-black outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <select
                                value={editingChallenge?.rewardBadgeId || ''}
                                onChange={e => editingChallenge && setEditingChallenge({ ...editingChallenge, rewardBadgeId: e.target.value || undefined })}
                                className="w-full bg-white dark:bg-[#111219] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all cursor-pointer"
                            >
                                <option value="">No Badge Bonus</option>
                                {badges.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DailyChallengeManagement;
