import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, MoreVertical, Download, Upload, Plus, Edit2, Trash2, BookOpen, X } from 'lucide-react';
import type { Tournament, Quiz, UserData, BadgeDefinition } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { staticItems } from '../../lib/shopItems';

interface TournamentManagementProps {
    currentUser: UserData;
    quizzes: Quiz[];
    onRefresh: () => void;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const TournamentManagement: React.FC<TournamentManagementProps> = ({ currentUser, quizzes, onRefresh, onNotification }) => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [editingTournament, setEditingTournament] = useState<Partial<Tournament> | null>(null);
    const [showTournamentMenu, setShowTournamentMenu] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string } | null>(null);
    const [badges, setBadges] = useState<BadgeDefinition[]>([]);

    const tournamentUploadRef = useRef<HTMLInputElement>(null);
    const tournamentMenuRef = useRef<HTMLDivElement>(null);
    const quizUploadRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    // Click outside handler for menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tournamentMenuRef.current && !tournamentMenuRef.current.contains(event.target as Node)) setShowTournamentMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getTournaments();
            setTournaments(data);
            const badgesData = await api.getBadgeNodes();
            setBadges(badgesData);
        } catch (err) {
            console.error('Failed to load tournaments', err);
            onNotification('error', 'Failed to load tournaments');
        }
    }

    const handleDownloadExampleJson = () => {
        const exampleData = { name: "Example Tournament", description: "Tournament description", startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86400000).toISOString(), status: "scheduled", quizIds: [] };
        const dataStr = JSON.stringify(exampleData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tournament-example.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleEntityUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                setEditingTournament(prev => ({ ...prev, ...json }));
                onNotification('success', 'JSON uploaded successfully');
            } catch (error) {
                console.error('Upload error', error);
                onNotification('error', 'Failed to process file');
            }
            if (event.target) event.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleQuizUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);

                const quizData: Partial<Quiz> = {
                    ...json,
                    id: json.id || `tourn-quiz-${Date.now()}`,
                    category: 'Tournament',
                    isTournamentOnly: true
                };

                const newQuiz = await api.createQuiz(quizData, currentUser.userId);

                setEditingTournament(prev => prev ? ({
                    ...prev,
                    quizIds: [...(prev.quizIds || []), newQuiz.id]
                }) : null);

                // Notify parent to refresh quizzes list so names resolve
                onRefresh();

                onNotification('success', 'Tournament Quiz Created & Linked');
            } catch (error) {
                console.error('Upload error', error);
                onNotification('error', 'Failed to process quiz file');
            }
            if (quizUploadRef.current) quizUploadRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleSaveTournament = async () => {
        if (!editingTournament) return;
        try {
            if (editingTournament.tournamentId) {
                await api.updateTournament(editingTournament.tournamentId, editingTournament, currentUser.userId);
                setTournaments(prev => prev.map(t => t.tournamentId === editingTournament.tournamentId ? (editingTournament as Tournament) : t));
                onNotification('success', 'Tournament updated');
            } else {
                const created = await api.createTournament(editingTournament, currentUser.userId);
                setTournaments(prev => [...prev, created]);
                onNotification('success', 'Tournament created');
            }
            setEditingTournament(null);
        } catch (error) {
            console.error('Save tournament error:', error);
            onNotification('error', 'Failed to save tournament');
        }
    };



    const confirmDeleteTournament = async () => {
        if (!deleteConfirmation) return;
        try {
            await api.deleteTournament(deleteConfirmation.id, currentUser.userId);
            setTournaments(prev => prev.filter(t => t.tournamentId !== deleteConfirmation.id));
            onNotification('success', 'Tournament deleted');
        } catch (error) {
            console.error('Delete tournament error:', error);
            onNotification('error', 'Failed to delete tournament');
        } finally {
            setDeleteConfirmation(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Tournaments</h2>
                <div className="flex gap-3">
                    <div className="relative" ref={tournamentMenuRef}>
                        <button
                            onClick={() => setShowTournamentMenu(!showTournamentMenu)}
                            className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-xl font-bold transition-all border border-gray-200 dark:border-gray-700"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {showTournamentMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                <button
                                    onClick={() => { handleDownloadExampleJson(); setShowTournamentMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm"
                                >
                                    <Download className="w-4 h-4 text-purple-500" />
                                    Sample JSON
                                </button>
                                <button
                                    onClick={() => { tournamentUploadRef.current?.click(); setShowTournamentMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm border-t border-gray-100 dark:border-gray-700"
                                >
                                    <Upload className="w-4 h-4 text-indigo-500" />
                                    Upload JSON
                                </button>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={tournamentUploadRef} onChange={handleEntityUpload} accept=".json" className="hidden" />
                    <button onClick={() => setEditingTournament({ name: '', description: '', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86400000).toISOString(), status: 'scheduled' })} className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/25">
                        <Plus className="w-5 h-5" />
                        Create Tournament
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map((t) => (
                    <div key={t.tournamentId} className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/5 rounded-[2rem] p-6 group hover:border-yellow-500/30 transition-all shadow-sm">
                        <div className="mb-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1">{t.name}</h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.status === 'live' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`}>{t.status.toUpperCase()}</span>
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-sm">
                                {new Date(t.startsAt).toLocaleDateString()} - {new Date(t.endsAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingTournament(t)} className="flex-1 px-4 py-2 bg-blue-100 dark:bg-white/5 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-white/10 font-bold text-sm flex items-center justify-center gap-2">
                                <Edit2 className="w-4 h-4" /> Edit
                            </button>
                            <button onClick={() => setDeleteConfirmation({ isOpen: true, id: t.tournamentId })} className="p-2 bg-red-100 dark:bg-white/5 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-white/10">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {tournaments.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <Trophy className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 font-bold mb-4">No tournaments found</p>
                    </div>
                )}
            </div>

            {/* Edit Tournament Modal */}
            {editingTournament && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">{editingTournament.tournamentId ? 'Edit Tournament' : 'Create Tournament'}</h2>
                        <div className="space-y-4">
                            <input placeholder="Tournament Name" value={editingTournament.name || ''} onChange={e => setEditingTournament({ ...editingTournament, name: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            <textarea placeholder="Description" value={editingTournament.description || ''} onChange={e => setEditingTournament({ ...editingTournament, description: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Start Date</label>
                                    <input type="datetime-local" value={editingTournament.startsAt ? new Date(editingTournament.startsAt).toISOString().slice(0, 16) : ''} onChange={e => setEditingTournament({ ...editingTournament, startsAt: new Date(e.target.value).toISOString() })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">End Date</label>
                                    <input type="datetime-local" value={editingTournament.endsAt ? new Date(editingTournament.endsAt).toISOString().slice(0, 16) : ''} onChange={e => setEditingTournament({ ...editingTournament, endsAt: new Date(e.target.value).toISOString() })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                </div>
                            </div>
                            <select value={editingTournament.status || 'scheduled'} onChange={e => setEditingTournament({ ...editingTournament, status: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                <option value="scheduled">Scheduled</option>
                                <option value="live">Live</option>
                                <option value="completed">Completed</option>
                            </select>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Reward Badge (Optional)</label>
                                    <select
                                        value={editingTournament.rewardBadgeId || ''}
                                        onChange={e => setEditingTournament({ ...editingTournament, rewardBadgeId: e.target.value || undefined })}
                                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    >
                                        <option value="">None</option>
                                        {badges.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Reward Item (Optional)</label>
                                    <select
                                        value={editingTournament.rewardItemId || ''}
                                        onChange={e => setEditingTournament({ ...editingTournament, rewardItemId: e.target.value || undefined })}
                                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    >
                                        <option value="">None</option>
                                        {staticItems.map(item => (
                                            <option key={item.itemId} value={item.itemId}>{item.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tournament Quizzes</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDownloadExampleJson()} className="px-3 py-2 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-gray-200 dark:border-white/5">
                                            <Download className="w-4 h-4" /> Sample
                                        </button>
                                        <input
                                            type="file"
                                            ref={quizUploadRef}
                                            onChange={handleQuizUpload}
                                            accept=".json"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => quizUploadRef.current?.click()}
                                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-lg transition-all"
                                        >
                                            <Upload className="w-4 h-4" /> Upload Quiz JSON
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    {(editingTournament.quizIds || []).map(quizId => {
                                        const quiz = quizzes.find(q => q.id === quizId);
                                        return (
                                            <div key={quizId} className="flex justify-between items-center bg-gray-50 dark:bg-[#0a0a0b] p-4 rounded-xl border border-gray-200 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                                                        <BookOpen className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-900 dark:text-white font-bold text-sm">{quiz ? quiz.title : quizId}</div>
                                                        <div className="text-gray-500 text-xs">{quiz ? `${quiz.questions?.length || 0} Questions` : 'Loading...'}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setEditingTournament({
                                                        ...editingTournament,
                                                        quizIds: editingTournament.quizIds?.filter(id => id !== quizId)
                                                    })}
                                                    className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {(editingTournament.quizIds || []).length === 0 && (
                                        <div className="text-center py-6 text-gray-500 text-sm italic">
                                            No quizzes added yet. Upload a JSON file to add a tournament quiz.
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setEditingTournament(null)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button onClick={handleSaveTournament} className="flex-1 py-3 bg-yellow-600 text-white rounded-xl font-bold">{editingTournament.tournamentId ? 'Save Changes' : 'Create Tournament'}</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Delete Confirmation Modal */}
            {deleteConfirmation && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20">
                            <Trash2 className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
                            Are you sure you want to delete this tournament? This action cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteTournament}
                                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TournamentManagement;
