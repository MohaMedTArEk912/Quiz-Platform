import React, { useState, useEffect } from 'react';
import {
    Sparkles, Edit, Plus, ArrowLeft,
    BookOpen, GraduationCap, Brain, Layout,
    X, Trash2, Loader2, Check, Link2, Unlink,
    Code, Atom, Calculator, Globe, Music, Palette,
    Microscope, FlaskConical, Landmark, Scale, Heart,
    Languages, History, Cpu, Database, type LucideIcon
} from 'lucide-react';
import { api } from '../../lib/api';
import type { UserData, Subject, Quiz } from '../../types';
import StudyCardManagement from './StudyCardManagement';
import RoadmapManagement from './RoadmapManagement';
import RoadResources from './RoadResources';
import QuizEditorModal from '../quizzes/QuizEditorModal';

// Icon mapping for subject icons
const ICON_MAP: Record<string, LucideIcon> = {
    BookOpen, GraduationCap, Brain, Code, Atom, Calculator, Globe,
    Music, Palette, Microscope, FlaskConical, Landmark, Scale,
    Heart, Languages, History, Cpu, Database, Sparkles, Layout
};

// Helper to render icon from string name
const RoadIcon: React.FC<{ iconName?: string; className?: string }> = ({ iconName, className = 'w-7 h-7 text-indigo-600 dark:text-indigo-400' }) => {
    if (!iconName || !ICON_MAP[iconName]) {
        return <BookOpen className={className} />;
    }
    const IconComponent = ICON_MAP[iconName];
    return <IconComponent className={className} />;
};

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
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [roadToDelete, setRoadToDelete] = useState<Subject | null>(null);

    // Quiz Creation States
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [quizToEdit, setQuizToEdit] = useState<Quiz | null>(null);

    // Tab State for Detail View
    const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'quizzes' | 'roadmap' | 'study'>('overview');

    // Loading State
    const [isLoading, setIsLoading] = useState(true);

    // Load Data
    useEffect(() => {
        if (currentUser?.userId) {
            loadRoads();
        }
    }, [currentUser?.userId]);

    const loadRoads = async () => {
        setIsLoading(true);
        try {
            const res = await api.getAllSubjects(currentUser.userId);
            if (res.success) setRoads(res.data);
        } catch (e: any) {
            console.error(e);
            onNotification('error', e.message || 'Failed to load roads');
        } finally {
            setIsLoading(false);
        }
    };

    const loadQuizzes = async () => {
        try {
            // Load ALL quizzes for assignment UI
            // API returns array directly, not {success, data}
            const quizArray = await api.getQuizzes();
            setAllQuizzes(quizArray);
            // Filter quizzes that belong to this road
            if (selectedRoad) {
                setQuizzes(quizArray.filter((q: Quiz) => q.subjectId === selectedRoad._id));
            }
        } catch (e) {
            console.error(e);
            onNotification('error', 'Failed to load quizzes');
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
    }, [activeTab, selectedRoad]);

    // Handlers
    const handleSelectRoad = (road: Subject) => {
        setSelectedRoad(road);
        setView('detail');
        setActiveTab('overview');
    };

    const handleBack = () => {
        setSelectedRoad(null);
        setView('list');
        loadRoads(); // Refresh on back
    };

    // --- CRUD Handlers ---

    const handleCreateRoad = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);

            const res = await api.createSubject(formData, currentUser.userId);
            if (res.success) {
                onNotification('success', 'Road created successfully');
                setIsCreateModalOpen(false);
                setTitle('');
                setDescription('');
                loadRoads();
            }
        } catch (error: any) {
            onNotification('error', 'Failed to create road: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditRoad = (road: Subject) => {
        setTitle(road.title);
        setDescription(road.description || '');
        // Note: selectedRoad might already be set if we are in detail view, but for list view actions we need to be careful.
        // If triggered from list view (not implemented yet but good practice), we'd need to track it.
        // Here we assume it's triggered from detail view where selectedRoad is set.
        setIsEditModalOpen(true);
    };

    const handleUpdateRoad = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoad) return;
        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('appendContent', 'true');

            const res = await api.updateSubject(selectedRoad._id, formData, currentUser.userId);
            if (res.success) {
                onNotification('success', 'Road updated successfully');
                setIsEditModalOpen(false);
                setSelectedRoad({ ...selectedRoad, title, description }); // Optimistic update
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
                if (selectedRoad?._id === roadToDelete._id) {
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
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            {view === 'list' ? (
                <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 p-4 sm:p-5 rounded-3xl shadow-sm mb-2 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <Layout className="w-8 h-8 text-indigo-500" />
                            </div>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                                Learning Roads
                            </span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Create and manage comprehensive learning paths for your students.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> New Road
                    </button>
                </div>
            ) : (
                <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 p-3 rounded-2xl shadow-sm mb-4 flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-3 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10 group"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                                {selectedRoad?.title || 'Untitled Road'}
                            </span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                            Managing content and resources
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleEditRoad(selectedRoad!)}
                            className="p-3 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-900/30"
                            title="Edit Road"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => { setRoadToDelete(selectedRoad); setIsDeleteModalOpen(true); }}
                            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                            title="Delete Road"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            {view === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Loading State */}
                    {isLoading && (
                        <>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5 animate-pulse">
                                    <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4" />
                                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-2" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full mb-1" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3" />
                                </div>
                            ))}
                        </>
                    )}

                    {/* Roads Grid */}
                    {!isLoading && roads.map(road => (
                        <div
                            key={road._id}
                            onClick={() => handleSelectRoad(road)}
                            className="group relative overflow-hidden bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center shadow-sm border border-white/50 dark:border-white/10 group-hover:scale-110 transition-transform duration-300">
                                    <RoadIcon iconName={road.icon} />
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 relative z-10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {road.title}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-6 relative z-10 h-10">
                                {road.description || "No description provided."}
                            </p>

                            <div className="mt-auto flex gap-2 relative z-10">
                                <span className="text-xs bg-white/80 dark:bg-white/10 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 font-bold border border-gray-100 dark:border-white/5 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 transition-colors">
                                    {road.materials?.length || 0} Resources
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {!isLoading && roads.length === 0 && (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/50 dark:bg-white/5">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl grayscale opacity-50">
                                📚
                            </div>
                            <p className="text-gray-500 font-bold text-lg">No roads found.</p>
                            <p className="text-gray-400 text-sm mt-1">Create your first learning journey above.</p>
                        </div>
                    )}
                </div>
            )}

            {view === 'detail' && selectedRoad && (
                <div className="flex flex-col h-full overflow-hidden">
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
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 relative overflow-hidden ${activeTab === tab.id
                                    ? 'bg-white dark:bg-[#1e1e2d] text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10 ring-1 ring-black/5 dark:ring-white/10'
                                    : 'hover:bg-white/50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-bounce-subtle' : ''}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-hidden">
                        {activeTab === 'overview' && (
                            <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm">
                                <h3 className="text-2xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                                    <span className="p-2 bg-indigo-500/10 rounded-lg"><BookOpen className="w-6 h-6 text-indigo-500" /></span>
                                    Road Details
                                </h3>
                                <div className="space-y-6 max-w-3xl">
                                    <div className="group">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Title</label>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-transparent group-hover:border-indigo-500/20 transition-colors">
                                            {selectedRoad.title}
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Description</label>
                                        <div className="text-base leading-relaxed text-gray-700 dark:text-gray-300 p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-transparent group-hover:border-indigo-500/20 transition-colors min-h-[100px]">
                                            {selectedRoad.description || "No description provided."}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'resources' && (
                            <div className="h-full overflow-hidden">
                                <RoadResources
                                    subject={selectedRoad}
                                    adminId={currentUser.userId}
                                    onNotification={onNotification}
                                    onRefresh={() => {
                                        loadRoads();
                                        // Update selectedRoad as well to reflect any deep changes
                                        // Ideally loadRoads could return data to update selectedRoad directly
                                        // For now, we rely on the list refresh. 
                                        // To truly update content, we actually need to re-fetch this specific road 
                                        // or find it in the new roads list.
                                        api.getAllSubjects(currentUser.userId).then(res => {
                                            if (res.success && selectedRoad) {
                                                const updated = res.data.find((r: Subject) => r._id === selectedRoad._id);
                                                if (updated) setSelectedRoad(updated);
                                            }
                                        });
                                    }}
                                />
                            </div>
                        )}

                        {activeTab === 'study' && (
                            <div className="h-full overflow-hidden">
                                <StudyCardManagement
                                    currentUser={currentUser}
                                    onNotification={onNotification}
                                    subjectId={selectedRoad._id}
                                />
                            </div>
                        )}

                        {activeTab === 'roadmap' && (
                            <div className="h-full overflow-hidden">
                                <RoadmapManagement
                                    adminId={currentUser.userId}
                                    onNotification={onNotification}
                                    subjectId={selectedRoad._id}
                                />
                            </div>
                        )}

                        {activeTab === 'quizzes' && (
                            <div className="h-full overflow-y-auto space-y-6">
                                {/* Assigned Quizzes Section */}
                                <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                            <span className="p-2 bg-green-500/10 rounded-lg">
                                                <Check className="w-5 h-5 text-green-500" />
                                            </span>
                                            Assigned to This Road ({quizzes.length})
                                        </h3>
                                        <button
                                            onClick={handleOpenCreateQuiz}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> Create New Quiz
                                        </button>
                                    </div>
                                    {quizzes.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p className="font-medium">No quizzes assigned yet</p>
                                            <p className="text-sm">Select quizzes from below to add them</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {quizzes.map(quiz => (
                                                <div key={quiz.id} className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-200 dark:border-green-800/50 flex items-center justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{quiz.title}</h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{quiz.questions?.length || 0} questions</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setQuizToEdit(quiz);
                                                                setIsQuizModalOpen(true);
                                                            }}
                                                            className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl transition-colors"
                                                            title="Edit quiz"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAssignQuiz(quiz, false)}
                                                            disabled={isAssigning === quiz.id}
                                                            className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl transition-colors disabled:opacity-50"
                                                            title="Remove from this road"
                                                        >
                                                            {isAssigning === quiz.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* All Available Quizzes Section */}
                                <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-white/5">
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                                        <span className="p-2 bg-indigo-500/10 rounded-lg">
                                            <GraduationCap className="w-5 h-5 text-indigo-500" />
                                        </span>
                                        Available Quizzes ({allQuizzes.filter(q => q.subjectId !== selectedRoad._id).length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {allQuizzes.filter(q => q.subjectId !== selectedRoad._id).map(quiz => (
                                            <div key={quiz.id} className="bg-white dark:bg-black/20 p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex items-center justify-between gap-3 hover:border-indigo-500/30 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{quiz.title}</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {quiz.questions?.length || 0} questions
                                                        {quiz.subjectId && <span className="ml-2 text-amber-500">(assigned elsewhere)</span>}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleAssignQuiz(quiz, true)}
                                                    disabled={isAssigning === quiz.id}
                                                    className="p-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors disabled:opacity-50"
                                                    title="Add to this road"
                                                >
                                                    {isAssigning === quiz.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        ))}
                                        {allQuizzes.filter(q => q.subjectId !== selectedRoad._id).length === 0 && (
                                            <div className="col-span-full text-center py-8 text-gray-400">
                                                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                <p className="font-medium">All quizzes are assigned</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e2d] rounded-3xl w-full max-w-lg shadow-2xl p-8 border border-white/20 dark:border-white/5 scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Create New Road</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateRoad} className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all font-bold text-gray-900 dark:text-white"
                                    placeholder="e.g., Mathematics 101"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all font-medium text-gray-900 dark:text-white h-32 resize-none"
                                    placeholder="What is this road about?"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Road'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e2d] rounded-3xl w-full max-w-lg shadow-2xl p-8 border border-white/20 dark:border-white/5 scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Edit Road</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateRoad} className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all font-medium text-gray-900 dark:text-white h-32 resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {isDeleteModalOpen && roadToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e2d] rounded-3xl w-full max-w-md shadow-2xl p-8 border border-white/20 dark:border-white/5 text-center relative overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/10 rounded-br-full -ml-16 -mt-16 pointer-events-none" />

                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-8 ring-red-50 dark:ring-red-900/10">
                            <Trash2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Delete Road?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">{roadToDelete.title}</span>? This action cannot be undone and will delete all associated resources.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors w-full"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteRoad}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all w-full"
                            >
                                Delete Road
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Quiz Editor Modal */}
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
