import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Download, Upload, Plus, MoreVertical, Edit2, Trash2, Code, ArrowLeft } from 'lucide-react';
import type { StudyCard, UserData } from '../../types/index';
import { api } from '../../lib/api';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../ConfirmDialog';

interface StudyManagementProps {
    currentUser: UserData;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const StudyCardManagement: React.FC<StudyManagementProps> = ({ currentUser, onNotification }) => {
    const { confirm, confirmState, handleCancel } = useConfirm();
    const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
    const [editingStudyCard, setEditingStudyCard] = useState<Partial<StudyCard> | null>(null);
    const [studyCategoryFilter, setStudyCategoryFilter] = useState<string>('all');
    const [studyLanguageFilter, setStudyLanguageFilter] = useState<string>('all');
    const [showStudyMenu, setShowStudyMenu] = useState(false);

    // New State for Stack Navigation
    const [activeStack, setActiveStack] = useState<string | null>(null);
    const [renameState, setRenameState] = useState({
        isOpen: false,
        oldName: '',
        newName: ''
    });

    // Derived Logic
    const filteredCards = studyCards.filter(card =>
        (studyLanguageFilter === 'all' || card.language === studyLanguageFilter) &&
        (studyCategoryFilter === 'all' || (card.category || 'Uncategorized') === studyCategoryFilter)
    );
    const stacks = Array.from(new Set(filteredCards.map(c => c.category || 'Uncategorized')));

    const allCategories = Array.from(new Set(studyCards.map(c => c.category || 'Uncategorized')));

    const cardUploadRef = useRef<HTMLInputElement>(null);
    const studyMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getStudyCards();
            setStudyCards(data);
        } catch (err) {
            console.error('Failed to load study cards', err);
            onNotification('error', 'Failed to load study cards');
        }
    };

    // Click outside handler for menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (studyMenuRef.current && !studyMenuRef.current.contains(event.target as Node)) setShowStudyMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDownloadExampleJson = () => {
        const exampleData = { title: "Study Card", content: "Card content", category: "General", language: "JavaScript", tags: ["tag1"] };
        const dataStr = JSON.stringify(exampleData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'card-example.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Stack Operation Handlers
    const handleDeleteStack = async (stackName: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent entering the stack

        const confirmed = await confirm({
            title: 'Delete Entire Stack',
            message: `Are you sure you want to delete the "${stackName}" stack? This will permanently delete ALL cards within it.`,
            confirmText: 'Delete Stack',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            // We need to delete all cards with this category.
            // Ideally the backend has a bulk delete, but for now we iterate or assume backend support.
            // Let's implement a backend call for this if possible, or loop.
            // Since we don't have a specific "delete stack" endpoint in the visible API yet, let's filter and delete one by one or add a new API method.
            // Checking api.ts... I recall seeing deleteStudyStack logic actually!
            if (api.deleteStudyStack) {
                await api.deleteStudyStack(stackName, currentUser.userId);
                setStudyCards(prev => prev.filter(c => c.category !== stackName));
                onNotification('success', `Stack "${stackName}" deleted`);
            } else {
                // Fallback: Delete locally filtered cards
                const cardsToDelete = studyCards.filter(c => c.category === stackName);
                for (const card of cardsToDelete) {
                    await api.deleteStudyCard(card.id, currentUser.userId);
                }
                setStudyCards(prev => prev.filter(c => c.category !== stackName));
                onNotification('success', `Stack "${stackName}" deleted`);
            }
        } catch (error) {
            console.error('Failed to delete stack', error);
            onNotification('error', 'Failed to delete stack');
        }
    };

    const handleRenameStackClick = (stackName: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setRenameState({
            isOpen: true,
            oldName: stackName,
            newName: stackName
        });
    };

    const submitRename = async () => {
        const { oldName, newName } = renameState;
        if (!newName || newName === oldName) {
            setRenameState({ ...renameState, isOpen: false });
            return;
        }

        try {
            if (api.updateStudyStack) {
                await api.updateStudyStack(oldName, newName, currentUser.userId);
                setStudyCards(prev => prev.map(c => c.category === oldName ? { ...c, category: newName } : c));
                onNotification('success', 'Stack renamed');
            } else {
                // Fallback loop update
                const cardsToUpdate = studyCards.filter(c => c.category === oldName);
                for (const card of cardsToUpdate) {
                    await api.updateStudyCard(card.id, { ...card, category: newName }, currentUser.userId);
                }
                setStudyCards(prev => prev.map(c => c.category === oldName ? { ...c, category: newName } : c));
                onNotification('success', 'Stack renamed');
            }
        } catch (error) {
            console.error('Rename stack error', error);
            onNotification('error', 'Failed to rename stack');
        } finally {
            setRenameState({ isOpen: false, oldName: '', newName: '' });
        }
    };

    const handleEntityUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);

                if (Array.isArray(json)) {
                    // Bulk Import
                    let successCount = 0;
                    const importCategory = file.name.replace(/\.[^/.]+$/, "");

                    for (const cardData of json) {
                        const newCard = {
                            title: cardData.title || 'Untitled Card',
                            content: cardData.content || cardData.back || '',
                            category: cardData.category || importCategory,
                            tags: Array.isArray(cardData.tags) ? cardData.tags : [],
                            language: cardData.language || 'General'
                        };
                        await api.createStudyCard(newCard, currentUser.userId);
                        successCount++;
                    }
                    onNotification('success', `Successfully imported ${successCount} cards`);
                    loadData();
                } else {
                    // Single Card - Load into Editor
                    setEditingStudyCard(prev => ({ ...prev, ...json }));
                    onNotification('success', 'JSON loaded into editor');
                }
            } catch (error) {
                console.error('Upload error', error);
                onNotification('error', 'Failed to process file');
            }
            if (event.target) event.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleSaveStudyCard = async () => {
        if (!editingStudyCard) return;
        try {
            if (editingStudyCard.id) {
                await api.updateStudyCard(editingStudyCard.id, editingStudyCard, currentUser.userId);
                setStudyCards(prev => prev.map(c => c.id === editingStudyCard.id ? { ...c, ...editingStudyCard } as StudyCard : c));
                onNotification('success', 'Study card updated');
            } else {
                const created = await api.createStudyCard(editingStudyCard, currentUser.userId);
                setStudyCards(prev => [created, ...prev]);
                onNotification('success', 'Study card created');
            }
            setEditingStudyCard(null);
        } catch (error) {
            console.error('Save study card error:', error);
            onNotification('error', 'Failed to save study card');
        }
    };

    const handleDeleteStudyCard = async (id: string) => {
        const confirmed = await confirm({
            title: 'Delete Study Card',
            message: 'Are you sure you want to delete this study card? This action cannot be undone.',
            confirmText: 'Delete',
            type: 'danger'
        });
        if (!confirmed) return;
        try {
            await api.deleteStudyCard(id, currentUser.userId);
            setStudyCards(prev => prev.filter(c => c.id !== id));
            onNotification('success', 'Study card deleted');
        } catch (error) {
            console.error('Delete study card error:', error);
            onNotification('error', 'Failed to delete study card');
        }
    };

    return (
        <div>
            <div className="flex justify-between mb-8">
                <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Study Cards</h3>

                    {/* Category Filter */}
                    <select
                        value={studyCategoryFilter}
                        onChange={e => setStudyCategoryFilter(e.target.value)}
                        className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-200 font-semibold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                    >
                        <option value="all">All Categories</option>
                        {allCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Language Filter */}
                    <select
                        value={studyLanguageFilter}
                        onChange={e => setStudyLanguageFilter(e.target.value)}
                        className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-200 font-semibold focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                    >
                        <option value="all">All Languages</option>
                        {Array.from(new Set(studyCards.map(c => c.language || '').filter(Boolean))).map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-3">
                    <div className="relative" ref={studyMenuRef}>
                        <button
                            onClick={() => setShowStudyMenu(!showStudyMenu)}
                            className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all border border-gray-200 dark:border-gray-700"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {showStudyMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                <button
                                    onClick={() => { handleDownloadExampleJson(); setShowStudyMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm"
                                >
                                    <Download className="w-4 h-4 text-purple-500" />
                                    Sample JSON
                                </button>
                                <button
                                    onClick={() => { cardUploadRef.current?.click(); setShowStudyMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm border-t border-gray-100 dark:border-gray-700"
                                >
                                    <Upload className="w-4 h-4 text-indigo-500" />
                                    Upload JSON
                                </button>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={cardUploadRef} onChange={handleEntityUpload} accept=".json" className="hidden" />
                    <button onClick={() => setEditingStudyCard({ title: '', content: '', category: activeStack || 'General', language: 'JavaScript' })} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Add Card
                    </button>
                </div>
            </div>
            {/* Stacks vs Cards View Logic */}
            {!activeStack ? (
                /* STACKS VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stacks.map(stack => {
                        const stackCards = filteredCards.filter(c => (c.category || 'Uncategorized') === stack);
                        const language = stackCards[0]?.language || 'General';

                        return (
                            <div
                                key={stack}
                                onClick={() => setActiveStack(stack)}
                                className="bg-white dark:bg-[#13141f] p-6 rounded-3xl border border-gray-200 dark:border-white/5 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <BookOpen className="w-24 h-24 text-purple-500 transform rotate-12 translate-x-4 -translate-y-4" />
                                </div>

                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>

                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {stack}
                                    </h3>

                                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        <span className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                                            {stackCards.length} Cards
                                        </span>
                                        <span className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                                            {language}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                        <button
                                            onClick={(e) => handleRenameStackClick(stack, e)}
                                            className="p-2 bg-white/90 dark:bg-black/60 text-blue-500 hover:text-blue-600 rounded-lg shadow-sm hover:shadow-md transition-all backdrop-blur-sm"
                                            title="Rename Stack"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteStack(stack, e)}
                                            className="p-2 bg-white/90 dark:bg-black/60 text-red-500 hover:text-red-600 rounded-lg shadow-sm hover:shadow-md transition-all backdrop-blur-sm"
                                            title="Delete Stack"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {stacks.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 font-bold">No stacks found. Create a card to get started.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* CARDS IN STACK VIEW */
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <button
                            onClick={() => setActiveStack(null)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{activeStack}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Managing cards in this stack</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCards
                            .filter(c => (c.category || 'Uncategorized') === activeStack)
                            .map(card => (
                                <div key={card.id} className="bg-white dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-white/5 hover:border-purple-500/30 transition-all group shadow-sm flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                                                <Code className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1" title={card.title}>{card.title}</h3>
                                                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">{card.language}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-[#0a0a0b] p-4 rounded-xl border border-gray-200 dark:border-white/5 font-mono text-xs text-gray-600 dark:text-gray-300 mb-4 overflow-hidden relative h-32 flex-1">
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50 dark:to-[#0a0a0b] pointer-events-none" />
                                        <pre className="whitespace-pre-wrap">{card.content}</pre>
                                    </div>
                                    <div className="flex gap-2 mt-auto">
                                        <button onClick={() => setEditingStudyCard(card)} className="flex-1 py-2 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><Edit2 className="w-4 h-4" /> Edit</button>
                                        <button onClick={() => handleDeleteStudyCard(card.id)} className="flex-1 py-2 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {renameState.isOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                            <Edit2 className="w-6 h-6" />
                        </div>

                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                            Rename Stack
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">
                            Enter a new name for the <span className="text-purple-600 dark:text-purple-400 font-bold">"{renameState.oldName}"</span> stack.
                        </p>

                        <input
                            value={renameState.newName}
                            onChange={(e) => setRenameState(prev => ({ ...prev, newName: e.target.value }))}
                            className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-bold mb-6"
                            placeholder="Stack Name"
                            autoFocus
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRenameState(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRename}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all transform active:scale-95"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Study Card Modal */}
            {editingStudyCard && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-4 mb-6">
                            Edit Study Card
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Title" value={editingStudyCard.title || ''} onChange={e => setEditingStudyCard({ ...editingStudyCard, title: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                                <input
                                    placeholder="Programming Language (e.g., Python)"
                                    value={editingStudyCard.language || ''}
                                    onChange={e => setEditingStudyCard({ ...editingStudyCard, language: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                            <textarea placeholder="Content" value={editingStudyCard.content || ''} onChange={e => setEditingStudyCard({ ...editingStudyCard, content: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white h-40 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={() => setEditingStudyCard(null)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold"
                                >
                                    Cancel
                                </button>
                                <button onClick={handleSaveStudyCard} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">Save Card</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {confirmState.isOpen && (
                <ConfirmDialog
                    title={confirmState.title}
                    message={confirmState.message}
                    confirmText={confirmState.confirmText}
                    cancelText={confirmState.cancelText}
                    type={confirmState.type}
                    onConfirm={confirmState.onConfirm}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
};

export default StudyCardManagement;
