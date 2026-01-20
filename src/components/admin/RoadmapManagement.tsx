import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dagre from 'dagre';
import { api } from '../../lib/api';
import type { SkillModule, SkillTrack, Quiz, BadgeNode } from '../../types';
import { NodeType, NodeState } from '../../types';
import {
    Save, Zap, Star, Lock, GitBranch, Loader2, FileJson,
    Plus, LayoutGrid, Eye, Target, Check, Circle, Award, BrainCircuit
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
const GRID_SIZE = 40;
const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const LEVEL_SPACING = 180;
const NODE_SPACING = 100;

const COLORS = {
    core: '#6366f1',
    optional: '#10b981',
    achievement: '#f59e0b',
    milestone: '#8b5cf6',
    locked: '#4b5563',
    background: '#0B0E1A',
    grid: 'rgba(255,255,255,0.03)',
    connector: {
        core: ['#6366f1', '#8b5cf6'],
        optional: ['#10b981', '#059669'],
        achievement: ['#f59e0b', '#d97706'],
        locked: ['#4b5563', '#374151']
    }
};

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
const resolveNodeAppearance = (type: string, status: string, isGenesis: boolean) => {
    const isLocked = status === 'locked';
    const isCompleted = status === 'completed';

    const baseStyles = {
        core: {
            bg: 'bg-gradient-to-br from-[#1a1a2e] to-[#1e1b4b]',
            border: 'border-indigo-500/40',
            glow: 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]',
            icon: <Zap className="w-4 h-4 text-indigo-400" />,
            text: 'text-indigo-400',
            accent: 'indigo',
            headerBg: 'bg-indigo-500/10',
            gradientId: 'coreGradient'
        },
        optional: {
            bg: 'bg-gradient-to-br from-[#1a1a2e] to-[#0f2922]',
            border: 'border-emerald-500/40',
            glow: 'shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]',
            icon: <GitBranch className="w-4 h-4 text-emerald-400" />,
            text: 'text-emerald-400',
            accent: 'emerald',
            headerBg: 'bg-emerald-500/10',
            gradientId: 'optionalGradient'
        },
        achievement: {
            bg: 'bg-gradient-to-br from-[#1a1a2e] to-[#2a1a0a]',
            border: 'border-amber-500/40',
            glow: 'shadow-[0_0_35px_-5px_rgba(245,158,11,0.3)]',
            icon: <Star className="w-4 h-4 text-amber-400" />,
            text: 'text-amber-400',
            accent: 'amber',
            headerBg: 'bg-amber-500/10',
            gradientId: 'achievementGradient'
        },
        milestone: {
            bg: 'bg-gradient-to-br from-[#1a1a2e] to-[#2d1a4b]',
            border: 'border-purple-500/40',
            glow: 'shadow-[0_0_35px_-5px_rgba(139,92,246,0.3)]',
            icon: <Target className="w-4 h-4 text-purple-400" />,
            text: 'text-purple-400',
            accent: 'purple',
            headerBg: 'bg-purple-500/10',
            gradientId: 'milestoneGradient'
        }
    };

    const style = baseStyles[type as keyof typeof baseStyles] || baseStyles.core;

    return {
        ...style,
        border: isLocked ? 'border-gray-700/50' : style.border,
        glow: isLocked ? '' : (isCompleted ? style.glow + ' brightness-110' : style.glow),
        opacity: isLocked ? 'opacity-60' : 'opacity-100',
        width: isGenesis ? 300 : NODE_WIDTH
    };
};

