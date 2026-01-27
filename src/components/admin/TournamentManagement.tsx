import React, { useState, useEffect, useRef } from 'react';
import { Trophy, MoreVertical, Download, Upload, Plus, Edit2, Trash2, BookOpen, X } from 'lucide-react';
import Modal from '../common/Modal';
import type { Tournament, Quiz, UserData, BadgeDefinition } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { staticItems } from '../../constants/shopItems';

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
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 rounded-2xl">
                        <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Tournaments</h2>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Global competitive events</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative" ref={tournamentMenuRef}>
                        <button
                            onClick={() => setShowTournamentMenu(!showTournamentMenu)}
                            className="p-3 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-500 rounded-2xl transition-all border border-white/20 dark:border-white/5 shadow-sm"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {showTournamentMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => { handleDownloadExampleJson(); setShowTournamentMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-500/10 text-gray-700 dark:text-gray-200 transition-colors font-bold text-xs uppercase tracking-widest"
                                >
                                    <Download className="w-4 h-4 text-purple-500" />
                                    Sample JSON
                                </button>
                                <button
                                    onClick={() => { tournamentUploadRef.current?.click(); setShowTournamentMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-500/10 text-gray-700 dark:text-gray-200 transition-colors font-bold text-xs uppercase tracking-widest border-t border-white/10"
                                >
                                    <Upload className="w-4 h-4 text-indigo-500" />
                                    Upload JSON
                                </button>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={tournamentUploadRef} onChange={handleEntityUpload} accept=".json" className="hidden" />
                    <button
                        onClick={() => setEditingTournament({ name: '', description: '', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86400000).toISOString(), status: 'scheduled' })}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all transform hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" /> Create Tournament
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map((t) => (
                    <div key={t.tournamentId} className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/20 dark:border-white/5 hover:border-amber-500/30 transition-all group shadow-sm hover:shadow-xl relative overflow-hidden flex flex-col h-full">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="space-y-1">
                                <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-lg leading-tight group-hover:text-amber-600 transition-colors">{t.name}</h3>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${t.status === 'live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-gray-400'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{t.status}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 translate-x-2 -translate-y-2">
                                <button onClick={() => setEditingTournament(t)} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all hover:scale-110">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteConfirmation({ isOpen: true, id: t.tournamentId })} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold leading-relaxed mb-6 line-clamp-2 uppercase tracking-wide opacity-80">{t.description}</p>

                        <div className="mt-auto space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-black/20 rounded-2xl border border-white/10 font-black text-[10px] uppercase tracking-widest text-gray-400">
                                <BookOpen className="w-4 h-4 text-amber-500" />
                                <span>{t.quizIds?.length || 0} Scheduled Quizzes</span>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400 pt-2 border-t border-white/5">
                                <span>{new Date(t.startsAt).toLocaleDateString()}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
                                <span>{new Date(t.endsAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {tournaments.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white/40 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/10">
                        <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4 animate-pulse" />
                        <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No active tournaments</p>
                    </div>
                )}
            </div>

            {/* Edit Tournament Modal */}
            {/* Edit Tournament Modal */}
            <Modal
                isOpen={!!editingTournament}
                onClose={() => setEditingTournament(null)}
                title={editingTournament?.tournamentId ? 'Edit Event' : 'New Tournament'}
                description="Configure competition parameters"
                maxWidth="max-w-3xl"
                icon={<Trophy className="w-6 h-6 text-amber-500" />}
                footer={
                    <>
                        <button
                            onClick={() => setEditingTournament(null)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                        >
                            Discard Changes
                        </button>
                        <button
                            onClick={handleSaveTournament}
                            className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-1 transition-all"
                        >
                            {editingTournament?.tournamentId ? 'Save Configuration' : 'Establish Tournament'}
                        </button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-2">Tournament Title</label>
                        <input placeholder="e.g. Winter Grand Prix" value={editingTournament?.name || ''} onChange={e => editingTournament && setEditingTournament({ ...editingTournament, name: e.target.value })} className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-amber-500/50 rounded-xl px-5 py-4 text-gray-900 dark:text-white font-black outline-none transition-all placeholder:text-gray-400" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-2">Event Brief</label>
                        <textarea placeholder="Describe the challenges and goals..." value={editingTournament?.description || ''} onChange={e => editingTournament && setEditingTournament({ ...editingTournament, description: e.target.value })} className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-amber-500/50 rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold outline-none transition-all min-h-[80px] resize-none" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-2">Start Time</label>
                            <input type="datetime-local" value={editingTournament?.startsAt ? new Date(editingTournament.startsAt).toISOString().slice(0, 16) : ''} onChange={e => editingTournament && setEditingTournament({ ...editingTournament, startsAt: new Date(e.target.value).toISOString() })} className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-amber-500/50 rounded-xl px-5 py-3 text-gray-900 dark:text-white font-black outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-2">End Time</label>
                            <input type="datetime-local" value={editingTournament?.endsAt ? new Date(editingTournament.endsAt).toISOString().slice(0, 16) : ''} onChange={e => editingTournament && setEditingTournament({ ...editingTournament, endsAt: new Date(e.target.value).toISOString() })} className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-amber-500/50 rounded-xl px-5 py-3 text-gray-900 dark:text-white font-black outline-none transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-2">Status</label>
                            <select value={editingTournament?.status || 'scheduled'} onChange={e => editingTournament && setEditingTournament({ ...editingTournament, status: e.target.value })} className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-amber-500/50 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white font-black outline-none transition-all appearance-none cursor-pointer">
                                <option value="scheduled">Scheduled</option>
                                <option value="live">Live Now</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-2">Badge Reward</label>
                            <select
                                value={editingTournament?.rewardBadgeId || ''}
                                onChange={e => editingTournament && setEditingTournament({ ...editingTournament, rewardBadgeId: e.target.value || undefined })}
                                className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500/50 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white font-black outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">No Badge Reward</option>
                                {badges.map(b => (
                                    <option key={b.id} value={b.id}>🏆 {b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-2">Item Reward</label>
                            <select
                                value={editingTournament?.rewardItemId || ''}
                                onChange={e => editingTournament && setEditingTournament({ ...editingTournament, rewardItemId: e.target.value || undefined })}
                                className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-amber-500/50 rounded-xl px-5 py-3.5 text-gray-900 dark:text-white font-black outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">No Item Reward</option>
                                {staticItems.map(item => (
                                    <option key={item.itemId} value={item.itemId}>📦 {item.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-white/10">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Tournament Quizzes</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Specialized quizzes for this event</p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <input type="file" ref={quizUploadRef} onChange={handleQuizUpload} accept=".json" className="hidden" />
                                <button
                                    onClick={() => quizUploadRef.current?.click()}
                                    className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                                >
                                    <Upload className="w-3 h-3" /> Upload JSON
                                </button>
                                <button onClick={() => handleDownloadExampleJson()} className="p-2.5 bg-gray-100 dark:bg-white/5 text-gray-400 rounded-xl hover:text-indigo-500 transition-colors">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {(editingTournament?.quizIds || []).map(quizId => {
                                const quiz = quizzes.find(q => q.id === quizId);
                                return (
                                    <div key={quizId} className="flex justify-between items-center bg-gray-50/50 dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/5 group/quiz transition-all hover:border-indigo-500/20">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-tight">{quiz ? quiz.title : quizId}</div>
                                                <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{quiz ? `${quiz.questions?.length || 0} Questions` : 'Connecting...'}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => editingTournament && setEditingTournament({
                                                ...editingTournament,
                                                quizIds: editingTournament.quizIds?.filter(id => id !== quizId)
                                            })}
                                            className="p-2 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-500 transition-all opacity-0 group-hover/quiz:opacity-100"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                            {(editingTournament?.quizIds || []).length === 0 && (
                                <div className="text-center py-10 bg-gray-50/30 dark:bg-black/10 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/5">
                                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">No quizzes annexed yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                title="Confirm Deletion"
                description="Are you sure you want to permanently abolish this tournament? This action is irreversible."
                icon={<Trash2 className="w-6 h-6 text-red-500" />}
                maxWidth="max-w-md"
                footer={
                    <>
                        <button
                            onClick={() => setDeleteConfirmation(null)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors hover:bg-gray-200 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteTournament}
                            className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5 hover:bg-red-700"
                        >
                            Abolish
                        </button>
                    </>
                }
            >
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-red-500 text-sm font-bold text-center">
                        ⚠️ This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default TournamentManagement;
