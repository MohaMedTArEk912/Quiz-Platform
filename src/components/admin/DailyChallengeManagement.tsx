import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import type { UserData, Quiz, BadgeDefinition } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { staticItems } from '../../constants/shopItems';

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
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Daily Challenges</h2>
                <button onClick={() => setEditingChallenge({ date: new Date().toISOString(), title: '', description: '', rewardCoins: 100, rewardXP: 50, criteria: { type: 'complete_quiz', threshold: 1 }, _isNew: true })} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Schedule New
                </button>
            </div>

            <div className={`rounded-[2rem] overflow-hidden ${dailyChallenges.length > 0 ? 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-xl' : ''}`}>
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-white/5">
                        <tr className="border-b border-gray-200 dark:border-white/5 text-gray-500 text-xs font-bold uppercase tracking-widest">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Title</th>
                            <th className="px-6 py-4">Criteria</th>
                            <th className="px-6 py-4">Rewards</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {dailyChallenges.map((challenge) => (
                            <tr key={challenge._id || challenge.date} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                    {new Date(challenge.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900 dark:text-white">{challenge.title}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{challenge.description}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase">
                                        {challenge.criteria?.type?.replace('_', ' ') || 'Complete'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <span className="text-yellow-600 dark:text-yellow-500 font-bold text-xs">{challenge.rewardCoins} Coins</span>
                                        <span className="text-blue-600 dark:text-blue-500 font-bold text-xs">{challenge.rewardXP} XP</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => setEditingChallenge(challenge)}
                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg"
                                            title="Edit Challenge"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setConfirmAction({ type: 'delete', item: challenge })}
                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg"
                                            title="Delete Challenge"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setConfirmAction({ type: 'reschedule', item: challenge })}
                                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg"
                                            title="Reschedule to Today"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {dailyChallenges.length === 0 && (
                            <tr>
                                <td colSpan={5}>
                                    <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl m-4">
                                        <Zap className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-500 font-bold">No daily challenges found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Confirmation Modal */}
            {confirmAction && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Confirm Action</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {confirmAction.type === 'delete'
                                ? 'Are you sure you want to delete this challenge? This action cannot be undone.'
                                : 'Move this challenge to today? This will update its date to the current date.'}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeAction}
                                className={`flex-1 py-3 text-white rounded-xl font-bold ${confirmAction.type === 'delete' ? 'bg-red-600' : 'bg-green-600'}`}
                            >
                                {confirmAction.type === 'delete' ? 'Delete' : 'Reschedule'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Challenge Modal */}
            {editingChallenge && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Edit Daily Challenge</h2>
                        <div className="space-y-4">
                            <input type="date" value={new Date(editingChallenge.date).toISOString().split('T')[0]} onChange={e => setEditingChallenge({ ...editingChallenge, date: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            <input placeholder="Title" value={editingChallenge.title} onChange={e => setEditingChallenge({ ...editingChallenge, title: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            <textarea placeholder="Description" value={editingChallenge.description} onChange={e => setEditingChallenge({ ...editingChallenge, description: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    value={editingChallenge.quizId || ''}
                                    onChange={e => setEditingChallenge({ ...editingChallenge, quizId: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                >
                                    <option value="">No Linked Quiz</option>
                                    {quizzes.filter(q => !q.isTournamentOnly).map(q => (
                                        <option key={q.id} value={q.id}>{q.title}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <select value={editingChallenge.criteria?.type || 'complete_quiz'} onChange={e => setEditingChallenge({ ...editingChallenge, criteria: { ...(editingChallenge.criteria || {}), type: e.target.value } })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                        <option value="complete_quiz">Complete Quiz</option>
                                        <option value="min_score">Min Score</option>
                                        <option value="speed_run">Speed Run</option>
                                    </select>
                                    <input type="number" placeholder="Threshold" value={editingChallenge.criteria?.threshold || 1} onChange={e => setEditingChallenge({ ...editingChallenge, criteria: { ...(editingChallenge.criteria || {}), threshold: parseInt(e.target.value) } })} className="w-20 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input type="number" placeholder="Coins" value={editingChallenge.rewardCoins} onChange={e => setEditingChallenge({ ...editingChallenge, rewardCoins: parseInt(e.target.value) })} className="w-1/2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                <input type="number" placeholder="XP" value={editingChallenge.rewardXP} onChange={e => setEditingChallenge({ ...editingChallenge, rewardXP: parseInt(e.target.value) })} className="w-1/2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Reward Badge (Optional)</label>
                                    <select
                                        value={editingChallenge.rewardBadgeId || ''}
                                        onChange={e => setEditingChallenge({ ...editingChallenge, rewardBadgeId: e.target.value || undefined })}
                                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    >
                                        <option value="">None</option>
                                        {badges.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Reward Item (Optional)</label>
                                    <select
                                        value={editingChallenge.rewardItemId || ''}
                                        onChange={e => setEditingChallenge({ ...editingChallenge, rewardItemId: e.target.value || undefined })}
                                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    >
                                        <option value="">None</option>
                                        {staticItems.map(item => (
                                            <option key={item.itemId} value={item.itemId}>{item.name} ({item.price} pts)</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setEditingChallenge(null)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button onClick={handleSaveChallenge} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">Save Challenge</button>
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
