import React, { useState, useEffect, useCallback } from 'react';
import {
    Sparkles, Edit, BookOpen, GraduationCap, Brain, Eye, EyeOff
} from 'lucide-react';
import { api } from '../../lib/api';
import type { UserData, Subject, Quiz } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import StudyCardManagement from './StudyCardManagement';
import RoadmapManagement from './RoadmapManagement';
import RoadResources from './RoadResources';
import QuizEditorModal from '../quizzes/QuizEditorModal';

// Imported Components
import RoadHeader from './road-components/RoadHeader';
import RoadList, { RoadIcon } from './road-components/RoadList';
import RoadModals from './road-components/RoadModals';
import RoadQuizzes from './road-components/RoadQuizzes';
import ImportRoadBundleModal from './road-components/ImportRoadBundleModal';

type RoadTab = 'roadmap' | 'quizzes' | 'materials';

const TABS: { id: RoadTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    { id: 'roadmap', label: 'Visual Roadmap', icon: Brain, description: 'Interactive node graph & curriculum' },
    { id: 'quizzes', label: 'Quizzes & Assessment', icon: GraduationCap, description: 'Assigned and available quizzes' },
    { id: 'materials', label: 'Learning Hub & AI', icon: Sparkles, description: 'AI quiz generator, documents & flashcards' },
];

interface RoadManagerProps {
    currentUser: UserData;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const RoadManager: React.FC<RoadManagerProps> = ({ currentUser, onNotification }) => {
    const { isBento } = useTheme();
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedRoad, setSelectedRoad] = useState<Subject | null>(null);
    const [roads, setRoads] = useState<Subject[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
    const [isAssigning, setIsAssigning] = useState<string | null>(null);

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Form States
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [roadToDelete, setRoadToDelete] = useState<Subject | null>(null);
    const [roadToEdit, setRoadToEdit] = useState<Subject | null>(null);

    // Quiz Creation States
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [quizToEdit, setQuizToEdit] = useState<Quiz | null>(null);

    // Bundle Import / Export States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Tab State for Detail View (Defaults directly to the Roadmap workspace!)
    const [activeTab, setActiveTab] = useState<RoadTab>('roadmap');
    const [materialsSubTab, setMaterialsSubTab] = useState<'resources' | 'study'>('resources');
    const [roadmapDirty, setRoadmapDirty] = useState(false);
    const [roadmapLeaveGuard, setRoadmapLeaveGuard] = useState<(() => Promise<boolean>) | null>(null);

    // Loading State
    const [isLoading, setIsLoading] = useState(true);

    // Load Data
    const loadRoads = useCallback(async () => {
        setIsLoading(true);
        try {
            const subjects = await api.getAllSubjects(currentUser.userId);
            setRoads(subjects);
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'Failed to load roads';
            onNotification('error', message);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser.userId, onNotification]);

    const loadQuizzes = useCallback(async () => {
        try {
            const quizArray = await api.getQuizzes(undefined, true);
            setAllQuizzes(quizArray);
            if (selectedRoad) {
                setQuizzes(quizArray.filter((q: Quiz) => q.subjectId === selectedRoad._id));
            }
        } catch (e) {
            console.error(e);
            onNotification('error', 'Failed to load quizzes');
        }
    }, [selectedRoad, onNotification]);

    useEffect(() => {
        if (currentUser?.userId) {
            loadRoads();
            loadQuizzes();
        }
    }, [currentUser?.userId, loadRoads, loadQuizzes]);

    const quizCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        for (const q of allQuizzes) {
            if (q.subjectId) {
                counts[q.subjectId] = (counts[q.subjectId] || 0) + 1;
            }
        }
        return counts;
    }, [allQuizzes]);

