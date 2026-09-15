import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dagre from 'dagre';
import { api } from '../../lib/api';
import type { SkillModule, SkillTrack, Quiz, BadgeNode } from '../../types';
import { NodeType, NodeState } from '../../types';
import {
    Save, Zap, Star, Loader2, FileJson, Download,
    Plus, Eye, Check, BrainCircuit, Lock as LockIcon, RotateCcw,
    Sparkles, Trophy, BookOpen, Target, ArrowUp, ArrowDown,
    Copy, Trash2, Edit3, Search
} from 'lucide-react';
import { InspectorPanel } from './InspectorPanel';
import { RoadmapJsonImporter } from './RoadmapJsonImporter';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useTheme } from '../../context/ThemeContext';

interface RoadmapManagementProps {
    adminId: string;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
    subjectId?: string;
    readOnly?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
    onRegisterLeaveGuard?: (guard: (() => Promise<boolean>) | null) => void;
    userProgress?: {
        completedModules: string[];
        unlockedModules: string[];
        completedSubModules?: string[]; // Format: "moduleId:subModuleId"
    };
    /** Called when user completes a submodule in readOnly/user mode */
    onSubModuleComplete?: (trackId: string, moduleId: string, subModuleId: string) => Promise<void>;
}

// --- Design System Tokens ---
const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const LEVEL_SPACING = 180;
const NODE_SPACING = 100;

interface RoadmapDraftState {
    track: SkillTrack | null;
    modules: SkillModule[];
}


/**
 * Auto-layout using Dagre algorithm
 * Handles disconnected nodes by using the 'level' property for ranking
 */
const applyAutoLayout = (modules: SkillModule[]): SkillModule[] => {
    if (modules.length === 0) return modules;

    const g = new dagre.graphlib.Graph();
    g.setGraph({
        rankdir: 'TB',      // Top to Bottom (vertical)
        nodesep: NODE_SPACING,
        ranksep: LEVEL_SPACING,
        marginx: 150,
        marginy: 100,
        align: 'UL'         // Align to upper-left for cleaner look
    });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes with rank based on level
    modules.forEach(mod => {
        g.setNode(mod.moduleId, {
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            // Use level for ranking when there are no edges
            rank: mod.level || 0
        });
    });

    // Add edges based on prerequisites
    let hasEdges = false;
    modules.forEach(mod => {
        if (mod.prerequisites && mod.prerequisites.length > 0) {
            mod.prerequisites.forEach(prereqId => {
                if (modules.find(m => m.moduleId === prereqId)) {
                    g.setEdge(prereqId, mod.moduleId);
                    hasEdges = true;
                }
            });
        }
    });

    // If no edges exist, create virtual edges based on level to force vertical layout
    if (!hasEdges && modules.length > 1) {
        // Sort by level, then create a chain
        const sortedByLevel = [...modules].sort((a, b) => (a.level || 0) - (b.level || 0));
        for (let i = 1; i < sortedByLevel.length; i++) {
            g.setEdge(sortedByLevel[i - 1].moduleId, sortedByLevel[i].moduleId);
        }
    }

    dagre.layout(g);

    return modules.map(mod => {
        const nodeData = g.node(mod.moduleId);
        if (nodeData) {
            return {
                ...mod,
                coordinates: {
                    // Center nodes horizontally in the canvas
                    x: nodeData.x - NODE_WIDTH / 2 + 200,
                    y: nodeData.y - NODE_HEIGHT / 2
                }
            };
        }
        return mod;
    });
};

const cloneDraftState = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createEmptyTrackDraft = (subjectId?: string): SkillTrack => ({
    trackId: '',
    title: 'Learning Path',
    description: '',
    icon: '🗺️',
    subjectId,
    modules: []
});

const normalizeModulesForSnapshot = (modules: SkillModule[]) =>
    modules.map(module => ({
        ...module,
        description: module.description || '',
        type: module.type || NodeType.CORE,
        status: module.status || NodeState.LOCKED,
        xpReward: module.xpReward || 100,
        coordinates: module.coordinates || { x: 0, y: 0 },
        prerequisites: module.prerequisites || [],
        quizIds: module.quizIds || (module.quizId ? [module.quizId] : []),
        subModules: (module.subModules || []).map(subModule => ({
            ...subModule,
            state: subModule.state || 'locked',
            xp: subModule.xp || 0
        }))
    }));

const createRoadmapSnapshot = (
    track: SkillTrack | null,
    modules: SkillModule[],
    subjectId?: string
) => JSON.stringify({
    track: {
        trackId: track?.trackId || '',
        title: track?.title || '',
        description: track?.description || '',
        icon: track?.icon || '🗺️',
        subjectId: subjectId || track?.subjectId || ''
    },
    modules: normalizeModulesForSnapshot(modules)
});

/**
 * Helper: Resolve Node Appearance
 */