const RoadmapManagement: React.FC<RoadmapManagementProps> = ({ adminId, onNotification, subjectId, readOnly = false, userProgress, onSubModuleComplete }) => {
    // Data state
    const [track, setTrack] = useState<SkillTrack | null>(null);
    const [modules, setModules] = useState<SkillModule[]>([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [viewMode, setViewMode] = useState<'admin' | 'user'>('admin');

    // Interaction State
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    // Inspector State
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Resources for dropdowns
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [badges, setBadges] = useState<BadgeNode[]>([]);

    // Optimistic UI state for sub-module completion (local state for instant feedback)
    const [localCompletedSubModules, setLocalCompletedSubModules] = useState<string[]>([]);
    const [completingSubModuleId, setCompletingSubModuleId] = useState<string | null>(null);

    // Sync local state with props when userProgress changes
    React.useEffect(() => {
        if (userProgress?.completedSubModules) {
            setLocalCompletedSubModules(userProgress.completedSubModules);
        }
    }, [userProgress?.completedSubModules]);

    const { confirm, confirmState, handleCancel } = useConfirm();
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const wasDraggingRef = useRef(false);

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

    // --- Auto Layout ---
    const handleAutoLayout = useCallback(() => {
        const layoutedModules = applyAutoLayout(modules);
        setModules(layoutedModules);
        onNotification('success', 'Auto-layout applied');
    }, [modules, onNotification]);

    // --- Drag & Drop Logic ---
    const handleMouseDown = (e: React.MouseEvent, moduleId?: string) => {
        if (readOnly || viewMode === 'user') {
            if (!moduleId && (e.button === 0 || e.button === 1)) setIsPanning(true);
            return;
        }

        if (moduleId) {
            e.stopPropagation();
            setDraggingId(moduleId);
            setIsPanning(false);
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            wasDraggingRef.current = false;
        } else {
            if (e.button === 0 || e.button === 1) setIsPanning(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId) {
            if (!dragStartRef.current) return;
            const dist = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
            if (dist > 5) wasDraggingRef.current = true;

            const dx = e.movementX / zoom;
            const dy = e.movementY / zoom;

            setModules(prev => prev.map(m => {
                if (m.moduleId === draggingId && m.coordinates) {
                    return {
                        ...m,
                        coordinates: {
                            x: m.coordinates.x + dx,
                            y: m.coordinates.y + dy
                        }
                    };
                }
                return m;
            }));
        } else if (isPanning) {
            setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        }
    };

    const handleMouseUp = () => {
        if (draggingId) {
            setModules(prev => prev.map(m => {
                if (m.moduleId === draggingId && m.coordinates) {
                    return {
                        ...m,
                        coordinates: {
                            x: Math.round(m.coordinates.x / 20) * 20,
                            y: Math.round(m.coordinates.y / 20) * 20
                        }
                    };
                }
                return m;
            }));
        }
        setDraggingId(null);
        setIsPanning(false);
    };

    const handleNodeClick = (e: React.MouseEvent, moduleId: string) => {
        e.stopPropagation();
        if (wasDraggingRef.current) return;
        setSelectedNodeId(moduleId);
        setIsInspectorOpen(true);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
        } else {
            setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
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
        const centerX = (-pan.x + (canvasRef.current?.clientWidth || 800) / 2) / zoom;
        const centerY = (-pan.y + (canvasRef.current?.clientHeight || 600) / 2) / zoom;

        const newNode: SkillModule = {
            moduleId: `mod_${Date.now()}`,
            title: 'New Module',
            description: '',
            level: modules.length,
            type: type as any,
            status: NodeState.LOCKED,
            xpReward: 100,
            coordinates: { x: centerX, y: centerY },
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

    // --- Connector Path Generation ---
    const getConnectorPath = useCallback((from: { x: number, y: number }, to: { x: number, y: number }) => {
        const startX = from.x + NODE_WIDTH / 2;
        const startY = from.y + NODE_HEIGHT;
        const endX = to.x + NODE_WIDTH / 2;
        const endY = to.y;

        const midY = (startY + endY) / 2;
        return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    }, []);

    // --- Calculate Edges ---
    // Create a hash of coordinates to detect position changes
    const coordsHash = modules.map(m => `${m.moduleId}:${m.coordinates?.x || 0},${m.coordinates?.y || 0}`).join('|');

    const edges = useMemo(() => {
        const result: { from: SkillModule, to: SkillModule }[] = [];
        modules.forEach(node => {
            if (node.prerequisites && node.prerequisites.length > 0) {
                node.prerequisites.forEach(preId => {
                    const source = modules.find(m => m.moduleId === preId);
                    if (source && source.coordinates && node.coordinates) {
                        result.push({ from: source, to: node });
                    }
                });
            }
        });
        console.log('Edges calculated:', result.length, 'edges'); // Debug log
        return result;
    }, [modules, coordsHash]);

    // --- Level Groups for Section Labels ---
    const levelGroups = useMemo(() => {
        const groups: Record<number, { minY: number, title: string }> = {};
        modules.forEach(m => {
            const level = m.level || 0;
            const y = m.coordinates?.y || 0;
            if (!groups[level] || y < groups[level].minY) {
                groups[level] = {
                    minY: y,
                    title: `Level ${level + 1}`
                };
            }
        });
        return groups;
    }, [modules]);

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

                            <button onClick={handleAutoLayout} title="Auto Layout" className="w-12 h-12 rounded-xl hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 flex items-center justify-center transition-all bg-white/5 border border-white/5">
                                <LayoutGrid size={20} />
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

            {/* Coordinates Display */}
            <div className="absolute bottom-4 left-4 z-50 text-[10px] font-mono text-gray-600 pointer-events-none bg-black/20 px-2 py-1 rounded">
                PAN: {Math.round(-pan.x)}, {Math.round(-pan.y)} | ZOOM: {Math.round(zoom * 100)}%
            </div>

            {/* --- Canvas --- */}
            <div
                ref={canvasRef}
                className="flex-1 cursor-grab active:cursor-grabbing relative overflow-hidden"
                onMouseDown={(e) => handleMouseDown(e)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                {/* Grid Pattern */}
                {/* Modern Dot Grid */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle, rgba(99, 102, 241, 0.15) 1.5px, transparent 1.5px)`,
                        backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
                        backgroundPosition: `${pan.x}px ${pan.y}px`,
                        opacity: 0.8
                    }}
                />

                {/* --- World Container --- */}
                <div
                    className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                >
                    {/* SVG Definitions for Gradients */}
                    <svg className="absolute inset-0 w-0 h-0">
                        <defs>
                            <linearGradient id="coreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                            <linearGradient id="optionalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <linearGradient id="achievementGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#d97706" />
                            </linearGradient>
                            <linearGradient id="lockedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#4b5563" />
                                <stop offset="100%" stopColor="#374151" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Edges Layer - SOLID GRADIENT LINES */}
                    <svg className="overflow-visible w-full h-full absolute inset-0 z-0">
                        {edges.map((edge) => {
                            if (!edge.from.coordinates || !edge.to.coordinates) return null;

                            const isLocked = edge.to.status === 'locked';
                            const isCompleted = edge.to.status === 'completed';
                            const type = (edge.from.type || 'core') as string;

                            const gradientId = isLocked ? 'lockedGradient' :
                                type === 'optional' ? 'optionalGradient' :
                                    type === 'achievement' ? 'achievementGradient' : 'coreGradient';

                            // Create a unique key that includes coordinates to force re-render
                            const edgeKey = `${edge.from.moduleId}-${edge.to.moduleId}-${edge.from.coordinates.x}-${edge.from.coordinates.y}-${edge.to.coordinates.x}-${edge.to.coordinates.y}`;

                            return (
                                <g key={edgeKey}>
                                    {/* Glow effect for completed paths */}
                                    {isCompleted && (
                                        <path
                                            d={getConnectorPath(edge.from.coordinates, edge.to.coordinates)}
                                            fill="none"
                                            stroke={`url(#${gradientId})`}
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            opacity={0.3}
                                            filter="blur(4px)"
                                        />
                                    )}
                                    {/* Main connector line - SOLID, no dashes */}
                                    <path
                                        d={getConnectorPath(edge.from.coordinates, edge.to.coordinates)}
                                        fill="none"
                                        stroke={`url(#${gradientId})`}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        opacity={isLocked ? 0.4 : 0.85}
                                        className="transition-all duration-500"
                                    />
                                    {/* Arrow indicator */}
                                    <circle
                                        cx={edge.to.coordinates.x + NODE_WIDTH / 2}
                                        cy={edge.to.coordinates.y - 4}
                                        r={4}
                                        fill={isLocked ? '#4b5563' : `url(#${gradientId})`}
                                        opacity={isLocked ? 0.4 : 1}
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Level Section Labels - Styled Markers */}
                    {Object.entries(levelGroups).map(([level, group]) => (
                        <div
                            key={`level-${level}`}
                            className="absolute pointer-events-none flex items-center gap-3"
                            style={{
                                left: -140, // Positioned well to the left of the content
                                top: group.minY + NODE_HEIGHT / 2 - 12,
                                width: 120,
                                justifyContent: 'flex-end'
                            }}
                        >
                            <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest whitespace-nowrap">
                                {group.title}
                            </span>
                            <div className="w-8 h-[1px] bg-indigo-500/30" />
                        </div>
                    ))}

                    {/* Nodes Layer */}
                    <div className="z-10 relative">
                        {modules.map(module => {
                            if (!module.coordinates) return null;
                            const styles = resolveNodeAppearance(module.type || 'core', module.status || 'available', module.level === 0);

                            // Determine effective status for User View
                            let status = module.status || 'locked';
                            if (readOnly && userProgress) {
                                if (userProgress.completedModules?.includes(module.moduleId)) {
                                    status = 'completed';
                                } else if (userProgress.unlockedModules?.includes(module.moduleId)) {
                                    // Special case: The first module (level 0) should always be available if unlocked
                                    status = 'available';
                                } else {
                                    status = 'locked';
                                }
                            }

                            const isLocked = status === 'locked';
                            const isCompleted = status === 'completed';

                            // Re-resolve appearance with dynamic status
                            const dynamicStyles = resolveNodeAppearance(module.type || 'core', status, module.level === 0);

                            // Use dynamicStyles for rendering instead of 'styles'
                            // I will patch the usages of 'styles' to 'dynamicStyles' in the returned JSX below or just re-assign styles.
                            // Since 'styles' is const, I'll use a new variable and update usages.
                            const nodeStyles = dynamicStyles;

                            // Parse Content
                            const subModules = module.subModules || [];
                            const linkedQuizIds = Array.from(new Set([
                                ...(module.quizIds || []),
                                ...(module.quizId ? [module.quizId] : [])
                            ]));

                            // Calculate Progress
                            const completedSubs = subModules.filter(s => s.state === 'completed').length;
                            const completedQuizzes = isCompleted ? linkedQuizIds.length : 0;

                            const totalItems = subModules.length + linkedQuizIds.length;
                            const completedItems = completedSubs + completedQuizzes;
                            const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : (isCompleted ? 100 : 0);

                            // XP
                            const baseXP = module.xpReward ?? 100;
                            const subModuleXP = subModules.reduce((sum, s) => sum + (s.xp || 0), 0);
                            const totalXP = baseXP + subModuleXP;

                            // User view: hide locked nodes more aggressively
                            if (viewMode === 'user' && isLocked) {
                                return (
                                    <div
                                        key={module.moduleId}
                                        className="absolute pointer-events-auto opacity-30 blur-[1px]"
                                        style={{
                                            left: module.coordinates.x,
                                            top: module.coordinates.y,
                                            width: nodeStyles.width,
                                        }}
                                    >
                                        <div className="rounded-2xl border border-gray-700/30 bg-gray-900/50 p-4">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Lock className="w-4 h-4" />
                                                <span className="text-sm">Locked</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={module.moduleId}
                                    className={`absolute group pointer-events-auto transition-all duration-200 ${nodeStyles.opacity}`}
                                    style={{
                                        left: module.coordinates.x,
                                        top: module.coordinates.y,
                                        width: nodeStyles.width,
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, module.moduleId)}
                                    onClick={(e) => handleNodeClick(e, module.moduleId)}
                                >
                                    <div className={`
                                        relative rounded-2xl border-[1.5px] backdrop-blur-xl transition-all duration-300 overflow-hidden
                                        ${nodeStyles.bg} ${nodeStyles.border} ${nodeStyles.glow}
                                        ${draggingId === module.moduleId ? 'scale-105 shadow-2xl z-50 cursor-grabbing ring-2 ring-white/20' : 'hover:scale-[1.02] hover:-translate-y-1 cursor-grab'}
                                        ${selectedNodeId === module.moduleId ? 'ring-2 ring-white/40' : ''}
                                    `}>
                                        {/* Header Bar */}
                                        <div className={`px-4 py-2.5 border-b border-white/5 ${nodeStyles.headerBg} flex items-center justify-between`}>
                                            <div className="flex items-center gap-2">
                                                {isLocked && <Lock className="w-3 h-3 text-gray-500" />}
                                                {isCompleted && <Check className="w-3 h-3 text-green-400" />}
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${nodeStyles.text}`}>
                                                    {module.type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {module.badgeId && (
                                                    <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded" title="Rewards Badge">
                                                        <Award size={10} />
                                                        <span className="text-[9px] font-bold">BADGE</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                                                    <Zap className="w-3 h-3" />
                                                    <span>{totalXP} XP</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-4">
                                            <h4 className="font-bold text-sm text-white leading-tight mb-2">{module.title}</h4>

                                            {/* Sub-modules list */}
                                            {subModules.length > 0 && (
                                                <div className="space-y-1.5 mb-2">
                                                    {subModules.slice(0, 3).map(sub => {
                                                        // Check if this submodule is completed based on LOCAL state (optimistic) or props
                                                        const subModuleKey = `${module.moduleId}:${sub.id}`;
                                                        const isSubCompleted = localCompletedSubModules.includes(subModuleKey);
                                                        const isCurrentlyCompleting = completingSubModuleId === subModuleKey;
                                                        // Determine state: local state overrides default
                                                        const effectiveState = isSubCompleted ? 'completed' : (sub.state || 'available');

                                                        const canClick = readOnly && onSubModuleComplete && effectiveState !== 'completed' && !isLocked && !isCurrentlyCompleting;

                                                        return (
                                                            <div
                                                                key={sub.id}
                                                                className={`flex items-center gap-2 ${canClick ? 'cursor-pointer hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors' : ''} ${isCurrentlyCompleting ? 'opacity-50' : ''}`}
                                                                onClick={async (e) => {
                                                                    if (canClick && track) {
                                                                        e.stopPropagation();
                                                                        // Optimistic update: immediately mark as completed locally
                                                                        setCompletingSubModuleId(subModuleKey);
                                                                        setLocalCompletedSubModules(prev => [...prev, subModuleKey]);

                                                                        try {
                                                                            await onSubModuleComplete(track.trackId, module.moduleId, sub.id);
                                                                        } catch (error) {
                                                                            // Rollback on error
                                                                            setLocalCompletedSubModules(prev => prev.filter(k => k !== subModuleKey));
                                                                            console.error('Failed to complete sub-module:', error);
                                                                        } finally {
                                                                            setCompletingSubModuleId(null);
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                {isCurrentlyCompleting ? (
                                                                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                                                                ) : effectiveState === 'completed' ? (
                                                                    <Check className="w-3 h-3 text-green-400" />
                                                                ) : effectiveState === 'available' ? (
                                                                    <Circle className="w-3 h-3 text-blue-400" />
                                                                ) : (
                                                                    <Lock className="w-3 h-3 text-gray-600" />
                                                                )}
                                                                <span className={`text-xs ${effectiveState === 'completed' ? 'text-gray-400 line-through' :
                                                                    effectiveState === 'available' ? 'text-gray-300' : 'text-gray-600'
                                                                    }`}>
                                                                    {sub.title}
                                                                </span>
                                                                {canClick && !isCurrentlyCompleting && (
                                                                    <span className="ml-auto text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Click</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Linked Quizzes List */}
                                            {linkedQuizIds.length > 0 && (
                                                <div className="pt-2 border-t border-white/5 space-y-1.5">
                                                    {linkedQuizIds.map(qId => {
                                                        const quiz = quizzes.find(q => q.id === qId);
                                                        return (
                                                            <div key={qId} className="flex items-center gap-2 text-xs group">
                                                                <BrainCircuit size={12} className={isCompleted ? 'text-green-400' : 'text-indigo-400'} />
                                                                <span className={isCompleted ? 'text-green-300/80 line-through' : 'text-indigo-200'}>
                                                                    {quiz?.title || `Quiz`}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] text-indigo-300/80 font-semibold tracking-wide">
                                                {totalItems > 0 ? `${completedItems}/${totalItems} complete` : 'No tasks'}
                                            </span>
                                            {/* Progress bar */}
                                            {totalItems > 0 && (
                                                <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'
                                                            }`}
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Connection Ports (Admin only) */}
                                        {viewMode === 'admin' && (
                                            <>
                                                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 ${styles.border} bg-[#0B0E1A]`} />
                                                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full border-2 ${styles.border} bg-[#0B0E1A]`} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Inspector Panel */}
            {selectedNodeId && viewMode === 'admin' && !readOnly && (
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
