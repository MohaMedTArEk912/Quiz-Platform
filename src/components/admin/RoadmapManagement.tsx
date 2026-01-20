import React, { useState, useEffect, useMemo } from 'react';
import dagre from 'dagre';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { api } from '../../lib/api';
import type { SkillModule, SkillTrack, Quiz, BadgeNode } from '../../types';
import { NodeType, NodeState } from '../../types';
import {
    Save, Zap, Star, Loader2, FileJson,
    Plus, Eye, Check, BrainCircuit
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


const RoadmapManagement: React.FC<RoadmapManagementProps> = ({ adminId, onNotification, subjectId, readOnly = false, userProgress }) => {
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

    // Resources for dropdowns
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [badges, setBadges] = useState<BadgeNode[]>([]);

    // Optimistic UI state for sub-module completion (local state for instant feedback)
    const [, setLocalCompletedSubModules] = useState<string[]>([]);

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
                // Genesis Node
                const root: SkillModule = {
                    moduleId: `mod_${Date.now()}`,
                    title: 'Introduction',
                    description: 'Start your learning journey here.',
                    level: 0,
                    type: NodeType.CORE,
                    status: NodeState.AVAILABLE,
                    xpReward: 100,
                    coordinates: { x: 100, y: 100 },
                    subModules: [
                        { id: 'sub_1', title: 'Getting Started', state: 'available', xp: 25 },
                        { id: 'sub_2', title: 'Setup & Tools', state: 'locked', xp: 25 },
                        { id: 'sub_3', title: 'First Steps', state: 'locked', xp: 50 }
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
            return {
                module,
                x: xPositions[col],
                y: row * ySpacing,
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
                <div className="relative flex-1 overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
                    <TransformWrapper
                        initialScale={1}
                        minScale={0.5}
                        maxScale={2}
                        centerOnInit={true}
                        wheel={{ step: 0.1 }}
                        panning={{ velocityDisabled: true }}
                        doubleClick={{ disabled: true }}
                    >
                        <TransformComponent
                            wrapperClass="!w-full !h-full"
                            contentClass="cursor-grab active:cursor-grabbing"
                        >
                            <div className="roadmap-canvas" style={{ width: svgWidth, minHeight: svgHeight, margin: '40px auto', position: 'relative' }}>
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
                                    const { status, isCompleted } = computeStatus(module);
                                    const moduleNumber = (module.level ?? 0) + 1;

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
                                            className="absolute"
                                            style={{ left: item.x, top: item.y, width: boxWidth, height: boxHeight, pointerEvents: 'auto' }}
                                        >
                                            <div 
                                                className={`h-full w-full rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col transition-all duration-300 ${borderClass} shadow-lg hover:shadow-xl cursor-pointer`}
                                            >
                                                <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-700/50`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${isOptional ? 'bg-emerald-500' : isAchievement ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{module.type || 'core'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-semibold">
                                                        {isCompleted && <Check className="w-4 h-4 text-emerald-500" />}
                                                        <span className={numberColorClass}>#{moduleNumber}</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 px-6 py-4 flex flex-col gap-2.5">
                                                    <h4 className="text-white font-semibold text-sm leading-tight line-clamp-2">{module.title}</h4>
                                                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{module.description || 'Keep going to unlock the next milestone.'}</p>
                                                </div>

                                                <div className="px-6 py-3 border-t border-slate-700/50 flex items-center justify-between bg-slate-900/50">
                                                    <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Level {moduleNumber}</span>
                                                    <span className={`text-xs font-semibold uppercase tracking-wider ${isCompleted ? 'text-emerald-500' : 'text-slate-500'}`}>{status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </TransformComponent>
                    </TransformWrapper>
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
            <div className="relative flex-1 overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
                <TransformWrapper
                    initialScale={1}
                    minScale={0.5}
                    maxScale={2}
                    centerOnInit={true}
                    wheel={{ step: 0.1 }}
                    panning={{ velocityDisabled: true }}
                    doubleClick={{ disabled: true }}
                    disabled={viewMode === 'admin' && !readOnly && draggedModuleId !== null}
                >
                    <TransformComponent
                        wrapperClass="!w-full !h-full"
                        contentClass={viewMode === 'admin' && !readOnly ? "" : "cursor-grab active:cursor-grabbing"}
                    >
                        <div className="roadmap-canvas" style={{ width: svgWidth, minHeight: svgHeight, margin: '40px auto', position: 'relative' }}>
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
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                >
                                    <div 
                                        className={`h-full w-full rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col transition-all duration-300 ${borderClass} shadow-lg hover:shadow-xl ${!readOnly && viewMode === 'admin' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${selectedNodeId === module.moduleId ? 'ring-2 ring-indigo-500' : ''} ${draggedModuleId === module.moduleId ? 'opacity-75' : ''}`}
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
                                        <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-700/50`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${isOptional ? 'bg-emerald-500' : isAchievement ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{module.type || 'core'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-semibold">
                                                {isCompleted && <Check className="w-4 h-4 text-emerald-500" />}
                                                <span className={numberColorClass}>#{moduleNumber}</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 px-6 py-4 flex flex-col gap-2.5">
                                            <h4 className="text-white font-semibold text-sm leading-tight line-clamp-2">{module.title}</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{module.description || 'Keep going to unlock the next milestone.'}</p>
                                        </div>

                                        <div className="px-6 py-3 border-t border-slate-700/50 flex items-center justify-between bg-slate-900/50">
                                            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Level {moduleNumber}</span>
                                            <span className={`text-xs font-semibold uppercase tracking-wider ${isCompleted ? 'text-emerald-500' : 'text-slate-500'}`}>{status}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </TransformComponent>
                </TransformWrapper>
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
        // Reorganize modules: sort by level, reassign levels sequentially
        const sortedModules = [...modules].sort((a, b) => (a.level || 0) - (b.level || 0));
        
        // Reassign levels sequentially (0, 1, 2, 3...)
        const redesignedModules = sortedModules.map((mod, index) => ({
            ...mod,
            level: index
        }));

        setModules(redesignedModules);
        onNotification('success', 'Roadmap redesigned and reorganized');
    };

    const handleModuleMouseDown = (moduleId: string, e: React.MouseEvent) => {
        if (readOnly || viewMode !== 'admin' || e.button !== 0) return; // Left click only
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDraggedModuleId(moduleId);
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggedModuleId) return;

        const container = (e.currentTarget as HTMLElement);
        const containerRect = container.getBoundingClientRect();
        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;

        // Update module coordinates
        setModules(prev => prev.map(m =>
            m.moduleId === draggedModuleId
                ? { ...m, coordinates: { x: Math.max(0, newX), y: Math.max(0, newY) } }
                : m
        ));
    };

    const handleMouseUp = () => {
        setDraggedModuleId(null);
    };



    // --- Render ---
    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] relative bg-[#0B0E1A] rounded-3xl border border-white/5 overflow-hidden">

            {/* --- Enhanced Toolbar --- */}
            {!readOnly && (
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-6 font-sans pointer-events-none">
                    <div className="pointer-events-auto flex flex-col gap-6">
                        {/* Creation Tools */}
                        <div className="bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-3 shadow-2xl flex flex-col gap-3 w-16 items-center">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Add</div>

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
                        <div className="bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-3 shadow-2xl flex flex-col gap-3 w-16 items-center">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tools</div>

                            <button onClick={handleRedesign} title="Redesign Layout" className="w-12 h-12 rounded-xl hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 flex items-center justify-center transition-all bg-white/5 border border-white/5">
                                <BrainCircuit size={20} />
                            </button>

                            <button onClick={() => setViewMode(v => v === 'admin' ? 'user' : 'admin')} title="Toggle Preview" className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${viewMode === 'user' ? 'bg-cyan-500 text-white shadow-cyan-500/20 shadow-lg' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}>
                                <Eye size={20} />
                            </button>

                            <button onClick={() => setIsImportModalOpen(true)} title="Import JSON" className="w-12 h-12 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all">
                                <FileJson size={20} />
                            </button>

                            <div className="h-[1px] w-10 bg-white/10 my-1" />

                            <button onClick={handleSave} disabled={saving} title="Save Changes" className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${saving ? 'text-gray-500 bg-white/5' : 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white shadow-green-500/20'}`}>
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
