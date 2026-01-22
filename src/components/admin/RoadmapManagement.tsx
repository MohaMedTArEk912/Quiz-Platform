import React, { useState, useEffect, useMemo } from 'react';
import dagre from 'dagre';
import { api } from '../../lib/api';
import type { SkillModule, SkillTrack, Quiz, BadgeNode } from '../../types';
import { NodeType, NodeState } from '../../types';
import {
    Save, Zap, Star, Loader2, FileJson,
    Plus, Eye, Check, BrainCircuit, Lock as LockIcon
} from 'lucide-react';
import { InspectorPanel } from './InspectorPanel';
import { RoadmapJsonImporter } from './RoadmapJsonImporter';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/ConfirmDialog';

interface RoadmapManagementProps {
    adminId: string;
    onNotification: (type: 'success' | 'error', message: string) => void;
    subjectId?: string;
    readOnly?: boolean;
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

/**
 * Helper: Resolve Node Appearance
 */


const RoadmapManagement: React.FC<RoadmapManagementProps> = ({ adminId, onNotification, subjectId, readOnly = false, userProgress, onSubModuleComplete }) => {
    // Data state
    const [track, setTrack] = useState<SkillTrack | null>(null);
    const [modules, setModules] = useState<SkillModule[]>([]);

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

    // Sync local state with props when userProgress changes
    React.useEffect(() => {
        if (userProgress?.completedSubModules) {
            setLocalCompletedSubModules(userProgress.completedSubModules);
        }
    }, [userProgress?.completedSubModules]);

    const { confirm, confirmState, handleCancel } = useConfirm();

    // --- Initialization ---
    useEffect(() => { loadData(); }, [subjectId]);

    const loadData = async () => {
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
            }
        } catch (error) {
            console.error(error);
            onNotification('error', 'Failed to load graph');
        } finally { setLoading(false); }
    };

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
                <div className="flex flex-1 items-center justify-center text-gray-500 text-sm">No modules yet.</div>
            );
        }

        // User view - Infinite Canvas with grab-to-pan
        if (readOnly) {
            const visibleModules = sketchLayout.filter(item => {
                const { isLocked } = computeStatus(item.module);
                return !(viewMode === 'user' && isLocked);
            });

            const boxWidth = NODE_WIDTH + 40;
            const boxHeight = NODE_HEIGHT + 30;
            const svgWidth = 920;
            const svgHeight = Math.max(...visibleModules.map(n => n.y)) + boxHeight + 80;

            const connectors = visibleModules.slice(0, -1).map((node, idx) => {
                const next = visibleModules[idx + 1];
                const startX = node.x + boxWidth / 2;
                const startY = node.y + boxHeight;
                const endX = next.x + boxWidth / 2;
                const endY = next.y;

                const midY = (startY + endY) / 2;
                return { startX, startY, midY, endX, endY };
            });

            return (
                <div className="relative flex-1 overflow-auto">
                    <div className="w-full min-h-full py-8 px-4" style={{ minHeight: svgHeight }}>
                        <div className="relative mx-auto" style={{ width: svgWidth, minHeight: svgHeight }}>
                            <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ pointerEvents: 'none' }}>
                                    <defs>
                                        <linearGradient id="userSketchCore" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#8b5cf6" />
                                        </linearGradient>
                                    </defs>
                                    {connectors.map((c, idx) => (
                                        <g key={`c-${idx}`}>
                                            {/* Pipe/pipe shadow for depth */}
                                            <path
                                                d={`M ${c.startX} ${c.startY} L ${c.startX} ${c.midY} L ${c.endX} ${c.midY} L ${c.endX} ${c.endY}`}
                                                fill="none"
                                                stroke="#1e293b"
                                                strokeWidth={8}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity={0.6}
                                            />
                                            {/* Main pipe - bright and solid */}
                                            <path
                                                d={`M ${c.startX} ${c.startY} L ${c.startX} ${c.midY} L ${c.endX} ${c.midY} L ${c.endX} ${c.endY}`}
                                                fill="none"
                                                stroke="url(#userSketchCore)"
                                                strokeWidth={6}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity={0.8}
                                            />
                                            {/* Highlight for 3D effect */}
                                            <path
                                                d={`M ${c.startX} ${c.startY} L ${c.startX} ${c.midY} L ${c.endX} ${c.midY} L ${c.endX} ${c.endY}`}
                                                fill="none"
                                                stroke="#a78bfa"
                                                strokeWidth={2}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                opacity={0.4}
                                            />
                                        </g>
                                    ))}
                                </svg>

                                {visibleModules.map((item) => {
                                    const { module } = item;
                                    const { status, isCompleted, isLocked } = computeStatus(module);
                                    const moduleNumber = (module.level ?? 0) + 1;

                                    const isOptional = module.type === 'optional';
                                    const isAchievement = module.type === 'achievement';

                                    const borderClass = isLocked
                                        ? 'border-slate-600/40'
                                        : isOptional ? 'border-emerald-500/40'
                                            : isAchievement ? 'border-amber-500/40'
                                                : 'border-indigo-500/40';

                                    const numberColorClass = isLocked
                                        ? 'text-slate-500'
                                        : isOptional ? 'text-emerald-400'
                                            : isAchievement ? 'text-amber-400'
                                                : 'text-indigo-400';

                                    // Handle click - only allow for unlocked modules
                                    const handleModuleClick = () => {
                                        if (isLocked) {
                                            onNotification('error', '🔒 Complete previous modules to unlock this one');
                                            return;
                                        }
                                        setSelectedModuleForDetails(module);
                                        setIsModuleDetailsOpen(true);
                                    };

                                    return (
                                        <div
                                            key={module.moduleId}
                                            className="absolute"
                                            style={{ left: item.x, top: item.y, width: boxWidth, height: boxHeight, pointerEvents: 'auto' }}
                                        >
                                            <div
                                                className={`h-full w-full rounded-xl border bg-gradient-to-br ${isLocked
                                                    ? 'from-gray-200 to-gray-300 dark:from-slate-950 dark:to-slate-900 opacity-60 cursor-not-allowed'
                                                    : 'from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 cursor-pointer hover:shadow-xl'
                                                    } flex flex-col transition-all duration-300 ${borderClass} shadow-lg`}
                                                onClick={handleModuleClick}
                                                role="button"
                                                aria-disabled={isLocked}
                                                tabIndex={isLocked ? -1 : 0}
                                            >
                                                <div className={`px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700/50`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-gray-400 dark:bg-slate-600'
                                                            : isOptional ? 'bg-emerald-500'
                                                                : isAchievement ? 'bg-amber-500'
                                                                    : 'bg-indigo-500'
                                                            }`} />
                                                        <span className={`text-xs font-semibold uppercase tracking-wider ${isLocked ? 'text-gray-400 dark:text-slate-600' : 'text-gray-500 dark:text-slate-400'}`}>
                                                            {module.type || 'core'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-semibold">
                                                        {isLocked && <LockIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" />}
                                                        {isCompleted && <Check className="w-4 h-4 text-emerald-500" />}
                                                        <span className={numberColorClass}>#{moduleNumber}</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 px-6 py-4 flex flex-col gap-2.5">
                                                    <h4 className={`font-semibold text-sm leading-tight line-clamp-2 ${isLocked ? 'text-gray-500 dark:text-slate-500' : 'text-gray-900 dark:text-white'}`}>
                                                        {module.title}
                                                    </h4>
                                                    <p className={`text-xs leading-relaxed line-clamp-2 ${isLocked ? 'text-gray-400 dark:text-slate-600' : 'text-gray-600 dark:text-slate-400'}`}>
                                                        {isLocked ? 'Complete previous modules to unlock' : (module.description || 'Keep going to unlock the next milestone.')}
                                                    </p>
                                                </div>

                                                <div className="px-6 py-3 border-t border-gray-200 dark:border-slate-700/50 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
                                                    <span className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wider font-medium">Level {moduleNumber}</span>
                                                    <span className={`text-xs font-semibold uppercase tracking-wider ${isLocked ? 'text-gray-400 dark:text-slate-600'
                                                        : isCompleted ? 'text-emerald-500'
                                                            : 'text-indigo-600 dark:text-indigo-400'
                                                        }`}>
                                                        {isLocked ? '🔒 Locked' : status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            );
        }

        // Admin view - Infinite Canvas with grab-to-pan and editing
        const boxWidth = NODE_WIDTH + 40;
        const boxHeight = NODE_HEIGHT + 30;
        const svgWidth = 920;
        const svgHeight = Math.max(...sketchLayout.map(n => n.y)) + boxHeight + 80;

        const connectors = sketchLayout.slice(0, -1).map((node, idx) => {
            const next = sketchLayout[idx + 1];
            const startX = node.x + boxWidth / 2;
            const startY = node.y + boxHeight;
            const endX = next.x + boxWidth / 2;
            const endY = next.y;

            const midY = (startY + endY) / 2;
            return { startX, startY, midY, endX, endY };
        });

        return (
            <div className="relative flex-1 overflow-auto">
                <div className="w-full min-h-full py-8 px-4" style={{ minHeight: svgHeight }}>
                    <div
                        className="relative mx-auto"
                        style={{ width: svgWidth, minHeight: svgHeight }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ pointerEvents: 'none' }}>
                                <defs>
                                    <linearGradient id="sketchCore" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                                {connectors.map((c, idx) => (
                                    <g key={`c-${idx}`}>
                                        {/* Pipe/pipe shadow for depth */}
                                        <path
                                            d={`M ${c.startX} ${c.startY} L ${c.startX} ${c.midY} L ${c.endX} ${c.midY} L ${c.endX} ${c.endY}`}
                                            fill="none"
                                            stroke="#1e293b"
                                            strokeWidth={8}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            opacity={0.6}
                                        />
                                        {/* Main pipe - bright and solid */}
                                        <path
                                            d={`M ${c.startX} ${c.startY} L ${c.startX} ${c.midY} L ${c.endX} ${c.midY} L ${c.endX} ${c.endY}`}
                                            fill="none"
                                            stroke="url(#sketchCore)"
                                            strokeWidth={6}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            opacity={0.8}
                                        />
                                        {/* Highlight for 3D effect */}
                                        <path
                                            d={`M ${c.startX} ${c.startY} L ${c.startX} ${c.midY} L ${c.endX} ${c.midY} L ${c.endX} ${c.endY}`}
                                            fill="none"
                                            stroke="#a78bfa"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            opacity={0.4}
                                        />
                                    </g>
                                ))}
                            </svg>

                            {sketchLayout.map((item) => {
                                const { module } = item;
                                const { status, isCompleted } = computeStatus(module);
                                const moduleNumber = (module.level ?? 0) + 1;

                                // In user preview mode, skip locked modules
                                if (viewMode === 'user' && computeStatus(module).isLocked && readOnly) {
                                    return null;
                                }

                                // Define color classes based on module type
                                const isOptional = module.type === 'optional';
                                const isAchievement = module.type === 'achievement';

                                const borderClass = isOptional ? 'border-emerald-500/40' :
                                    isAchievement ? 'border-amber-500/40' :
                                        'border-indigo-500/40';

                                const numberColorClass = isOptional ? 'text-emerald-400' :
                                    isAchievement ? 'text-amber-400' :
                                        'text-indigo-400';

                                return (
                                    <div
                                        key={module.moduleId}
                                        className="absolute group"
                                        style={{ left: item.x, top: item.y, width: boxWidth, height: boxHeight, pointerEvents: 'auto' }}
                                    >
                                        <div
                                            className={`h-full w-full rounded-xl border bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 flex flex-col transition-all duration-300 ${borderClass} shadow-lg hover:shadow-xl ${!readOnly && viewMode === 'admin' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${selectedNodeId === module.moduleId ? 'ring-2 ring-indigo-500' : ''} ${draggedModuleId === module.moduleId ? 'opacity-75' : ''}`}
                                            onMouseDown={(e) => {
                                                if (!readOnly && viewMode === 'admin') {
                                                    handleModuleMouseDown(module.moduleId, e);
                                                }
                                            }}
                                            onClick={() => {
                                                if (!readOnly && viewMode === 'admin' && !draggedModuleId) {
                                                    setSelectedNodeId(module.moduleId);
                                                    setIsInspectorOpen(true);
                                                }
                                            }}
                                        >
                                            <div className={`px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700/50`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${isOptional ? 'bg-emerald-500' : isAchievement ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">{module.type || 'core'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-semibold">
                                                    {isCompleted && <Check className="w-4 h-4 text-emerald-500" />}
                                                    <span className={numberColorClass}>#{moduleNumber}</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 px-6 py-4 flex flex-col gap-2.5">
                                                <h4 className="text-gray-900 dark:text-white font-semibold text-sm leading-tight line-clamp-2">{module.title}</h4>
                                                <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed line-clamp-2">{module.description || 'Keep going to unlock the next milestone.'}</p>
                                            </div>

                                            <div className="px-6 py-3 border-t border-gray-200 dark:border-slate-700/50 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
                                                <span className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wider font-medium">Level {moduleNumber}</span>
                                                <span className={`text-xs font-semibold uppercase tracking-wider ${isCompleted ? 'text-emerald-500' : 'text-gray-500 dark:text-slate-500'}`}>{status}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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

    const handleSave = async () => {
        if (!subjectId) return;
        setSaving(true);
        try {
            const payload = { ...track, modules, subjectId } as SkillTrack;

            if (track && track.trackId && track.trackId !== '') {
                await api.updateSkillTrack(track.trackId, payload, adminId);
            } else {
                const newTrackId = `track_${Date.now()}`;
                await api.createSkillTrack({
                    ...payload,
                    trackId: newTrackId,
                    title: track?.title || 'Learning Path',
                    icon: track?.icon || '🗺️'
                } as SkillTrack, adminId);
            }
            onNotification('success', 'Roadmap saved successfully');
            loadData();
        } catch (error: any) {
            console.error("Save Error:", error);
            onNotification('error', `Save Failed: ${error.message || 'Unknown error'}`);
        }
        finally { setSaving(false); }
    };

    const handleJsonImport = (data: { track?: Partial<SkillTrack>, modules: SkillModule[] }) => {
        const layoutedModules = applyAutoLayout(data.modules);
        setModules(layoutedModules);
        if (data.track) {
            setTrack((prev: SkillTrack | null) => {
                const base = prev || {
                    trackId: '',
                    title: 'Imported Roadmap',
                    subjectId: subjectId || '',
                    modules: []
                };
                return { ...base, ...data.track } as SkillTrack;
            });
        }
        onNotification('success', 'Roadmap imported with auto-layout');
        setIsImportModalOpen(false);
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
        <div className="flex flex-col h-[calc(100vh-160px)] relative bg-gray-100 dark:bg-[#0B0E1A] rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden">

            {/* --- Enhanced Toolbar --- */}
            {!readOnly && (
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-6 font-sans pointer-events-none">
                    <div className="pointer-events-auto flex flex-col gap-6">
                        {/* Creation Tools */}
                        <div className="bg-white dark:bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-3 shadow-2xl flex flex-col gap-3 w-16 items-center">
                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Add</div>

                            <button onClick={() => handleCreateNode(NodeType.CORE)} title="Add Core Module" className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all shadow-sm">
                                <Zap size={20} />
                            </button>

                            <button onClick={() => handleCreateNode(NodeType.OPTIONAL)} title="Add Optional" className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all shadow-sm">
                                <Plus size={20} />
                            </button>

                            <button onClick={() => handleCreateNode(NodeType.ACHIEVEMENT)} title="Add Achievement" className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all shadow-sm">
                                <Star size={20} />
                            </button>
                        </div>

                        {/* Utility Tools */}
                        <div className="bg-white dark:bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-3 shadow-2xl flex flex-col gap-3 w-16 items-center">
                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-1">Tools</div>

                            <button onClick={handleRedesign} title="Redesign Layout" className="w-12 h-12 rounded-xl hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 hover:text-pink-500 dark:hover:text-pink-300 flex items-center justify-center transition-all bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                                <BrainCircuit size={20} />
                            </button>

                            <button onClick={() => setViewMode(v => v === 'admin' ? 'user' : 'admin')} title="Toggle Preview" className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${viewMode === 'user' ? 'bg-cyan-500 text-white shadow-cyan-500/20 shadow-lg' : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                                <Eye size={20} />
                            </button>

                            <button onClick={() => setIsImportModalOpen(true)} title="Import JSON" className="w-12 h-12 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all">
                                <FileJson size={20} />
                            </button>

                            <div className="h-[1px] w-10 bg-gray-300 dark:bg-white/10 my-1" />

                            <button onClick={handleSave} disabled={saving} title="Save Changes" className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${saving ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5' : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white shadow-green-500/20'}`}>
                                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Mode Indicator */}
            {viewMode === 'user' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-cyan-500/20 backdrop-blur-md rounded-full px-4 py-1.5 border border-cyan-500/30">
                    <span className="text-xs font-medium text-cyan-400">👤 User Preview Mode</span>
                </div>
            )}

            {/* View Mode Indicator */}
            {viewMode === 'user' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-cyan-500/20 backdrop-blur-md rounded-full px-4 py-1.5 border border-cyan-500/30">
                    <span className="text-xs font-medium text-cyan-400">👤 User Preview Mode</span>
                </div>
            )}

            {/* --- Sketch View --- */}
            {
                renderSketch()
            }

            {/* Inspector Panel */}
            {selectedNodeId && !readOnly && (
                <InspectorPanel
                    node={modules.find(m => m.moduleId === selectedNodeId)!}
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
