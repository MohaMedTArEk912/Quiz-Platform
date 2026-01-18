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
    subjectId?: string;
}

const StudyCardManagement: React.FC<StudyManagementProps> = ({ currentUser, onNotification, subjectId }) => {
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
    }, [subjectId]);

    const loadData = async () => {
        try {
            const data = await api.getStudyCards(subjectId);
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
                            language: cardData.language || 'General',
                            subjectId: subjectId // Attach subjectId
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
                const cardToCreate = { ...editingStudyCard };
                if (subjectId) cardToCreate.subjectId = subjectId; // Attach subjectId

                const created = await api.createStudyCard(cardToCreate, currentUser.userId);
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
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-xl">
                            <BookOpen className="w-8 h-8 text-purple-500" />
                        </div>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">
                            Study Cards
                        </span>
                    </h3>

                    <div className="flex gap-2">
                        {/* Category Filter */}
                        <select
                            value={studyCategoryFilter}
                            onChange={e => setStudyCategoryFilter(e.target.value)}
                            className="bg-white/60 dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-sm backdrop-blur-sm cursor-pointer hover:bg-white/80 dark:hover:bg-white/5 transition-colors"
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
                            className="bg-white/60 dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-sm backdrop-blur-sm cursor-pointer hover:bg-white/80 dark:hover:bg-white/5 transition-colors"
                        >
                            <option value="all">All Languages</option>
                            {Array.from(new Set(studyCards.map(c => c.language || '').filter(Boolean))).map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative" ref={studyMenuRef}>
                        <button
                            onClick={() => setShowStudyMenu(!showStudyMenu)}
                            className="p-3 bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl hover:bg-white dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 rounded-xl font-bold transition-all border border-white/20 dark:border-white/5 shadow-sm hover:shadow-md"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {showStudyMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white/90 dark:bg-[#1e1e2d]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={() => { handleDownloadExampleJson(); setShowStudyMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm"
                                >
                                    <Download className="w-4 h-4 text-purple-500" />
                                    Sample JSON
                                </button>
                                <button
                                    onClick={() => { cardUploadRef.current?.click(); setShowStudyMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm border-t border-gray-100 dark:border-white/5"
                                >
                                    <Upload className="w-4 h-4 text-indigo-500" />
                                    Upload JSON
                                </button>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={cardUploadRef} onChange={handleEntityUpload} accept=".json" className="hidden" />
                    <button
                        onClick={() => setEditingStudyCard({
                            title: '',
                            content: '',
                            category: activeStack || 'General',
                            language: 'JavaScript',
                            subjectId: subjectId
                        })}
                        className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                    >
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
                                className="group relative overflow-hidden bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5 hover:border-purple-500/50 dark:hover:border-purple-500/50 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <BookOpen className="w-24 h-24 text-purple-500 transform rotate-12 translate-x-4 -translate-y-4" />
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />

                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm border border-white/50 dark:border-white/10">
                                        <BookOpen className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                                    </div>

                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {stack}
                                    </h3>

                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                        <span className="bg-white dark:bg-white/10 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-white/5">
                                            {stackCards.length} Cards
                                        </span>
                                        <span className="bg-white dark:bg-white/10 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-white/5">
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
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-3xl bg-gray-50/50 dark:bg-white/5">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl grayscale opacity-50">
                                <BookOpen className="w-10 h-10 opacity-50" />
                            </div>
                            <p className="text-gray-500 font-bold text-lg">No catgories found.</p>
                            <p className="text-gray-400 text-sm mt-1">Create a card to get started with stacks.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* CARDS IN STACK VIEW */
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <button
                            onClick={() => setActiveStack(null)}
                            className="p-3 bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-white/20 dark:border-white/5 rounded-xl transition-all shadow-sm group"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{activeStack}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Managing cards in this category</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCards
                            .filter(c => (c.category || 'Uncategorized') === activeStack)
                            .map(card => (
                                <div key={card.id} className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5 hover:border-purple-500/30 transition-all group shadow-sm flex flex-col h-full hover:shadow-xl hover:-translate-y-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                                                <Code className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1 truncate" title={card.title}>{card.title}</h3>
                                                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">{card.language}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-[#0a0a0b] p-4 rounded-2xl border border-gray-200 dark:border-white/5 font-mono text-xs text-gray-600 dark:text-gray-300 mb-6 overflow-hidden relative h-32 flex-1">
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50 dark:to-[#0a0a0b] pointer-events-none" />
                                        <pre className="whitespace-pre-wrap font-medium">{card.content}</pre>
                                    </div>
                                    <div className="flex gap-3 mt-auto">
                                        <button onClick={() => setEditingStudyCard(card)} className="flex-1 py-2.5 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><Edit2 className="w-4 h-4" /> Edit</button>
                                        <button onClick={() => handleDeleteStudyCard(card.id)} className="flex-1 py-2.5 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {renameState.isOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e2d] border border-white/20 dark:border-white/5 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400 shadow-sm border border-white/50 dark:border-white/10 relative z-10">
                            <Edit2 className="w-8 h-8" />
                        </div>

                        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 relative z-10">
                            Rename Stack
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium relative z-10">
                            Enter a new name for the <span className="text-purple-600 dark:text-purple-400 font-bold">"{renameState.oldName}"</span> stack.
                        </p>

                        <div className="relative z-10">
                            <input
                                value={renameState.newName}
                                onChange={(e) => setRenameState(prev => ({ ...prev, newName: e.target.value }))}
                                className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-purple-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none font-bold mb-6 transition-all"
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
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Study Card Modal */}
            {editingStudyCard && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e2d] border border-white/20 dark:border-white/5 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl relative scale-100 animate-in zoom-in-95 duration-200">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-4 mb-8 relative z-10">
                            <span className="p-2 bg-blue-500/10 rounded-xl"><Code className="w-6 h-6 text-blue-500" /></span>
                            {editingStudyCard.id ? 'Edit Study Card' : 'New Study Card'}
                        </h2>

                        <div className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</label>
                                    <input
                                        placeholder="Card Title"
                                        value={editingStudyCard.title || ''}
                                        onChange={e => setEditingStudyCard({ ...editingStudyCard, title: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-purple-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none font-bold transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Language</label>
                                    <input
                                        placeholder="e.g. Python, SQL"
                                        value={editingStudyCard.language || ''}
                                        onChange={e => setEditingStudyCard({ ...editingStudyCard, language: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-purple-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none font-bold transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Content / Code</label>
                                <textarea
                                    placeholder="Paste your code or notes here..."
                                    value={editingStudyCard.content || ''}
                                    onChange={e => setEditingStudyCard({ ...editingStudyCard, content: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-purple-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white h-60 focus:outline-none font-mono text-sm resize-none transition-all"
                                />
                            </div>

                            <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100 dark:border-white/5">
                                <button
                                    onClick={() => setEditingStudyCard(null)}
                                    className="px-6 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveStudyCard}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all text-center"
                                >
                                    Save Study Card
                                </button>
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