    const handleExportBundle = async (subjectId?: string) => {
        setIsExporting(true);
        try {
            const { blob, filename } = await api.exportRoadmapBundle(currentUser.userId, subjectId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            onNotification('success', `Exported "${filename}" successfully!`);
        } catch (e) {
            console.error('Export error:', e);
            const msg = e instanceof Error ? e.message : 'Failed to export roadmap bundle';
            onNotification('error', msg);
        } finally {
            setIsExporting(false);
        }
    };

    const handleAssignQuiz = async (quiz: Quiz, assign: boolean) => {
        if (!selectedRoad) return;
        setIsAssigning(quiz.id);
        try {
            const updatedQuiz = {
                ...quiz,
                subjectId: assign ? selectedRoad._id : undefined
            };
            await api.updateQuiz(quiz.id, updatedQuiz, currentUser.userId);
            onNotification('success', assign ? `Quiz "${quiz.title}" assigned to this road` : `Quiz "${quiz.title}" unassigned`);
            loadQuizzes(); // Refresh
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'Failed to update quiz';
            onNotification('error', message);
        } finally {
            setIsAssigning(null);
        }
    };

    const handleSaveQuiz = async (quizData: Quiz) => {
        try {
            setIsSubmitting(true);
            const isUpdate = !!quizData.id;

            if (isUpdate) {
                await api.updateQuiz(quizData.id, quizData, currentUser.userId);
                onNotification('success', 'Quiz updated successfully');
            } else {
                const res = await api.createQuiz(quizData, currentUser.userId);
                if (res.id) {
                    onNotification('success', 'Quiz created and assigned to this road');
                }
            }

            setIsQuizModalOpen(false);
            setQuizToEdit(null);
            loadQuizzes();
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'Failed to save quiz';
            onNotification('error', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenCreateQuiz = () => {
        if (!selectedRoad) return;
        const newQuiz: Partial<Quiz> = {
            title: '',
            description: '',
            questions: [],
            timeLimit: 30,
            passingScore: 70,
            difficulty: 'Medium',
            category: 'General',
            subjectId: selectedRoad._id,
            xpReward: 100,
            coinsReward: 50
        };
        setQuizToEdit(newQuiz as Quiz);
        setIsQuizModalOpen(true);
    };

    useEffect(() => {
        if (selectedRoad) {
            loadQuizzes();
        }
    }, [selectedRoad, loadQuizzes]);

    // Handlers
    const handleSelectRoad = (road: Subject) => {
        setSelectedRoad(road);
        setView('detail');
        setActiveTab('roadmap');
        setRoadmapDirty(false);
    };

    const tryLeaveRoadmapEditor = useCallback(async () => {
        if (activeTab !== 'roadmap' || !roadmapLeaveGuard) return true;
        return roadmapLeaveGuard();
    }, [activeTab, roadmapLeaveGuard]);

    const handleRoadmapTabChange = useCallback(async (nextTab: RoadTab) => {
        if (nextTab === activeTab) return;

        if (activeTab === 'roadmap' && nextTab !== 'roadmap') {
            const canLeave = await tryLeaveRoadmapEditor();
            if (!canLeave) return;
            setRoadmapDirty(false);
            setRoadmapLeaveGuard(null);
        }

        setActiveTab(nextTab);
    }, [activeTab, tryLeaveRoadmapEditor]);

    const handleBack = async () => {
        const canLeave = await tryLeaveRoadmapEditor();
        if (!canLeave) return;

        setSelectedRoad(null);
        setView('list');
        setRoadmapDirty(false);
        setRoadmapLeaveGuard(null);
        loadRoads(); // Refresh on back
    };

    const handleRoadmapLeaveGuardChange = useCallback((guard: (() => Promise<boolean>) | null) => {
        setRoadmapLeaveGuard(() => guard);
    }, []);

    // --- CRUD Handlers ---

    const handleCreateRoad = async (title: string, description: string) => {
        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);

            const res = await api.createSubject(formData, currentUser.userId);
            if (res.success) {
                onNotification('success', 'Road created successfully');
                setIsCreateModalOpen(false);
                loadRoads();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create road';
            onNotification('error', 'Failed to create road: ' + message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateRoad = async (title: string, description: string) => {
        if (!roadToEdit) return;
        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('appendContent', 'true');

            const res = await api.updateSubject(roadToEdit._id, formData, currentUser.userId);
            if (res.success) {
                onNotification('success', 'Road updated successfully');
                setIsEditModalOpen(false);
                // IF we are editing the currently viewed road, update it in state too
                if (selectedRoad && selectedRoad._id === roadToEdit._id) {
                    setSelectedRoad({ ...selectedRoad, title, description });
                }
                loadRoads();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update road';
            onNotification('error', 'Failed to update road: ' + message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRoad = async () => {
        if (!roadToDelete) return;
        setIsSubmitting(true);
        try {
            const res = await api.deleteSubject(roadToDelete._id, currentUser.userId);
            if (res.success) {
                onNotification('success', 'Road deleted successfully');
                if (selectedRoad && selectedRoad._id === roadToDelete._id) {
                    handleBack();
                } else {
                    loadRoads();
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete road';
            onNotification('error', 'Failed to delete road: ' + message);
        } finally {
            setIsSubmitting(false);
            setIsDeleteModalOpen(false);
            setRoadToDelete(null);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <RoadHeader
                view={view}
                selectedRoad={selectedRoad}
                onBack={handleBack}
                onCreate={() => setIsCreateModalOpen(true)}
                onExportAll={() => handleExportBundle()}
                onExportRoad={(road) => handleExportBundle(road._id)}
                onOpenImport={() => setIsImportModalOpen(true)}
                isExporting={isExporting}
                onEdit={(road) => {
                    setRoadToEdit(road);
                    setIsEditModalOpen(true);
                }}
                onDelete={(road) => {
                    setRoadToDelete(road);
                    setIsDeleteModalOpen(true);
                }}
            />

            {/* List View */}
            {view === 'list' && (
                <div className="flex flex-1 flex-col custom-scrollbar">
                    <RoadList
                        isLoading={isLoading}
                        roads={roads}
                        quizCounts={quizCounts}
                        onSelectRoad={handleSelectRoad}
                        onEditRoad={(road) => {
                            setRoadToEdit(road);
                            setIsEditModalOpen(true);
                        }}
                        onDeleteRoad={(road) => {
                            setRoadToDelete(road);
                            setIsDeleteModalOpen(true);
                        }}
                        onExportRoad={(road) => handleExportBundle(road._id)}
                    />
                </div>
            )}

            {/* Detail View */}
            {view === 'detail' && selectedRoad && (
                <div className="flex flex-col">
                    {/* Executive Road Summary Card */}
                    <div className={`p-4 sm:p-5 rounded-3xl mb-5 transition-all ${
                        isBento
                            ? 'bg-white text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm'
                    }`}>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Left: Road Identity & Info */}
                            <div className="flex items-start gap-3.5 sm:gap-4">
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                    isBento
                                        ? 'bg-[#fef08a] border-2 border-black text-black'
                                        : 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500 border border-indigo-500/20'
                                }`}>
                                    <RoadIcon iconName={selectedRoad.icon} className="w-6 h-6 sm:w-7 sm:h-7" />
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                                            {selectedRoad.title}
                                        </h3>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            selectedRoad.isVisible === false
                                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        }`}>
                                            {selectedRoad.isVisible === false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            <span>{selectedRoad.isVisible === false ? 'Hidden' : 'Visible to Students'}</span>
                                        </span>
                                        {roadmapDirty && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                Unsaved Changes
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs sm:text-sm leading-relaxed max-w-3xl line-clamp-2 ${isBento ? 'text-neutral-700' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {selectedRoad.description || 'No road description provided. Click Edit to add learning objectives.'}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Quick Stats & Controls */}
                            <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                    isBento
                                        ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40'
                                }`}>
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    <span>{quizzes.length} Quizzes Assigned</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setRoadToEdit(selectedRoad);
                                        setIsEditModalOpen(true);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5'
                                            : 'bg-white dark:bg-[#252538] hover:bg-slate-100 dark:hover:bg-[#2c2c42] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10'
                                    }`}
                                    title="Edit Road Settings"
                                >
                                    <Edit className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Edit Info</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Streamlined 3-Tab Bar */}
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                        <div className={`flex gap-1.5 sm:gap-2 p-1.5 rounded-2xl overflow-x-auto no-scrollbar w-full sm:w-auto transition-all ${
                            isBento
                                ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                : 'bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5'
                        }`}>
                            {TABS.map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => void handleRoadmapTabChange(tab.id)}
                                        className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                                            isActive
                                                ? isBento
                                                    ? 'bg-[#8b5cf6] text-white border-2 border-black shadow-[2.5px_2.5px_0px_#000]'
                                                    : 'bg-white dark:bg-[#1e1e2d] text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10 ring-1 ring-black/5 dark:ring-white/10'
                                                : isBento
                                                    ? 'hover:bg-slate-100 text-black'
                                                    : 'hover:bg-white/50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                        }`}
                                    >
                                        <tab.icon className={`w-4 h-4 ${isActive ? 'animate-bounce-subtle' : ''}`} />
                                        <span>{tab.label}</span>
                                        {tab.id === 'roadmap' && roadmapDirty && (
                                            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                        )}
                                        {tab.id === 'quizzes' && (
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                                isActive
                                                    ? isBento ? 'bg-black text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                                                    : isBento ? 'bg-slate-200 text-black' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                                            }`}>
                                                {quizzes.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Context summary info text */}
                        <div className="hidden xl:block text-xs font-medium text-slate-500 dark:text-slate-400">
                            {TABS.find(t => t.id === activeTab)?.description}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="animate-in fade-in duration-200">
                        {/* Tab 1: Visual Interactive Roadmap */}
                        {activeTab === 'roadmap' && (
                            <div className="flex flex-col">
                                <RoadmapManagement
                                    adminId={currentUser.userId}
                                    onNotification={onNotification}
                                    subjectId={selectedRoad._id}
                                    onDirtyChange={setRoadmapDirty}
                                    onRegisterLeaveGuard={handleRoadmapLeaveGuardChange}
                                />
                            </div>
                        )}

                        {/* Tab 2: Quizzes & Assessment */}
                        {activeTab === 'quizzes' && (
                            <RoadQuizzes
                                assignedQuizzes={quizzes}
                                availableQuizzes={allQuizzes.filter(q => q.subjectId !== selectedRoad._id)}
                                isAssigning={isAssigning}
                                onAssign={handleAssignQuiz}
                                onEditQuiz={(quiz) => {
                                    setQuizToEdit(quiz);
                                    setIsQuizModalOpen(true);
                                }}
                                onCreateQuiz={handleOpenCreateQuiz}
                            />
                        )}

                        {/* Tab 3: Unified Learning Hub (Documents, AI Quiz Generator & Flashcards) */}
                        {activeTab === 'materials' && (
                            <div className="space-y-6">
                                {/* Segmented Control inside Learning Hub */}
                                <div className={`p-2 rounded-2xl flex items-center justify-between flex-wrap gap-3 transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                        : 'bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMaterialsSubTab('resources')}
                                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                                materialsSubTab === 'resources'
                                                    ? isBento
                                                        ? 'bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-white dark:bg-[#252538] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-white/10'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <Sparkles className="w-4 h-4 text-purple-500" />
                                            <span>Documents & AI Quiz Generator</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMaterialsSubTab('study')}
                                            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                                                materialsSubTab === 'study'
                                                    ? isBento
                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-white dark:bg-[#252538] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-white/10'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <BookOpen className="w-4 h-4 text-indigo-500" />
                                            <span>Study Flashcard Decks</span>
                                        </button>
                                    </div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 hidden md:inline">
                                        {materialsSubTab === 'resources' ? 'Upload course content and generate AI quizzes' : 'Manage active recall cards for this subject'}
                                    </span>
                                </div>

                                {materialsSubTab === 'resources' ? (
                                    <RoadResources
                                        subject={selectedRoad}
                                        adminId={currentUser.userId}
                                        onNotification={onNotification}
                                        onRefresh={() => {
                                            loadRoads();
                                            api.getAllSubjects(currentUser.userId).then(subjects => {
                                                if (selectedRoad) {
                                                    const updated = subjects.find((r: Subject) => r._id === selectedRoad._id);
                                                    if (updated) setSelectedRoad(updated);
                                                }
                                            });
                                        }}
                                    />
                                ) : (
                                    <StudyCardManagement
                                        currentUser={currentUser}
                                        onNotification={onNotification}
                                        subjectId={selectedRoad._id}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            <RoadModals
                isCreateModalOpen={isCreateModalOpen}
                isEditModalOpen={isEditModalOpen}
                isDeleteModalOpen={isDeleteModalOpen}
                isSubmitting={isSubmitting}
                roadToEdit={roadToEdit}
                roadToDelete={roadToDelete}
                onCreateClose={() => setIsCreateModalOpen(false)}
                onEditClose={() => setIsEditModalOpen(false)}
                onDeleteClose={() => setIsDeleteModalOpen(false)}
                onCreateRoad={handleCreateRoad}
                onUpdateRoad={handleUpdateRoad}
                onDeleteRoad={handleDeleteRoad}
            />

            <QuizEditorModal
                isOpen={isQuizModalOpen}
                quiz={quizToEdit}
                subjects={roads}
                onClose={() => {
                    setIsQuizModalOpen(false);
                    setQuizToEdit(null);
                }}
                onSave={handleSaveQuiz}
                onNotification={onNotification}
            />

            <ImportRoadBundleModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                adminId={currentUser.userId}
                onSuccess={() => {
                    loadRoads();
                    loadQuizzes();
                }}
                onNotification={onNotification}
            />
        </div>
    );
};

export default RoadManager;
