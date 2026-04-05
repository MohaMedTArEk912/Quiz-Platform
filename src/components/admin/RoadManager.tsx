import React, { useState, useEffect, useCallback } from 'react';
import {
    Sparkles, Edit, BookOpen, GraduationCap, Brain,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { UserData, Subject, Quiz } from '../../types';
import StudyCardManagement from './StudyCardManagement';
import RoadmapManagement from './RoadmapManagement';
import RoadResources from './RoadResources';
import QuizEditorModal from '../quizzes/QuizEditorModal';

// Imported Components
import RoadHeader from './road-components/RoadHeader';
import RoadList from './road-components/RoadList';
import RoadModals from './road-components/RoadModals';
import RoadOverview from './road-components/RoadOverview';
import RoadQuizzes from './road-components/RoadQuizzes';

interface RoadManagerProps {
    currentUser: UserData;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const RoadManager: React.FC<RoadManagerProps> = ({ currentUser, onNotification }) => {
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

    // Tab State for Detail View
    const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'quizzes' | 'roadmap' | 'study'>('overview');
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
        } catch (e: any) {
            console.error(e);
            onNotification('error', e.message || 'Failed to load roads');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser.userId, onNotification]);

    const loadQuizzes = useCallback(async () => {
        try {
            const quizArray = await api.getQuizzes();
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
        }
    }, [currentUser?.userId, loadRoads]);

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
        } catch (e: any) {
            console.error(e);
            onNotification('error', e.message || 'Failed to update quiz');
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
        } catch (e: any) {
            console.error(e);
            onNotification('error', e.message || 'Failed to save quiz');
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
        if (activeTab === 'quizzes') {
            loadQuizzes();
        }
    }, [activeTab, selectedRoad, loadQuizzes]);

    // Handlers
    const handleSelectRoad = (road: Subject) => {
        setSelectedRoad(road);
        setView('detail');
        setActiveTab('overview');
        setRoadmapDirty(false);
    };

    const tryLeaveRoadmapEditor = useCallback(async () => {
        if (activeTab !== 'roadmap' || !roadmapLeaveGuard) return true;
        return roadmapLeaveGuard();
    }, [activeTab, roadmapLeaveGuard]);

    const handleRoadmapTabChange = useCallback(async (nextTab: 'overview' | 'resources' | 'quizzes' | 'roadmap' | 'study') => {
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
        } catch (error: any) {
            onNotification('error', 'Failed to create road: ' + error.message);
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
        } catch (error: any) {
            onNotification('error', 'Failed to update road: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRoad = async () => {
        if (!roadToDelete) return;
        try {
            const res = await api.deleteSubject(roadToDelete._id, currentUser.userId);
            if (res.success) {
                onNotification('success', 'Road deleted successfully');
                setIsDeleteModalOpen(false);
                setRoadToDelete(null);
                if (selectedRoad && selectedRoad._id === roadToDelete._id) {
                    handleBack();
                } else {
                    loadRoads();
                }
            }
        } catch (error: any) {
            onNotification('error', 'Failed to delete road: ' + error.message);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <RoadHeader
                view={view}
                selectedRoad={selectedRoad}
                onBack={handleBack}
                onCreate={() => setIsCreateModalOpen(true)}
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
                        onSelectRoad={handleSelectRoad}
                    />
                </div>
            )}

            {/* Detail View */}
            {view === 'detail' && selectedRoad && (
                <div className="flex flex-col">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 p-1 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/5 w-max max-w-full">
                        {[
                            { id: 'overview', label: 'Overview', icon: BookOpen },
                            { id: 'resources', label: 'Resources & AI', icon: Sparkles },
                            { id: 'roadmap', label: 'Roadmap', icon: Brain },
                            { id: 'quizzes', label: 'Quizzes', icon: GraduationCap },
                            { id: 'study', label: 'Study Cards', icon: Edit },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => void handleRoadmapTabChange(tab.id as any)}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 relative overflow-hidden ${activeTab === tab.id
                                    ? 'bg-white dark:bg-[#1e1e2d] text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10 ring-1 ring-black/5 dark:ring-white/10'
                                    : 'hover:bg-white/50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-bounce-subtle' : ''}`} />
                                {tab.label}
                                {tab.id === 'roadmap' && roadmapDirty && (
                                    <span className="ml-1 inline-block h-2 w-2 rounded-full bg-amber-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className={`animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                        activeTab === 'roadmap'
                            ? 'flex flex-col'
                            : 'flex flex-col'
                    }`}>
                        {activeTab === 'overview' && (
                            <RoadOverview road={selectedRoad} />
                        )}

                        {activeTab === 'resources' && (
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
                        )}

                        {activeTab === 'study' && (
                            <StudyCardManagement
                                currentUser={currentUser}
                                onNotification={onNotification}
                                subjectId={selectedRoad._id}
                            />
                        )}

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
        </div>
    );
};

export default RoadManager;
