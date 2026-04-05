import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dagre from 'dagre';
import { api } from '../../lib/api';
import type { SkillModule, SkillTrack, Quiz, BadgeNode } from '../../types';
import { NodeType, NodeState } from '../../types';
import {
    Save, Zap, Star, Loader2, FileJson, Download,
    Plus, Eye, Check, BrainCircuit, Lock as LockIcon, RotateCcw,
    Sparkles, Trophy, BookOpen, Target
} from 'lucide-react';
import { InspectorPanel } from './InspectorPanel';
import { RoadmapJsonImporter } from './RoadmapJsonImporter';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/ConfirmDialog';

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
    // Data state
    const [track, setTrack] = useState<SkillTrack | null>(null);
    const [modules, setModules] = useState<SkillModule[]>([]);
    const [savedDraft, setSavedDraft] = useState<RoadmapDraftState | null>(null);

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'admin' | 'user'>('admin');
    const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
    }, [modules, isModuleDetailsOpen, selectedModuleForDetails?.moduleId]);

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
                api.getSkillTracks(subjectId),
                api.getQuizzes(subjectId).catch(() => []), // Fail gracefully
                api.getBadgeNodes().catch(() => [])
            ]);

            setQuizzes(quizzesData);
            setBadges(badgesData);

            let existingTrack = tracksData.find((t: SkillTrack) => t.subjectId === subjectId);
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

    const handleTrackFieldChange = useCallback((field: 'title' | 'description' | 'icon', value: string) => {
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

    const sketchLayout = useMemo(() => {
        const ordered = [...modules].sort((a, b) => (a.level || 0) - (b.level || 0) || a.title.localeCompare(b.title));
        const xPositions = [210, 550];
        const ySpacing = 260;

        return ordered.map((module, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);

            // Use module's stored coordinates if available, otherwise use calculated position
            const x = module.coordinates?.x ?? xPositions[col];
            const y = module.coordinates?.y ?? (row * ySpacing);

            return {
                module,
                x,
                y,
                col,
                row
            };
        });
    }, [modules]);

    const renderSketch = () => {
        if (sketchLayout.length === 0) {
            return (
                <div className="flex flex-1 items-center justify-center text-sm text-gray-500 dark:text-slate-400">
                    No modules yet.
                </div>
            );
        }

        const getModuleTheme = (module: SkillModule) => {
            switch (module.type) {
                case NodeType.OPTIONAL:
                    return {
                        Icon: Sparkles,
                        primary: '#10b981',
                        secondary: '#22d3ee',
                        text: '#047857',
                        darkText: '#6ee7b7',
                        surface: 'rgba(16, 185, 129, 0.12)',
                        outline: 'rgba(16, 185, 129, 0.28)',
                        shadow: '0 28px 60px -36px rgba(16, 185, 129, 0.5)'
                    };
                case NodeType.ACHIEVEMENT:
                    return {
                        Icon: Trophy,
                        primary: '#f59e0b',
                        secondary: '#fb7185',
                        text: '#b45309',
                        darkText: '#fcd34d',
                        surface: 'rgba(245, 158, 11, 0.12)',
                        outline: 'rgba(245, 158, 11, 0.28)',
                        shadow: '0 28px 60px -36px rgba(245, 158, 11, 0.45)'
                    };
                case NodeType.QUIZ:
                case NodeType.EXAM:
                    return {
                        Icon: Target,
                        primary: '#ef4444',
                        secondary: '#fb7185',
                        text: '#b91c1c',
                        darkText: '#fda4af',
                        surface: 'rgba(239, 68, 68, 0.12)',
                        outline: 'rgba(239, 68, 68, 0.26)',
                        shadow: '0 28px 60px -36px rgba(239, 68, 68, 0.45)'
                    };
                default:
                    return {
                        Icon: Zap,
                        primary: '#6366f1',
                        secondary: '#38bdf8',
                        text: '#4338ca',
                        darkText: '#a5b4fc',
                        surface: 'rgba(99, 102, 241, 0.12)',
                        outline: 'rgba(99, 102, 241, 0.26)',
                        shadow: '0 28px 60px -36px rgba(79, 70, 229, 0.5)'
                    };
            }
        };

        const timelineItems = readOnly
            ? sketchLayout.filter(item => {
                const { isLocked } = computeStatus(item.module);
                return !(viewMode === 'user' && isLocked);
            })
            : sketchLayout;

        if (timelineItems.length === 0) {
            return (
                <div className="flex flex-1 items-center justify-center text-sm text-gray-500 dark:text-slate-400">
                    No unlocked modules yet.
                </div>
            );
        }

        const cardWidth = NODE_WIDTH + 40;
        const cardHeight = NODE_HEIGHT + 48;
        const maxX = Math.max(...timelineItems.map(item => item.x));
        const maxY = Math.max(...timelineItems.map(item => item.y));
        const svgWidth = Math.max(760, maxX + cardWidth + 96);
        const svgHeight = Math.max(460, maxY + cardHeight + 120);
        const isEditingCanvas = !readOnly && viewMode === 'admin';

        const connectors = timelineItems.slice(0, -1).map((node, idx) => {
            const next = timelineItems[idx + 1];
            const startX = node.x + cardWidth / 2;
            const startY = node.y + cardHeight - 10;
            const endX = next.x + cardWidth / 2;
            const endY = next.y + 10;
            const curveOffset = Math.max(56, Math.abs(endY - startY) * 0.32);

            return {
                id: `${node.module.moduleId}-${next.module.moduleId}`,
                d: `M ${startX} ${startY} C ${startX} ${startY + curveOffset}, ${endX} ${endY - curveOffset}, ${endX} ${endY}`,
                startX,
                startY,
                endX,
                endY,
                color: getModuleTheme(next.module).primary
            };
        });

        const canvasBackground = {
            backgroundImage: `
                radial-gradient(circle at top, rgba(99, 102, 241, 0.16), transparent 28%),
                radial-gradient(circle at bottom right, rgba(34, 211, 238, 0.12), transparent 24%),
                linear-gradient(180deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.08))
            `
        };

        const gridPattern = {
            backgroundImage: `
                linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px),
                linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px'
        };

        return (
            <div className="relative w-full bg-white dark:bg-[#090d18] rounded-3xl mt-4 border border-gray-200 dark:border-white/5" style={{ ...canvasBackground, minHeight: Math.max(600, svgHeight) }}>
                <div className="pointer-events-none absolute inset-0 opacity-40 rounded-3xl" style={gridPattern} />
                <div className="w-full min-h-full px-3 py-6 sm:px-4 sm:py-8">
                    <div className="mx-auto flex w-full justify-center">
                        <div
                            className="relative w-full mx-auto"
                            style={{ minWidth: svgWidth, minHeight: svgHeight }}
                            onMouseMove={isEditingCanvas ? handleMouseMove : undefined}
                            onMouseUp={isEditingCanvas ? handleMouseUp : undefined}
                            onMouseLeave={isEditingCanvas ? handleMouseUp : undefined}
                        >
                            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                                {connectors.map(connector => (
                                    <g key={connector.id}>
                                        <path
                                            d={connector.d}
                                            fill="none"
                                            stroke={connector.color}
                                            strokeWidth={3}
                                            strokeLinecap="round"
                                            opacity={0.28}
                                            strokeDasharray={isEditingCanvas ? '10 10' : undefined}
                                        />
                                        <circle cx={connector.startX} cy={connector.startY} r={4} fill={connector.color} opacity={0.28} />
                                        <circle cx={connector.endX} cy={connector.endY} r={4} fill={connector.color} opacity={0.36} />
                                    </g>
                                ))}
                            </svg>

                            {timelineItems.map((item) => {
                                const { module } = item;
                                const { status, isCompleted, isLocked } = computeStatus(module);
                                const moduleNumber = typeof module.level === 'number'
                                    ? module.level + 1
                                    : (item.row * 2 + item.col + 1);
                                const lessonCount = module.subModules?.length || 0;
                                const quizCount = module.quizIds?.length || (module.quizId ? 1 : 0);
                                const xpReward = module.xpReward || 0;
                                const theme = getModuleTheme(module);
                                const ThemeIcon = theme.Icon;
                                const cardDescription = isLocked
                                    ? 'Complete the required modules to unlock this step.'
                                    : (module.description || 'Add a short description for this module.');
                                const statusLabel = isLocked
                                    ? 'Locked'
                                    : isCompleted
                                        ? 'Completed'
                                        : status === 'available'
                                            ? 'Ready'
                                            : status;
                                const statusClass = isLocked
                                    ? 'border-gray-300 bg-gray-100 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400'
                                    : isCompleted
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                                        : 'border-white/10 bg-white/70 text-gray-700 dark:bg-white/5 dark:text-slate-200';

                                const handleModuleClick = () => {
                                    if (readOnly) {
                                        if (isLocked) {
                                            onNotification('error', 'Complete previous modules to unlock this one');
                                            return;
                                        }
                                        setSelectedModuleForDetails(module);
                                        setIsModuleDetailsOpen(true);
                                        return;
                                    }

                                    if (!draggedModuleId && viewMode === 'admin') {
                                        setSelectedNodeId(module.moduleId);
                                        setIsInspectorOpen(true);
                                    }
                                };

                                return (
                                    <div
                                        key={module.moduleId}
                                        className="absolute"
                                        style={{ left: item.x, top: item.y, width: cardWidth, height: cardHeight, pointerEvents: 'auto' }}
                                    >
                                        <div
                                            className={`relative flex h-full w-full overflow-hidden rounded-[28px] border bg-white/95 dark:bg-[#0f172a]/94 transition-all duration-200 ${
                                                isEditingCanvas ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                            } ${isLocked ? 'opacity-75' : ''} ${draggedModuleId === module.moduleId ? 'opacity-70' : ''}`}
                                            style={{
                                                borderColor: selectedNodeId === module.moduleId ? theme.primary : theme.outline,
                                                boxShadow: selectedNodeId === module.moduleId
                                                    ? `0 0 0 1px ${theme.primary}, ${theme.shadow}`
                                                    : theme.shadow
                                            }}
                                            onMouseDown={(event) => {
                                                if (isEditingCanvas) {
                                                    handleModuleMouseDown(module.moduleId, event);
                                                }
                                            }}
                                            onClick={handleModuleClick}
                                            role="button"
                                            aria-disabled={readOnly && isLocked}
                                            tabIndex={readOnly && isLocked ? -1 : 0}
                                        >
                                            <div
                                                className="absolute inset-x-0 top-0 h-1.5"
                                                style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})` }}
                                            />
                                            <div
                                                className="pointer-events-none absolute -right-4 top-3 text-5xl font-black tracking-tight text-gray-200/60 dark:text-white/5"
                                                aria-hidden="true"
                                            >
                                                {String(moduleNumber).padStart(2, '0')}
                                            </div>

                                            <div className="flex h-full w-full flex-col p-4 sm:p-5">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                                        <div
                                                            className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl border"
                                                            style={{ backgroundColor: theme.surface, borderColor: theme.outline, color: theme.primary }}
                                                        >
                                                            {module.icon ? (
                                                                <span className="text-lg">{module.icon}</span>
                                                            ) : (
                                                                <ThemeIcon size={18} />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div
                                                                className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
                                                                style={{
                                                                    backgroundColor: theme.surface,
                                                                    borderColor: theme.outline,
                                                                    color: theme.darkText
                                                                }}
                                                            >
                                                                {module.type || 'core'}
                                                            </div>
                                                            <div className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500">
                                                                Module {String(moduleNumber).padStart(2, '0')}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                                        {isCompleted && <Check className="h-4 w-4 text-emerald-500" />}
                                                        {isLocked && <LockIcon className="h-4 w-4 text-gray-400 dark:text-slate-500" />}
                                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 min-w-0 space-y-2.5">
                                                    <h4 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-white">
                                                        {module.title}
                                                    </h4>
                                                    <p className={`line-clamp-3 text-sm leading-6 ${isLocked ? 'text-gray-400 dark:text-slate-500' : 'text-gray-600 dark:text-slate-300'}`}>
                                                        {cardDescription}
                                                    </p>
                                                </div>

                                                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                                        <BookOpen size={13} />
                                                        {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                                                        <Target size={13} />
                                                        {quizCount} quiz{quizCount === 1 ? '' : 'zes'}
                                                    </span>
                                                    <span
                                                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                                                        style={{
                                                            backgroundColor: theme.surface,
                                                            borderColor: theme.outline,
                                                            color: theme.darkText
                                                        }}
                                                    >
                                                        <Star size={13} />
                                                        {xpReward} XP
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    // --- Node CRUD Actions ---
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
        const newNode: SkillModule = {
            ...original,
            moduleId: `mod_${Date.now()}`,
            title: `${original.title} (Copy)`,
            coordinates: {
                x: (original.coordinates?.x || 0) + 60,
                y: (original.coordinates?.y || 0) + 60
            },
            status: NodeState.LOCKED
        };
        setModules(prev => [...prev, newNode]);
    };

    const handleCreateNode = (type: string) => {
        const newNode: SkillModule = {
            moduleId: `mod_${Date.now()}`,
            title: 'New Module',
            description: '',
            level: modules.length,
            type: type as any,
            status: NodeState.LOCKED,
            xpReward: 100,
            coordinates: { x: 100, y: 100 },
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
        } catch (error: any) {
            console.error("Save Error:", error);
            onNotification('error', `Save Failed: ${error.message || 'Unknown error'}`);
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
        // Reorganize modules: sort by level, reassign levels sequentially with 2-column layout
        const sortedModules = [...modules].sort((a, b) => (a.level || 0) - (b.level || 0));

        // Apply 2-column auto layout
        const xPositions = [210, 550];
        const ySpacing = 260;

        const redesignedModules = sortedModules.map((mod, index) => {
            const col = index % 2;
            const row = Math.floor(index / 2);

            return {
                ...mod,
                level: index,
                coordinates: {
                    x: xPositions[col],
                    y: row * ySpacing
                }
            };
        });

        setModules(redesignedModules);
        onNotification('success', 'Roadmap redesigned and reorganized');
    };

    const handleModuleMouseDown = (moduleId: string, e: React.MouseEvent) => {
        if (readOnly || viewMode !== 'admin' || e.button !== 0) return; // Left click only

        e.stopPropagation(); // Prevent canvas panning when dragging module

        const module = modules.find(m => m.moduleId === moduleId);
        if (!module) return;

        // Store the starting position and mouse position
        setDraggedModuleId(moduleId);
        setDragOffset({
            x: e.clientX - (module.coordinates?.x || 0),
            y: e.clientY - (module.coordinates?.y || 0)
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggedModuleId) return;

        e.stopPropagation();

        // Calculate new position based on mouse movement
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Update module coordinates
        setModules(prev => prev.map(m =>
            m.moduleId === draggedModuleId
                ? { ...m, coordinates: { x: Math.max(0, Math.round(newX)), y: Math.max(0, Math.round(newY)) } }
                : m
        ));
    };

    const handleMouseUp = () => {
        setDraggedModuleId(null);
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
            <div className="border border-gray-200 dark:border-white/10 rounded-3xl bg-white/95 dark:bg-[#111522] px-5 py-4">
                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0">
                        {!readOnly ? (
                            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#0B0E1A] p-4">
                                <div className="grid gap-4">
                                    <div className="grid gap-3 lg:grid-cols-[88px_minmax(0,1fr)]">
                                        <input
                                            type="text"
                                            value={track?.icon || '🗺️'}
                                            onChange={(event) => handleTrackFieldChange('icon', event.target.value)}
                                            className="h-16 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] px-4 text-center text-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                            maxLength={2}
                                            aria-label="Roadmap icon"
                                        />
                                        <div className="grid gap-3">
                                            <input
                                                type="text"
                                                value={track?.title || ''}
                                                onChange={(event) => handleTrackFieldChange('title', event.target.value)}
                                                placeholder="Roadmap title"
                                                className="h-12 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] px-4 text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                            />
                                            <textarea
                                                value={track?.description || ''}
                                                onChange={(event) => handleTrackFieldChange('description', event.target.value)}
                                                placeholder="Short roadmap description"
                                                className="h-16 w-full resize-none rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] px-4 py-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        <button onClick={() => handleCreateNode(NodeType.CORE)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:border-indigo-300 dark:hover:border-indigo-500/40">
                                            <Zap size={15} />
                                            Add Core
                                        </button>
                                        <button onClick={() => handleCreateNode(NodeType.OPTIONAL)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:border-emerald-300 dark:hover:border-emerald-500/40">
                                            <Plus size={15} />
                                            Add Optional
                                        </button>
                                        <button onClick={() => handleCreateNode(NodeType.ACHIEVEMENT)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:border-amber-300 dark:hover:border-amber-500/40">
                                            <Star size={15} />
                                            Add Achievement
                                        </button>
                                        <button onClick={handleRedesign} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            <BrainCircuit size={15} />
                                            Auto Layout
                                        </button>
                                        <button onClick={() => setIsImportModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            <FileJson size={15} />
                                            Import
                                        </button>
                                        <button onClick={handleExportRoadmap} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            <Download size={15} />
                                            Export
                                        </button>
                                        <button onClick={() => setViewMode(prev => prev === 'admin' ? 'user' : 'admin')} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${viewMode === 'user' ? 'bg-cyan-500 text-white' : 'border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] text-gray-800 dark:text-gray-100'}`}>
                                            <Eye size={15} />
                                            {viewMode === 'user' ? 'Preview On' : 'Preview'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#0B0E1A] p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] text-2xl">
                                        {track?.icon || '🗺️'}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{track?.title || 'Learning Path'}</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{track?.description || 'Track progress and lessons in one place.'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="flex h-full flex-col gap-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0B0E1A] p-4">
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="rounded-xl bg-white dark:bg-[#161c2b] px-3 py-3">
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{modules.length}</div>
                                    <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Modules</div>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161c2b] px-3 py-3">
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{totalLessonCount}</div>
                                    <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Lessons</div>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#161c2b] px-3 py-3">
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{linkedQuizCount}</div>
                                    <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Quizzes</div>
                                </div>
                            </div>

                            {!readOnly && (
                                <div className="flex flex-1 flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161c2b] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className={`text-sm font-semibold ${isDirty ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {isDirty ? 'Unsaved changes' : 'All changes saved'}
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                {isDirty ? 'Save before leaving this screen to keep the latest roadmap edits.' : 'Use Ctrl/Cmd+S any time to save quickly.'}
                                            </p>
                                        </div>
                                        {saving && <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-indigo-500" />}
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => void handleDiscardChanges()}
                                            disabled={!isDirty || saving}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <RotateCcw size={16} />
                                            Discard
                                        </button>
                                        <button
                                            onClick={() => void handleSave()}
                                            disabled={saving || !isDirty}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {renderSketch()}

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