const RoadmapManagement: React.FC<RoadmapManagementProps> = ({
    adminId,
    onNotification,
    subjectId,
    readOnly = false,
    onDirtyChange,
    onRegisterLeaveGuard,
    userProgress,
    onSubModuleComplete
}) => {
    // Theme
    const { isBento } = useTheme();

    // Data state
    const [track, setTrack] = useState<SkillTrack | null>(null);
    const [modules, setModules] = useState<SkillModule[]>([]);
    const [savedDraft, setSavedDraft] = useState<RoadmapDraftState | null>(null);

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'admin' | 'user'>('admin');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // Interaction State

    // Inspector State
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isModuleDetailsOpen, setIsModuleDetailsOpen] = useState(false);
    const [selectedModuleForDetails, setSelectedModuleForDetails] = useState<SkillModule | null>(null);

    // Resources for dropdowns
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [badges, setBadges] = useState<BadgeNode[]>([]);

    // Optimistic UI state for sub-module completion (local state for instant feedback)
    const [localCompletedSubModules, setLocalCompletedSubModules] = useState<string[]>([]);
    const [savingSubModuleId, setSavingSubModuleId] = useState<string | null>(null);

    const currentSnapshot = useMemo(
        () => createRoadmapSnapshot(track, modules, subjectId),
        [track, modules, subjectId]
    );
    const savedSnapshot = useMemo(
        () => savedDraft ? createRoadmapSnapshot(savedDraft.track, savedDraft.modules, subjectId) : '',
        [savedDraft, subjectId]
    );
    const isDirty = !readOnly && savedDraft !== null && currentSnapshot !== savedSnapshot;
    const totalLessonCount = useMemo(
        () => modules.reduce((sum, module) => sum + (module.subModules?.length || 0), 0),
        [modules]
    );
    const linkedQuizCount = useMemo(
        () => modules.reduce((sum, module) => sum + (module.quizIds?.length || (module.quizId ? 1 : 0)), 0),
        [modules]
    );

    // Sync local state with props when userProgress changes
    React.useEffect(() => {
        if (userProgress?.completedSubModules) {
            setLocalCompletedSubModules(userProgress.completedSubModules);
        }
    }, [userProgress?.completedSubModules]);

    const selectedNode = useMemo(
        () => modules.find(module => module.moduleId === selectedNodeId) || null,
        [modules, selectedNodeId]
    );

    useEffect(() => {
        if (!selectedNodeId) return;

        if (!selectedNode) {
            setIsInspectorOpen(false);
        }
    }, [selectedNode, selectedNodeId]);

    useEffect(() => {
        if (!isModuleDetailsOpen || !selectedModuleForDetails) return;

        const refreshedModule = modules.find(module => module.moduleId === selectedModuleForDetails.moduleId) || null;
        if (refreshedModule) {
            setSelectedModuleForDetails(refreshedModule);
            return;
        }

        setIsModuleDetailsOpen(false);
        setSelectedModuleForDetails(null);
    }, [modules, isModuleDetailsOpen, selectedModuleForDetails]);

    const { confirm, confirmState, handleCancel } = useConfirm();

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const rememberSavedDraft = useCallback((nextTrack: SkillTrack | null, nextModules: SkillModule[]) => {
        setSavedDraft(cloneDraftState({
            track: nextTrack,
            modules: nextModules
        }));
    }, []);

    // --- Initialization ---
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch tracks, quizzes, and badges in parallel
            const [tracksData, quizzesData, badgesData] = await Promise.all([
                api.getSkillTracks(subjectId, true),
                api.getQuizzes(subjectId, true).catch(() => []), // Admins must be able to manage hidden items
                api.getBadgeNodes().catch(() => [])
            ]);

            setQuizzes(quizzesData);
            setBadges(badgesData);

            const existingTrack = tracksData.find((t: SkillTrack) => t.subjectId === subjectId);
            if (existingTrack) {
                setTrack(existingTrack);
                const migratedModules = migrateTreeToGraph(existingTrack.modules);
                setModules(migratedModules);
                rememberSavedDraft(existingTrack, migratedModules);
            } else {
                // Genesis Node - Sample module with sub-modules
                const root: SkillModule = {
                    moduleId: `mod_${Date.now()}`,
                    title: 'Introduction to Fundamentals',
                    description: 'Master the core concepts and foundational skills needed to excel in this learning track.',
                    level: 0,
                    type: NodeType.CORE,
                    status: NodeState.AVAILABLE,
                    xpReward: 100,
                    coordinates: { x: 100, y: 100 },
                    quizIds: [],
                    prerequisites: [],
                    subModules: [
                        {
                            id: 'sub_1',
                            title: 'Getting Started',
                            state: 'available',
                            xp: 25,
                            videoUrl: undefined
                        },
                        {
                            id: 'sub_2',
                            title: 'Setup & Environment Configuration',
                            state: 'locked',
                            xp: 25,
                            videoUrl: undefined
                        },
                        {
                            id: 'sub_3',
                            title: 'First Hands-On Project',
                            state: 'locked',
                            xp: 50,
                            videoUrl: undefined
                        }
                    ]
                };
                setModules([root]);
                setTrack(null);
                rememberSavedDraft(null, [root]);
            }
        } catch (error) {
            console.error(error);
            onNotification('error', 'Failed to load graph');
        } finally { setLoading(false); }
    }, [subjectId, onNotification, rememberSavedDraft]);

    useEffect(() => { loadData(); }, [loadData]);

    /**
     * Migration Utility: Tree -> XY Graph
     * Now smarter: detects poor layouts and applies auto-layout
     */
    const migrateTreeToGraph = (mods: SkillModule[]): SkillModule[] => {
        // Ensure each module has required defaults
        const normalizedMods = mods.map(m => ({
            ...m,
            xpReward: m.xpReward || 100,
            subModules: m.subModules || [],
            quizIds: m.quizIds || [],
            prerequisites: m.prerequisites || [],
            status: m.status || NodeState.LOCKED,
            type: m.type || NodeType.CORE,
            // Ensure coordinates object exists
            coordinates: m.coordinates || { x: 0, y: 0 }
        }));

        // Detect if auto-layout is needed:
        // 1. No valid coordinates (x and y are both 0 for all)
        // 2. All nodes stacked in one place
        const validCoords = normalizedMods.filter(m =>
            m.coordinates && (m.coordinates.x !== 0 || m.coordinates.y !== 0)
        );

        // If no modules have valid non-zero coordinates, apply layout
        if (validCoords.length === 0) {
            console.log('No valid coordinates found, applying auto-layout...');
            return applyAutoLayout(normalizedMods);
        }

        // Check for bad layout: all nodes on approximately same Y (horizontal line)
        const yValues = normalizedMods.map(m => m.coordinates!.y);
        const uniqueYs = new Set(yValues.map(y => Math.round(y / 50) * 50));

        // If all nodes are within 50px of each other vertically, it's a bad layout
        if (uniqueYs.size <= 1 && normalizedMods.length > 1) {
            console.log('Detected horizontal-only layout, applying auto-layout...');
            return applyAutoLayout(normalizedMods);
        }

        return normalizedMods;
    };

    const persistRoadmap = useCallback(async (
        nextTrack: Partial<SkillTrack> | undefined,
        nextModules: SkillModule[],
        successMessage: string
    ) => {
        if (!subjectId) {
            throw new Error('Select a subject before saving a roadmap.');
        }

        setSaving(true);

        try {
            const baseTrack: SkillTrack = track || createEmptyTrackDraft(subjectId);

            const payload: SkillTrack = {
                ...baseTrack,
                ...nextTrack,
                subjectId,
                title: nextTrack?.title || baseTrack.title || 'Learning Path',
                icon: nextTrack?.icon || baseTrack.icon || '🗺️',
                modules: nextModules
            };

            const savedTrack = payload.trackId
                ? await api.updateSkillTrack(payload.trackId, payload, adminId)
                : await api.createSkillTrack({
                    ...payload,
                    trackId: `track_${Date.now()}`
                }, adminId);

            const savedModules = migrateTreeToGraph(savedTrack.modules || nextModules);
            setTrack(savedTrack);
            setModules(savedModules);
            rememberSavedDraft(savedTrack, savedModules);
            onNotification('success', successMessage);

            return savedTrack;
        } catch (error) {
            console.error('Roadmap persistence error:', error);
            throw error;
        } finally {
            setSaving(false);
        }
    }, [adminId, onNotification, rememberSavedDraft, subjectId, track]);

    const handleTrackFieldChange = useCallback((field: 'title' | 'description' | 'icon' | 'isVisible', value: string | boolean) => {
        setTrack(prev => ({
            ...(prev || createEmptyTrackDraft(subjectId)),
            [field]: value,
            subjectId: subjectId || prev?.subjectId
        }));
    }, [subjectId]);

    const handleDiscardChanges = useCallback(async () => {
        if (!isDirty || !savedDraft) return;

        const shouldDiscard = await confirm({
            title: 'Discard unsaved changes?',
            message: 'This will reset the roadmap editor back to the last saved version.',
            confirmText: 'Discard',
            cancelText: 'Keep editing',
            type: 'warning'
        });

        if (!shouldDiscard) return;

        const restoredDraft = cloneDraftState(savedDraft);
        setTrack(restoredDraft.track);
        setModules(restoredDraft.modules);
        setSelectedNodeId(null);
        setIsInspectorOpen(false);
        onNotification('warning', 'Unsaved roadmap changes were discarded.');
    }, [confirm, isDirty, onNotification, savedDraft]);

    const confirmCloseWithUnsavedChanges = useCallback(async () => {
        if (!isDirty) return true;

        const shouldLeave = await confirm({
            title: 'Leave without saving?',
            message: 'You have unsaved roadmap changes. Leaving now will discard them.',
            confirmText: 'Leave without saving',
            cancelText: 'Stay',
            type: 'warning'
        });

        if (shouldLeave) {
            onNotification('warning', 'Roadmap closed without saving. Your latest edits were discarded.');
        }

        return shouldLeave;
    }, [confirm, isDirty, onNotification]);

    useEffect(() => {
        if (!onRegisterLeaveGuard || readOnly) return;

        onRegisterLeaveGuard(confirmCloseWithUnsavedChanges);
        return () => onRegisterLeaveGuard(null);
    }, [confirmCloseWithUnsavedChanges, onRegisterLeaveGuard, readOnly]);

    useEffect(() => {
        if (readOnly || !isDirty) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, readOnly]);

    const computeStatus = (module: SkillModule) => {
        let status = module.status || 'locked';
        if (readOnly && userProgress) {
            if (userProgress.completedModules?.includes(module.moduleId)) {
                status = 'completed';
            } else if (userProgress.unlockedModules?.includes(module.moduleId)) {
                status = 'available';
            } else {
                status = 'locked';
            }
        }
        return {
            status,
            isLocked: status === 'locked',
            isCompleted: status === 'completed'
        };
    };

    const getModuleTheme = (module: SkillModule) => {
        switch (module.type) {
            case NodeType.OPTIONAL:
                return {
                    Icon: Sparkles,
                    label: 'OPTIONAL',
                    badgeBg: isBento ? 'bg-[#6ee7b7] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
                    bannerBg: isBento ? 'bg-[#d1fae5]' : 'bg-emerald-50 dark:bg-emerald-950/20',
                    dotColor: '#10b981'
                };
            case NodeType.ACHIEVEMENT:
                return {
                    Icon: Trophy,
                    label: 'ACHIEVEMENT',
                    badgeBg: isBento ? 'bg-[#fcd34d] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                    bannerBg: isBento ? 'bg-[#fef3c7]' : 'bg-amber-50 dark:bg-amber-950/20',
                    dotColor: '#f59e0b'
                };
            case NodeType.QUIZ:
            case NodeType.EXAM:
                return {
                    Icon: Target,
                    label: 'ASSESSMENT',
                    badgeBg: isBento ? 'bg-[#fda4af] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                    bannerBg: isBento ? 'bg-[#ffe4e6]' : 'bg-rose-50 dark:bg-rose-950/20',
                    dotColor: '#ef4444'
                };
            default:
                return {
                    Icon: Zap,
                    label: 'CORE',
                    badgeBg: isBento ? 'bg-[#c4b5fd] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
                    bannerBg: isBento ? 'bg-[#ede9fe]' : 'bg-indigo-50 dark:bg-indigo-950/20',
                    dotColor: '#6366f1'
                };
        }
    };

    const renderSolidRoadmap = () => {
        // Filter modules by search and type
        const filtered = modules.filter(mod => {
            const matchesType = typeFilter === 'all' || mod.type === typeFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q ||
                (mod.title && mod.title.toLowerCase().includes(q)) ||
                (mod.description && mod.description.toLowerCase().includes(q));
            return matchesType && matchesSearch;
        });

        // Always sequential by level or natural order
        const sorted = [...filtered].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

        const visibleItems = readOnly
            ? sorted.filter(mod => {
                const { isLocked } = computeStatus(mod);
                return !(viewMode === 'user' && isLocked);
            })
            : sorted;

        // Group into Milestone Stages (4 modules per stage)
        const STAGE_SIZE = 4;
        const totalStages = Math.ceil(visibleItems.length / STAGE_SIZE);
        const stages: { stageNumber: number; modules: SkillModule[] }[] = [];
        for (let i = 0; i < totalStages; i++) {
            stages.push({
                stageNumber: i + 1,
                modules: visibleItems.slice(i * STAGE_SIZE, (i + 1) * STAGE_SIZE)
            });
        }

        const getStageLabel = (stageNum: number, total: number) => {
            if (stageNum === total && total > 1) return 'Milestone ' + stageNum + ' • Capstone, Exams & Final Projects';
            switch (stageNum) {
                case 1: return 'Milestone 1 • Foundations & Core Basics';
                case 2: return 'Milestone 2 • Logic, Operators & Decisions';
                case 3: return 'Milestone 3 • Loops, Iteration & Control Flow';
                case 4: return 'Milestone 4 • Functions, Scope & Modularity';
                default: return `Milestone ${stageNum} • Advanced Topics & Mastery`;
            }
        };

        return (
            <div className="flex flex-col gap-6 mt-4">
                {/* Search, Type Filters & Quick Actions Bar */}
                <div className={`p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                    isBento
                        ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-white/60 dark:bg-[#111522] border border-gray-200 dark:border-white/10 shadow-sm'
                }`}>
                    {/* Left: Search input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search roadmap modules..."
                            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all focus:outline-none ${
                                isBento
                                    ? 'bg-slate-50 text-black border-2 border-black focus:bg-white'
                                    : 'bg-slate-100 dark:bg-[#1a2030] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10'
                            }`}
                        />
                    </div>

                    {/* Middle: Type Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {[
                            { id: 'all', label: 'All Modules' },
                            { id: NodeType.CORE, label: 'Core' },
                            { id: NodeType.OPTIONAL, label: 'Optional' },
                            { id: NodeType.QUIZ, label: 'Assessment' },
                            { id: NodeType.ACHIEVEMENT, label: 'Achievement' },
                        ].map(t => {
                            const isSelected = typeFilter === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setTypeFilter(t.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                                        isSelected
                                            ? isBento
                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-indigo-600 text-white shadow-sm'
                                            : isBento
                                                ? 'bg-slate-100 text-black border border-black hover:bg-slate-200'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: Quick Re-number / Reorganize */}
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={handleRedesign}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5'
                                    : 'bg-white dark:bg-[#1a2030] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-50'
                            }`}
                            title="Auto-organize levels sequentially from 0 to N"
                        >
                            <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Re-number Levels</span>
                        </button>
                    )}
                </div>

                {/* Empty State */}
                {visibleItems.length === 0 && (
                    <div className={`p-12 text-center rounded-3xl transition-all ${
                        isBento
                            ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-white dark:bg-[#111522] border border-gray-200 dark:border-white/10 text-slate-500'
                    }`}>
                        <BrainCircuit className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-500" />
                        <h4 className="text-lg font-black text-slate-900 dark:text-white">No Modules Found</h4>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                            {modules.length === 0
                                ? 'Your roadmap has no modules yet. Click "+ Add Core" above to create the first milestone.'
                                : 'No modules match your search or filter criteria. Clear the search box to view all modules.'}
                        </p>
                    </div>
                )}

                {/* Milestone Stages */}
                {stages.map((stage, stageIdx) => {
                    const isLastStage = stageIdx === stages.length - 1;

                    return (
                        <div key={stage.stageNumber} className="flex flex-col gap-4">
                            {/* Milestone Stage Header */}
                            <div className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                                isBento
                                    ? 'bg-[#fef08a] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                                    : 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 text-slate-900 dark:text-white'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                                        isBento
                                            ? 'bg-black text-white border-2 border-black'
                                            : 'bg-indigo-600 text-white shadow-sm'
                                    }`}>
                                        M{stage.stageNumber}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-base sm:text-lg tracking-tight">
                                            {getStageLabel(stage.stageNumber, stages.length)}
                                        </h4>
                                        <p className="text-xs font-semibold opacity-80">
                                            Milestone {stage.stageNumber} of {stages.length} • {stage.modules.length} {stage.modules.length === 1 ? 'Module' : 'Modules'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-black">
                                    <span className={`px-2.5 py-1 rounded-lg ${
                                        isBento ? 'bg-white text-black border border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-white/80 dark:bg-slate-800'
                                    }`}>
                                        {stage.modules.reduce((sum, m) => sum + (m.subModules?.length || 0), 0)} Lessons
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-lg ${
                                        isBento ? 'bg-white text-black border border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-white/80 dark:bg-slate-800'
                                    }`}>
                                        {stage.modules.reduce((sum, m) => sum + (m.quizIds?.length || (m.quizId ? 1 : 0)), 0)} Quizzes
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-lg ${
                                        isBento ? 'bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        +{stage.modules.reduce((sum, m) => sum + (m.xpReward || 0), 0)} XP
                                    </span>
                                </div>
                            </div>

                            {/* Solid Modules Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
                                {stage.modules.map((mod, modIdxInStage) => {
                                    const globalIndex = (stage.stageNumber - 1) * STAGE_SIZE + modIdxInStage;
                                    const { isCompleted, isLocked } = computeStatus(mod);
                                    const isSelected = selectedNodeId === mod.moduleId;
                                    const lessonCount = mod.subModules?.length || 0;
                                    const quizCount = mod.quizIds?.length || (mod.quizId ? 1 : 0);
                                    const xpReward = mod.xpReward || 100;
                                    const theme = getModuleTheme(mod);
                                    const ThemeIcon = theme.Icon;

                                    const handleCardClick = () => {
                                        if (readOnly) {
                                            if (isLocked) {
                                                onNotification('error', 'Complete previous modules to unlock this one');
                                                return;
                                            }
                                            setSelectedModuleForDetails(mod);
                                            setIsModuleDetailsOpen(true);
                                            return;
                                        }
                                        setSelectedNodeId(mod.moduleId);
                                        setIsInspectorOpen(true);
                                    };

                                    return (
                                        <div
                                            key={mod.moduleId}
                                            onClick={handleCardClick}
                                            className={`group relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                                                isBento
                                                    ? `bg-white text-black border-2 border-black ${
                                                        isSelected
                                                            ? 'ring-4 ring-[#8b5cf6] shadow-[6px_6px_0px_#000] -translate-y-1'
                                                            : 'shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-0.5'
                                                      }`
                                                    : `bg-white dark:bg-[#161c2b] border ${
                                                        isSelected
                                                            ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                                                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm'
                                                      }`
                                            } ${isLocked ? 'opacity-70 bg-slate-50 dark:bg-slate-900/40' : ''}`}
                                        >
                                            {/* Card Top Row: Step #, Type Badge, Status */}
                                            <div>
                                                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                                            isBento
                                                                ? 'bg-[#fef08a] text-black border-2 border-black'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold'
                                                        }`}>
                                                            #{String(globalIndex + 1).padStart(2, '0')}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${theme.badgeBg}`}>
                                                            <ThemeIcon className="w-3 h-3" />
                                                            <span>{theme.label}</span>
                                                        </span>
                                                    </div>

                                                    <div>
                                                        {isLocked ? (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                                                                isBento ? 'bg-slate-200 text-slate-700 border border-black' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                <LockIcon className="w-3 h-3" />
                                                                <span>Locked</span>
                                                            </span>
                                                        ) : isCompleted ? (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                                                                isBento ? 'bg-[#bef264] text-black border border-black' : 'bg-emerald-100 text-emerald-700'
                                                            }`}>
                                                                <Check className="w-3 h-3" />
                                                                <span>Done</span>
                                                            </span>
                                                        ) : (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                                                                isBento ? 'bg-cyan-100 text-black border border-black' : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                <span>Ready</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Title & Description */}
                                                <h4 className="font-black text-base text-slate-900 dark:text-white leading-snug line-clamp-2">
                                                    {mod.title}
                                                </h4>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
                                                    {mod.description || 'Complete this curriculum step to progress through your roadmap.'}
                                                </p>

                                                {/* Prerequisites tag if any */}
                                                {mod.prerequisites && mod.prerequisites.length > 0 && (
                                                    <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requires:</span>
                                                        {mod.prerequisites.map(prereqId => {
                                                            const prereqMod = modules.find(m => m.moduleId === prereqId);
                                                            return (
                                                                <span
                                                                    key={prereqId}
                                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate max-w-[120px] ${
                                                                        isBento
                                                                            ? 'bg-slate-100 text-black border border-black'
                                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                                    }`}
                                                                >
                                                                    {prereqMod?.title || prereqId}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Card Bottom: Metrics & Actions */}
                                            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
                                                    <span className="flex items-center gap-1" title={`${lessonCount} lessons`}>
                                                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                                        <span>{lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1" title={`${quizCount} quizzes`}>
                                                        <Target className="w-3.5 h-3.5 text-rose-500" />
                                                        <span>{quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}</span>
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                                                        isBento ? 'bg-[#bef264] text-black border border-black' : 'text-amber-600'
                                                    }`}>
                                                        +{xpReward} XP
                                                    </span>
                                                </div>

                                                {/* Action Bar */}
                                                {!readOnly ? (
                                                    <div className="flex items-center justify-between gap-1.5" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedNodeId(mod.moduleId);
                                                                setIsInspectorOpen(true);
                                                            }}
                                                            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                                                isBento
                                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] hover:bg-[#a3e635]'
                                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                            }`}
                                                        >
                                                            <Edit3 className="w-3 h-3" />
                                                            <span>Edit</span>
                                                        </button>

                                                        {/* Re-order buttons */}
                                                        <button
                                                            type="button"
                                                            disabled={globalIndex === 0}
                                                            onClick={() => handleMoveNode(mod.moduleId, 'up')}
                                                            title="Move step earlier"
                                                            className={`p-1.5 rounded-xl transition-all ${
                                                                isBento
                                                                    ? 'bg-white text-black border-2 border-black hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 disabled:opacity-30'
                                                            }`}
                                                        >
                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={globalIndex === visibleItems.length - 1}
                                                            onClick={() => handleMoveNode(mod.moduleId, 'down')}
                                                            title="Move step later"
                                                            className={`p-1.5 rounded-xl transition-all ${
                                                                isBento
                                                                    ? 'bg-white text-black border-2 border-black hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 disabled:opacity-30'
                                                            }`}
                                                        >
                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                        </button>

                                                        {/* Duplicate */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDuplicateNode(mod)}
                                                            title="Duplicate module"
                                                            className={`p-1.5 rounded-xl transition-all ${
                                                                isBento
                                                                    ? 'bg-white text-black border-2 border-black hover:bg-slate-100 cursor-pointer'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                                                            }`}
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleDeleteNode(mod.moduleId)}
                                                            title="Delete module"
                                                            className={`p-1.5 rounded-xl transition-all ${
                                                                isBento
                                                                    ? 'bg-red-50 text-red-700 border-2 border-black hover:bg-red-100 cursor-pointer'
                                                                    : 'bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100'
                                                            }`}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleCardClick}
                                                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                            isBento
                                                                ? 'bg-[#8b5cf6] text-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#7c3aed]'
                                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                        }`}
                                                    >
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        <span>View Lessons & Quizzes</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Milestone Bridge / Connector to Next Stage */}
                            {!isLastStage && (
                                <div className="flex flex-col items-center justify-center my-3">
                                    <div className={`w-0.5 h-5 ${isBento ? 'bg-black' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                    <div className={`px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-2 ${
                                        isBento
                                            ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm'
                                    }`}>
                                        <span>↓</span>
                                        <span>Next: Milestone {stage.stageNumber + 1}</span>
                                        <span>↓</span>
                                    </div>
                                    <div className={`w-0.5 h-5 ${isBento ? 'bg-black' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };



    // --- Node CRUD Actions ---
    const handleMoveNode = (moduleId: string, direction: 'up' | 'down') => {
        const sorted = [...modules].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
        const index = sorted.findIndex(m => m.moduleId === moduleId);
        if (index === -1) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sorted.length) return;

        const temp = sorted[index];
        sorted[index] = sorted[targetIndex];
        sorted[targetIndex] = temp;

        const updated = sorted.map((mod, i) => ({
            ...mod,
            level: i,
            coordinates: {
                x: (i % 3) * 340 + 50,
                y: Math.floor(i / 3) * 260 + 50
            }
        }));
        setModules(updated);
    };

    const handleUpdateNode = (updatedNode: SkillModule) => {
        setModules(prev => prev.map(m =>
            m.moduleId === updatedNode.moduleId ? updatedNode : m
        ));
    };

    const handleDeleteNode = async (moduleId: string) => {
        const isConfirmed = await confirm({
            title: 'Delete Module?',
            message: 'This will remove the module and all its connections.',
            confirmText: 'Delete',
            type: 'danger'
        });

        if (isConfirmed) {
            setModules(prev => prev.filter(m => m.moduleId !== moduleId));
            setModules(prev => prev.map(m => ({
                ...m,
                prerequisites: m.prerequisites?.filter(id => id !== moduleId)
            })));
            setIsInspectorOpen(false);
            setSelectedNodeId(null);
        }
    };

    const handleDuplicateNode = (original: SkillModule) => {
        const nextLevel = modules.length;
        const newNode: SkillModule = {
            ...original,
            moduleId: `mod_${Date.now()}`,
            title: `${original.title} (Copy)`,
            level: nextLevel,
            coordinates: {
                x: (nextLevel % 3) * 340 + 50,
                y: Math.floor(nextLevel / 3) * 260 + 50
            },
            status: NodeState.LOCKED
        };
        setModules(prev => [...prev, newNode]);
        onNotification('success', `Duplicated "${original.title}"`);
    };

    const handleCreateNode = (type: string) => {
        const nextLevel = modules.length;
        const newNode: SkillModule = {
            moduleId: `mod_${Date.now()}`,
            title: 'New Module',
            description: '',
            level: nextLevel,
            type: type as SkillModule['type'],
            status: NodeState.LOCKED,
            xpReward: 100,
            coordinates: {
                x: (nextLevel % 3) * 340 + 50,
                y: Math.floor(nextLevel / 3) * 260 + 50
            },
            prerequisites: [],
            subModules: []
        };
        setModules(prev => [...prev, newNode]);
        setSelectedNodeId(newNode.moduleId);
        setIsInspectorOpen(true);
    };

    const handleSave = useCallback(async () => {
        try {
            await persistRoadmap(undefined, modules, 'Roadmap saved successfully');
        } catch (error) {
            console.error("Save Error:", error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            onNotification('error', `Save Failed: ${message}`);
        }
    }, [modules, onNotification, persistRoadmap]);

    const handleJsonImport = async (data: { track?: Partial<SkillTrack>, modules: SkillModule[] }) => {
        const layoutedModules = applyAutoLayout(data.modules);
        const importedTrack: Partial<SkillTrack> = {
            ...(track || {}),
            ...(data.track || {}),
            title: data.track?.title || track?.title || 'Imported Roadmap',
            icon: data.track?.icon || track?.icon || '🗺️'
        };

        await persistRoadmap(importedTrack, layoutedModules, 'Roadmap imported and saved successfully');
        setIsImportModalOpen(false);
    };

    useEffect(() => {
        if (readOnly) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
            if (!isSaveShortcut) return;

            event.preventDefault();
            if (!saving) {
                void handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave, readOnly, saving]);

    const handleExportRoadmap = () => {
        const exportData = {
            title: track?.title || 'Learning Path',
            description: track?.description || '',
            icon: track?.icon || '🗺️',
            modules
        };

        const fileName = `${(track?.title || subjectId || 'roadmap')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'roadmap'}.json`;

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        onNotification('success', 'Current roadmap exported successfully');
    };

    const handleRedesign = () => {
        const sortedModules = [...modules].sort((a, b) => (a.level || 0) - (b.level || 0));
        const redesignedModules = sortedModules.map((mod, index) => ({
            ...mod,
            level: index,
            coordinates: {
                x: (index % 3) * 340 + 50,
                y: Math.floor(index / 3) * 260 + 50
            }
        }));

        setModules(redesignedModules);
        onNotification('success', 'Roadmap sequence reorganized & auto-numbered');
    };

    /**
     * Handle toggling a sub-module's completion status.
     * Uses optimistic UI for instant feedback while saving in background.
     * @param subModuleId - The ID of the sub-module to toggle
     */
    const handleToggleSubModule = async (subModuleId: string) => {
        if (!onSubModuleComplete || !track || !selectedModuleForDetails) {
            onNotification('error', 'Progress updates not available in this mode');
            return;
        }

        // Create the key in the format used by backend: "moduleId:subModuleId"
        const subModuleKey = `${selectedModuleForDetails.moduleId}:${subModuleId}`;
        const isAlreadyCompleted = localCompletedSubModules.includes(subModuleKey);

        // Don't allow uncompleting for now (one-way toggle)
        if (isAlreadyCompleted) {
            return;
        }

        // Set loading state for this specific sub-module
        setSavingSubModuleId(subModuleId);

        // Optimistic update: immediately add to local state
        setLocalCompletedSubModules(prev => [...prev, subModuleKey]);

        try {
            await onSubModuleComplete(track.trackId, selectedModuleForDetails.moduleId, subModuleId);
            onNotification('success', 'Progress saved! 🎉');
        } catch (error) {
            console.error('Failed to update sub-module progress:', error);
            // Rollback optimistic update on failure
            setLocalCompletedSubModules(prev => prev.filter(key => key !== subModuleKey));
            onNotification('error', 'Failed to save progress');
        } finally {
            setSavingSubModuleId(null);
        }
    };


    // --- Render ---
    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;

    return (
        <div className="relative flex flex-col flex-1">
            <div className={`rounded-3xl p-4 sm:p-5 transition-all ${
                isBento
                    ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0px_#000]'
                    : 'border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#111522]'
            }`}>
                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0">
                        {!readOnly ? (
                            <div className={`rounded-2xl p-4 transition-all ${
                                isBento
                                    ? 'bg-slate-50/80 text-black border border-slate-200/80'
                                    : 'border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#0B0E1A]'
                            }`}>
                                <div className="grid gap-4">
                                    <div className="grid gap-3 lg:grid-cols-[88px_minmax(0,1fr)]">
                                        <input
                                            type="text"
                                            value={track?.icon || '🗺️'}
                                            onChange={(event) => handleTrackFieldChange('icon', event.target.value)}
                                            className={`h-16 w-full rounded-2xl px-4 text-center text-2xl font-bold focus:outline-none transition-all ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                    : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/40'
                                            }`}
                                            maxLength={2}
                                            aria-label="Roadmap icon"
                                        />
                                        <div className="grid gap-3">
                                            <input
                                                type="text"
                                                value={track?.title || ''}
                                                onChange={(event) => handleTrackFieldChange('title', event.target.value)}
                                                placeholder="Roadmap title"
                                                className={`h-12 w-full rounded-2xl px-4 text-lg font-black focus:outline-none transition-all ${
                                                    isBento
                                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/40'
                                                }`}
                                            />
                                            <textarea
                                                value={track?.description || ''}
                                                onChange={(event) => handleTrackFieldChange('description', event.target.value)}
                                                placeholder="Short roadmap description"
                                                className={`h-16 w-full resize-none rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none transition-all ${
                                                    isBento
                                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/40'
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/20'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            id="trackIsVisible"
                                            checked={track?.isVisible !== false}
                                            onChange={(event) => handleTrackFieldChange('isVisible', event.target.checked)}
                                            className="h-5 w-5 rounded border-2 border-black text-emerald-600 focus:ring-black cursor-pointer"
                                        />
                                        <label htmlFor="trackIsVisible" className="cursor-pointer text-sm font-black text-black dark:text-emerald-100">
                                            Visible to students in learning catalog
                                        </label>
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        <button
                                            onClick={() => handleCreateNode(NodeType.CORE)}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                                isBento
                                                    ? 'bg-[#c4b5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#b49bfb] active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] text-gray-800 dark:text-gray-100 hover:border-indigo-300'
                                            }`}
                                        >
                                            <Zap size={15} />
                                            Add Core
                                        </button>
                                        <button
                                            onClick={() => handleCreateNode(NodeType.OPTIONAL)}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                                isBento
                                                    ? 'bg-[#6ee7b7] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#5eead4] active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] text-gray-800 dark:text-gray-100 hover:border-emerald-300'
                                            }`}
                                        >
                                            <Plus size={15} />
                                            Add Optional
                                        </button>
                                        <button
                                            onClick={() => handleCreateNode(NodeType.ACHIEVEMENT)}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                                isBento
                                                    ? 'bg-[#fcd34d] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fbbf24] active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] text-gray-800 dark:text-gray-100 hover:border-amber-300'
                                            }`}
                                        >
                                            <Star size={15} />
                                            Add Achievement
                                        </button>
                                        <button
                                            onClick={handleRedesign}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] text-gray-800 dark:text-gray-100'
                                            }`}
                                            title="Auto-organize modules sequentially"
                                        >
                                            <BrainCircuit size={15} />
                                            Auto Organize
                                        </button>
                                        <button
                                            onClick={() => setIsImportModalOpen(true)}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] text-gray-800 dark:text-gray-100'
                                            }`}
                                        >
                                            <FileJson size={15} />
                                            Import
                                        </button>
                                        <button
                                            onClick={handleExportRoadmap}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] text-gray-800 dark:text-gray-100'
                                            }`}
                                        >
                                            <Download size={15} />
                                            Export
                                        </button>
                                        <button
                                            onClick={() => setViewMode(prev => prev === 'admin' ? 'user' : 'admin')}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                                                isBento
                                                    ? viewMode === 'user'
                                                        ? 'bg-[#8b5cf6] text-white border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100'
                                                    : viewMode === 'user'
                                                        ? 'bg-cyan-500 text-white'
                                                        : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] text-gray-800 dark:text-gray-100'
                                            }`}
                                        >
                                            <Eye size={15} />
                                            {viewMode === 'user' ? 'Preview Active' : 'Student Preview'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`rounded-2xl p-4 transition-all ${
                                isBento
                                    ? 'bg-slate-50/80 text-black border border-slate-200/80'
                                    : 'border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#0B0E1A]'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                                        isBento
                                            ? 'bg-[#fef08a] border-2 border-black text-black'
                                            : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827]'
                                    }`}>
                                        {track?.icon || '🗺️'}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white">{track?.title || 'Learning Path'}</h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{track?.description || 'Track progress and lessons in one place.'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className={`flex h-full flex-col gap-4 rounded-2xl p-4 transition-all ${
                            isBento
                                ? 'bg-slate-50/80 text-black border border-slate-200/80'
                                : 'border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0B0E1A]'
                        }`}>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className={`rounded-xl px-3 py-3 ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-white dark:bg-[#161c2b]'
                                }`}>
                                    <div className="text-xl font-black text-gray-900 dark:text-white">{modules.length}</div>
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">Modules</div>
                                </div>
                                <div className={`rounded-xl px-3 py-3 ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-white dark:bg-[#161c2b]'
                                }`}>
                                    <div className="text-xl font-black text-gray-900 dark:text-white">{totalLessonCount}</div>
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">Lessons</div>
                                </div>
                                <div className={`rounded-xl px-3 py-3 ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'bg-white dark:bg-[#161c2b]'
                                }`}>
                                    <div className="text-xl font-black text-gray-900 dark:text-white">{linkedQuizCount}</div>
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">Quizzes</div>
                                </div>
                            </div>

                            {!readOnly && (
                                <div className={`flex flex-1 flex-col justify-between rounded-2xl p-4 transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                        : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b]'
                                }`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className={`text-sm font-black ${isDirty ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {isDirty ? '● Unsaved changes' : '✓ All changes saved'}
                                            </div>
                                            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                {isDirty ? 'Save before navigating away to keep updates.' : 'Use Ctrl/Cmd+S any time to save.'}
                                            </p>
                                        </div>
                                        {saving && <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-indigo-500" />}
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => void handleDiscardChanges()}
                                            disabled={!isDirty || saving}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40 transition-all cursor-pointer ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200'
                                            }`}
                                        >
                                            <RotateCcw size={14} />
                                            Discard
                                        </button>
                                        <button
                                            onClick={() => void handleSave()}
                                            disabled={saving || !isDirty}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-40 transition-all cursor-pointer ${
                                                isBento
                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#a3e635] active:translate-x-0.5 active:translate-y-0.5'
                                                    : 'bg-indigo-600 text-white'
                                            }`}
                                        >
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
                                            Save Road
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {renderSolidRoadmap()}

            {/* Inspector Panel */}
            {selectedNodeId && !readOnly && selectedNode && (
                <InspectorPanel
                    node={selectedNode}
                    isOpen={isInspectorOpen}
                    onClose={() => setIsInspectorOpen(false)}
                    onUpdate={handleUpdateNode}
                    onDelete={handleDeleteNode}
                    onDuplicate={handleDuplicateNode}
                    allNodes={modules}
                    availableQuizzes={quizzes}
                    availableBadges={badges}
                />
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                {...confirmState}
                onCancel={handleCancel}
            />

            {/* Module Details Dialog */}
            {isModuleDetailsOpen && selectedModuleForDetails && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsModuleDetailsOpen(false)}>
                    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${selectedModuleForDetails.type === 'optional' ? 'bg-emerald-500' :
                                    selectedModuleForDetails.type === 'achievement' ? 'bg-amber-500' :
                                        'bg-indigo-500'
                                    }`} />
                                <h3 className="text-xl font-bold text-white">{selectedModuleForDetails.title}</h3>
                            </div>
                            <button
                                onClick={() => setIsModuleDetailsOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-140px)]">
                            {/* Description */}
                            <div className="mb-6">
                                <p className="text-gray-700 dark:text-slate-300 leading-relaxed">{selectedModuleForDetails.description || 'No description available.'}</p>
                            </div>

                            {/* Info Cards */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="bg-gray-100 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700/50">
                                    <div className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Level</div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{(selectedModuleForDetails.level ?? 0) + 1}</div>
                                </div>
                                <div className="bg-gray-100 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700/50">
                                    <div className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Type</div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white capitalize">{selectedModuleForDetails.type || 'core'}</div>
                                </div>
                                <div className="bg-gray-100 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700/50">
                                    <div className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">XP Reward</div>
                                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{selectedModuleForDetails.xpReward || 0}</div>
                                </div>
                            </div>

                            {/* Quizzes Section */}
                            {selectedModuleForDetails.quizIds && selectedModuleForDetails.quizIds.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Quizzes to Complete
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedModuleForDetails.quizIds.map((quizId) => {
                                            const quiz = quizzes.find(q => q._id === quizId);
                                            // Check if quiz is completed (you may need to adjust this logic based on your data structure)
                                            const isQuizCompleted = userProgress?.completedModules?.includes(quizId) || false;
                                            
                                            return (
                                                <div key={quizId} className={`bg-gray-100 dark:bg-slate-800/50 rounded-lg p-3 border transition-all ${
                                                    isQuizCompleted ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-slate-700/50'
                                                }`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${isQuizCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                                        <div className="flex-1">
                                                            <div className={`text-sm font-medium ${isQuizCompleted ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                                                {quiz?.title || quizId}
                                                            </div>
                                                            {quiz?.description && (
                                                                <div className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">{quiz.description}</div>
                                                            )}
                                                        </div>
                                                        <div className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                                                            isQuizCompleted 
                                                                ? 'bg-emerald-500/20 text-emerald-400' 
                                                                : 'bg-amber-500/20 text-amber-400'
                                                        }`}>
                                                            {isQuizCompleted ? '✓ Done' : '⚠ Not Done'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Sub-Modules Section */}
                            {selectedModuleForDetails.subModules && selectedModuleForDetails.subModules.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                        Sub-Modules
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedModuleForDetails.subModules.map((subModule) => {
                                            // Use the correct key format: "moduleId:subModuleId"
                                            const subModuleKey = `${selectedModuleForDetails.moduleId}:${subModule.id}`;
                                            const isCompleted = localCompletedSubModules.includes(subModuleKey);
                                            const isSaving = savingSubModuleId === subModule.id;

                                            return (
                                                <div
                                                    key={subModule.id}
                                                    className={`bg-gray-100 dark:bg-slate-800/50 rounded-lg p-3 border transition-all ${isCompleted ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-slate-700/50'
                                                        } ${isSaving ? 'opacity-70' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => handleToggleSubModule(subModule.id)}
                                                            disabled={isSaving || isCompleted}
                                                            aria-label={isCompleted ? `${subModule.title} completed` : `Mark ${subModule.title} as complete`}
                                                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isCompleted
                                                                ? 'bg-emerald-500 border-emerald-500 cursor-default'
                                                                : isSaving
                                                                    ? 'border-amber-400 animate-pulse cursor-wait'
                                                                    : 'border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/10 cursor-pointer'
                                                                }`}
                                                        >
                                                            {isSaving ? (
                                                                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                                                            ) : isCompleted ? (
                                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : null}
                                                        </button>
                                                        <div className="flex-1">
                                                            <div className={`text-sm font-medium ${isCompleted ? 'text-emerald-400 line-through' : 'text-white'}`}>
                                                                {subModule.title}
                                                            </div>
                                                        </div>
                                                        <div className={`text-xs font-semibold ${isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {isCompleted ? '✓' : '+'}{subModule.xp} XP
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {(!selectedModuleForDetails.quizIds || selectedModuleForDetails.quizIds.length === 0) &&
                                (!selectedModuleForDetails.subModules || selectedModuleForDetails.subModules.length === 0) && (
                                    <div className="text-center py-8 text-slate-400">
                                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <p>No quizzes or sub-modules yet</p>
                                    </div>
                                )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-700 flex justify-end">
                            <button
                                onClick={() => setIsModuleDetailsOpen(false)}
                                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* JSON Importer */}
            <RoadmapJsonImporter
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleJsonImport}
            />
        </div>
    );
};

export default RoadmapManagement;
