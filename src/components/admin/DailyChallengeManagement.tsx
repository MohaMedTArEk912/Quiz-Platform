import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import type { UserData, Quiz, BadgeDefinition } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface DailyChallengeManagementProps {
    currentUser: UserData;
    quizzes: Quiz[];
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const DailyChallengeManagement: React.FC<DailyChallengeManagementProps> = ({ currentUser, quizzes, onNotification }) => {
    const [dailyChallenges, setDailyChallenges] = useState<any[]>([]);
    const [editingChallenge, setEditingChallenge] = useState<any | null>(null);
    const [badges, setBadges] = useState<BadgeDefinition[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'reschedule', item: any } | null>(null);

    useEffect(() => {
        loadData();
    }, [currentUser.userId]);

    const loadData = async () => {
        try {
            const data = await api.getDailyChallengesAdmin(currentUser.userId);
            setDailyChallenges(data);
            const badgesData = await api.getBadgeNodes();
            setBadges(badgesData);
        } catch (err) {
            console.error('Failed to load challenges', err);
            onNotification('error', 'Failed to load daily challenges');
        }
    }

    const handleSaveChallenge = async () => {
        if (!editingChallenge) return;
        try {
            // Check if exists
            const exists = dailyChallenges.some(c => new Date(c.date).toDateString() === new Date(editingChallenge.date).toDateString());

            // Prepare payload without UI-only flags
            const { _isNew, _id, ...payload } = editingChallenge;

            // Just use API logic
            if (!editingChallenge._id) {
                if (exists && editingChallenge._isNew) {
                    // Check strictly if date conflict actually exists in DB or just in list
                    // For now, let backend handle duplicate date error (409)
                }
                await api.createDailyChallenge(payload, currentUser.userId);
                onNotification('success', 'Challenge created');
            } else {
                await api.updateDailyChallenge(editingChallenge._id, payload, currentUser.userId);
                onNotification('success', 'Challenge updated');
            }
            setEditingChallenge(null);
            loadData(); // Refresh to be safe
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
                await api.deleteDailyChallenge(item._id, currentUser.userId);
                setDailyChallenges(prev => prev.filter(c => c._id !== item._id));
                onNotification('success', 'Challenge deleted');
            } else if (type === 'reschedule') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStr = today.toISOString();

                // Update the challenge with new date via ID
                const { _id, ...rest } = item;
                const newPayload = { ...rest, date: todayStr };

                await api.updateDailyChallenge(item._id, newPayload, currentUser.userId);
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
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Schedule recurring daily tasks</p>
                    </div>
                </div>
                <button
                    onClick={() => setEditingChallenge({ date: new Date().toISOString(), title: '', description: '', rewardCoins: 100, rewardXP: 50, criteria: { type: 'complete_quiz', threshold: 1 }, _isNew: true })}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Schedule New
                </button>
            </div>

            {/* Main Content Table */}
            <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-[2rem] border border-white/20 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-black/20 text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
                                <th className="px-6 py-4">Status & Date</th>
                                <th className="px-6 py-4">Challenge Info</th>
                                <th className="px-6 py-4">Criteria</th>
                                <th className="px-6 py-4">Rewards</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {dailyChallenges.map((challenge) => {
                                const isPast = new Date(challenge.date) < new Date(new Date().setHours(0, 0, 0, 0));
                                const isToday = new Date(challenge.date).toDateString() === new Date().toDateString();

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
                                            <div className="font-bold text-gray-900 dark:text-white uppercase text-sm tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{challenge.title}</div>
                                            <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-[180px] font-medium">{challenge.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                {challenge.criteria?.type?.replace('_', ' ') || 'Complete'}
                                            </span>
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
                                                <Zap className="w-10 h-10 text-indigo-500/20" />
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
            {confirmAction && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1e1e2d] border border-white/20 dark:border-white/5 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 text-center">
                        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl mb-6 border ${confirmAction.type === 'delete' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                            {confirmAction.type === 'delete' ? <Trash2 className="h-10 w-10 text-red-500" /> : <RefreshCw className="h-10 w-10 text-emerald-500" />}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Confirm Action</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 font-bold text-sm leading-relaxed">
                            {confirmAction.type === 'delete'
                                ? 'Are you sure you want to permanently delete this daily challenge?'
                                : 'Do you want to move this challenge to today?'}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeAction}
                                className={`flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all transform hover:-translate-y-0.5 ${confirmAction.type === 'delete' ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}
                            >
                                Execute
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Challenge Modal */}
            {editingChallenge && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1e1e2d] border border-white/20 dark:border-white/5 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 sm:p-10 shadow-3xl relative animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-bl-[10rem] pointer-events-none" />

                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Edit Challenge</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Configure daily goal parameters</p>
                            </div>
                            <button onClick={() => setEditingChallenge(null)} className="p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl text-gray-400 dark:text-gray-500 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-6 relative z-10">
                            {/* Date & Title */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Date</label>
                                    <input
                                        type="date"
                                        value={new Date(editingChallenge.date).toISOString().split('T')[0]}
                                        onChange={e => setEditingChallenge({ ...editingChallenge, date: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-purple-500/50 rounded-2xl px-5 py-3.5 text-gray-900 dark:text-white font-black outline-none transition-all"
                                    />
                                </div>
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Challenge Title</label>
                                    <input
                                        placeholder="e.g. History Buff"
                                        value={editingChallenge.title}
                                        onChange={e => setEditingChallenge({ ...editingChallenge, title: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-purple-500/50 rounded-2xl px-5 py-3.5 text-gray-900 dark:text-white font-black outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Description</label>
                                <textarea
                                    placeholder="What should the student achieve today?"
                                    value={editingChallenge.description}
                                    onChange={e => setEditingChallenge({ ...editingChallenge, description: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-purple-500/50 rounded-2xl px-5 py-3.5 text-gray-900 dark:text-white font-bold outline-none transition-all min-h-[100px] resize-none"
                                />
                            </div>

                            {/* Settings Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-gray-50/50 dark:bg-black/20 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-white/5">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-2">Target & Criteria</h4>
                                    <select
                                        value={editingChallenge.quizId || ''}
                                        onChange={e => setEditingChallenge({ ...editingChallenge, quizId: e.target.value })}
                                        className="w-full bg-white dark:bg-[#1e1e2d] border-2 border-transparent focus:border-indigo-500 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all shadow-sm"
                                    >
                                        <option value="">Any Quiz</option>
                                        {quizzes.filter(q => !q.isTournamentOnly).map(q => (
                                            <option key={q.id} value={q.id}>{q.title}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <select
                                            value={editingChallenge.criteria?.type || 'complete_quiz'}
                                            onChange={e => setEditingChallenge({ ...editingChallenge, criteria: { ...(editingChallenge.criteria || {}), type: e.target.value } })}
                                            className="flex-1 bg-white dark:bg-[#1e1e2d] border-2 border-transparent focus:border-indigo-500 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all shadow-sm"
                                        >
                                            <option value="complete_quiz">Complete</option>
                                            <option value="min_score">Min Score</option>
                                            <option value="speed_run">Speed Run</option>
                                        </select>
                                        <input
                                            type="number"
                                            placeholder="Val"
                                            value={editingChallenge.criteria?.threshold || 1}
                                            onChange={e => setEditingChallenge({ ...editingChallenge, criteria: { ...(editingChallenge.criteria || {}), threshold: parseInt(e.target.value) } })}
                                            className="w-20 bg-white dark:bg-[#1e1e2d] border-2 border-transparent focus:border-indigo-500 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-black outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] ml-2">Rewards</h4>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🪙</span>
                                            <input type="number" placeholder="Coins" value={editingChallenge.rewardCoins} onChange={e => setEditingChallenge({ ...editingChallenge, rewardCoins: parseInt(e.target.value) })} className="w-full bg-white dark:bg-[#1e1e2d] border-2 border-transparent focus:border-amber-500 rounded-2xl px-4 py-3 pl-10 text-gray-900 dark:text-white font-black outline-none transition-all shadow-sm" />
                                        </div>
                                        <div className="relative flex-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">⚡</span>
                                            <input type="number" placeholder="XP" value={editingChallenge.rewardXP} onChange={e => setEditingChallenge({ ...editingChallenge, rewardXP: parseInt(e.target.value) })} className="w-full bg-white dark:bg-[#1e1e2d] border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 pl-10 text-gray-900 dark:text-white font-black outline-none transition-all shadow-sm" />
                                        </div>
                                    </div>
                                    <select
                                        value={editingChallenge.rewardBadgeId || ''}
                                        onChange={e => setEditingChallenge({ ...editingChallenge, rewardBadgeId: e.target.value || undefined })}
                                        className="w-full bg-white dark:bg-[#1e1e2d] border-2 border-transparent focus:border-purple-500 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all shadow-sm"
                                    >
                                        <option value="">No Badge Bonus</option>
                                        {badges.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={() => setEditingChallenge(null)}
                                    className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={handleSaveChallenge}
                                    className="flex-[2] py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-1 transition-all"
                                >
                                    Save Challenge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DailyChallengeManagement;
