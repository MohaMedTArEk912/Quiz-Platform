import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import type { SkillModule, SkillTrack } from '../../types';
import { NodeType, NodeState } from '../../types';
import {
    Save,
    Zap, Star, Lock,
    GitBranch, Loader2
} from 'lucide-react';
import { InspectorPanel } from './InspectorPanel';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/ConfirmDialog';

interface RoadmapManagementProps {
    adminId: string;
    onNotification: (type: 'success' | 'error', message: string) => void;
    subjectId?: string;
    readOnly?: boolean;
}

// --- Design System Tokens ---

const GRID_SIZE = 40;

const COLORS = {
    core: '#6366f1',      // Indigo-500
    optional: '#10b981',  // Emerald-500
    achievement: '#f59e0b', // Amber-500
    locked: '#4b5563',    // Gray-600
    background: '#0B0E1A',
    grid: 'rgba(255,255,255,0.04)'
};

/**
 * Helper: Resolve Node State
 */
const resolveNodeAppearance = (type: string, status: string, isGenesis: boolean) => {
    const isLocked = status === 'locked';

    switch (type) {
        case 'achievement':
            return {
                bg: 'bg-gradient-to-br from-[#1a1a2e] to-[#2a1a1a]',
                border: isLocked ? 'border-amber-900/40 border-dashed' : 'border-amber-500/50',
                glow: isLocked ? '' : 'shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]',
                icon: <Star className="w-5 h-5 text-amber-500" />,
                text: 'text-amber-500',
                badge: 'bg-amber-500/20 text-amber-500 border-amber-500/20',
                progressColor: 'bg-amber-500',
                width: 300
            };
        case 'optional':
            return {
                bg: 'bg-[#1a1a2e]',
                border: isLocked ? 'border-emerald-900/40 border-dashed' : 'border-emerald-500/30',
                glow: isLocked ? '' : 'shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)]',
                icon: <GitBranch className="w-4 h-4 text-emerald-500" />,
                text: 'text-emerald-500',
                badge: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20',
                progressColor: 'bg-emerald-500',
                width: 240
            };
        default: // Core
            return {
                bg: isGenesis ? 'bg-[#1a1a2e]' : 'bg-[#1a1a2e]/90',
                border: isLocked ? 'border-indigo-900/40 border-dashed' : (isGenesis ? 'border-indigo-500/60' : 'border-white/10'),
                glow: isLocked ? '' : (isGenesis ? 'shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)]' : 'shadow-[0_0_20px_-10px_rgba(99,102,241,0.2)]'),
                icon: <Zap className="w-4 h-4 text-indigo-400" />,
                text: 'text-indigo-400',
                badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20',
                progressColor: 'bg-indigo-500',
                width: isGenesis ? 280 : 260
            };
    }
};

const RoadmapManagement: React.FC<RoadmapManagementProps> = ({ adminId, onNotification, subjectId, readOnly = false }) => {
    // Data state
    const [track, setTrack] = useState<SkillTrack | null>(null);
    const [modules, setModules] = useState<SkillModule[]>([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    // Interaction State
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    // Inspector State
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const { confirm, confirmState, handleCancel } = useConfirm();
    const canvasRef = useRef<HTMLDivElement>(null);

    // --- Initialization ---

    useEffect(() => { loadData(); }, [subjectId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const tracksData = await api.getSkillTracks(subjectId);

            let existingTrack = tracksData.find((t: SkillTrack) => t.subjectId === subjectId);
            if (existingTrack) {
                setTrack(existingTrack);
                const migratedModules = migrateTreeToGraph(existingTrack.modules);
                setModules(migratedModules);
            } else {
                // Genesis Node
                const root: SkillModule = {
                    moduleId: `mod_${Date.now()}`,
                    title: 'Genesis Node',
                    description: 'The beginning.',
                    level: 0,
                    type: NodeType.CORE,
                    status: NodeState.AVAILABLE,
                    xpReward: 100,
                    connections: [],
                    coordinates: { x: 100, y: 300 }
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
     */
    const migrateTreeToGraph = (mods: SkillModule[]): SkillModule[] => {
        if (mods.some(m => m.coordinates)) return mods;

        const levelMap: Record<number, SkillModule[]> = {};
        mods.forEach(m => {
            const lvl = m.level || 0;
            if (!levelMap[lvl]) levelMap[lvl] = [];
            levelMap[lvl].push(m);
        });

        return mods.map(m => {
            const lvl = m.level || 0;
            const indexInLevel = levelMap[lvl].indexOf(m);
            const x = lvl * 350 + 100; // Horizontal spacing
            const y = indexInLevel * 200 + 100; // Vertical spacing
            const prereqs = m.prerequisites || (m.parentId ? [m.parentId] : []);

            return { ...m, coordinates: { x, y }, prerequisites: prereqs };
        });
    };

    // --- Drag & Drop Logic ---

    // Track movement logic similar to original but cleaned up
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const wasDraggingRef = useRef(false);

    const handleMouseDown = (e: React.MouseEvent, moduleId?: string) => {
        if (readOnly) {
            // Only allow panning in read-only mode
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
            // Pan Canvas
            if (e.button === 0 || e.button === 1) setIsPanning(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingId) {
            if (!dragStartRef.current) return;
            // Check if we moved enough to consider it a drag
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
                            x: Math.round(m.coordinates.x / 20) * 20, // Snap to 20px
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
        if (wasDraggingRef.current) return; // Don't open if we were just dragging
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

    // --- Node CRUD Actions (Passed to Inspector) ---

    const handleUpdateNode = (updatedNode: SkillModule) => {
        setModules(prev => prev.map(m =>
            m.moduleId === updatedNode.moduleId ? updatedNode : m
        ));
    };

    const handleDeleteNode = async (moduleId: string) => {
        const isConfirmed = await confirm({
            title: 'Delete Mission Node?',
            message: 'Are you sure you want to delete this node? All connections to and from it will be severed.',
            confirmText: 'Delete Node',
            type: 'danger'
        });

        if (isConfirmed) {
            setModules(prev => prev.filter(m => m.moduleId !== moduleId));
            // Also remove from prerequisites of others
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
                x: (original.coordinates?.x || 0) + 50,
                y: (original.coordinates?.y || 0) + 50
            },
            status: NodeState.LOCKED // Reset status for copy
        };
        setModules(prev => [...prev, newNode]);
    };

    // --- Actions ---

    const handleCreateNode = (type: string) => {
        // Place in center of current view
        const centerX = (-pan.x + (canvasRef.current?.clientWidth || 800) / 2) / zoom;
        const centerY = (-pan.y + (canvasRef.current?.clientHeight || 600) / 2) / zoom;

        const newNode: SkillModule = {
            moduleId: `mod_${Date.now()}`,
            title: 'New Node',
            description: '',
            level: 1,
            type: type as any, // Cast for safety due to string arg
            status: NodeState.LOCKED,
            xpReward: 50,
            coordinates: { x: centerX, y: centerY },
            prerequisites: [],
            connections: []
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
            if (track) await api.updateSkillTrack(track.trackId, payload, adminId);
            else await api.createSkillTrack({ ...payload, trackId: '', title: 'Skill Roadmap', icon: '🛰️' }, adminId);
            onNotification('success', 'Graph Saved');
        } catch (error) { onNotification('error', 'Save Failed'); }
        finally { setSaving(false); }
    };

    // --- Rendering Helpers ---

    const getConnectorPath = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        const dx = Math.abs(p2.x - p1.x);
        const controlOffset = Math.max(dx * 0.5, 50);
        return `M ${p1.x} ${p1.y} C ${p1.x + controlOffset} ${p1.y}, ${p2.x - controlOffset} ${p2.y}, ${p2.x} ${p2.y}`;
    };

    const getEdgeColor = (toNode: SkillModule) => {
        if (toNode.status === 'locked') return 'stroke-gray-600 stroke-dashed';
        switch (toNode.type) {
            case NodeType.ACHIEVEMENT: return 'stroke-amber-500';
            case NodeType.OPTIONAL: return 'stroke-emerald-500';
            default: return 'stroke-indigo-500';
        }
    };

    // --- Render ---

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;

    // Calculate Edges
    const edges: { from: SkillModule, to: SkillModule }[] = [];
    modules.forEach(node => {
        if (node.prerequisites) {
            node.prerequisites.forEach(preId => {
                const source = modules.find(m => m.moduleId === preId);
                if (source) edges.push({ from: source, to: node });
            });
        }
    });

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] relative bg-[#0B0E1A] rounded-3xl border border-white/5 overflow-hidden">

            {/* --- Toolbar --- */}
            {!readOnly && (
                <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                    <div className="bg-[#1a1a2e]/90 backdrop-blur-md rounded-xl border border-white/10 p-2 shadow-xl flex flex-col gap-2">
                        <button onClick={() => handleCreateNode(NodeType.CORE)} className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 hint--right" title="Add Core Node">
                            <Zap className="w-6 h-6" />
                        </button>
                        <button onClick={() => handleCreateNode(NodeType.OPTIONAL)} className="p-2 hover:bg-white/10 rounded-lg text-emerald-400" title="Add Optional Node">
                            <GitBranch className="w-6 h-6" />
                        </button>
                        <button onClick={() => handleCreateNode(NodeType.ACHIEVEMENT)} className="p-2 hover:bg-white/10 rounded-lg text-amber-500" title="Add Achievement">
                            <Star className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="bg-[#1a1a2e]/90 backdrop-blur-md rounded-xl border border-white/10 p-2 shadow-xl">
                        <button onClick={handleSave} disabled={saving} className="p-2 hover:bg-white/10 rounded-lg text-white">
                            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            )}

            <div className="absolute bottom-4 left-4 z-50 text-[10px] font-mono text-gray-500 pointer-events-none">
                COORD: {Math.round(-pan.x)}, {Math.round(-pan.y)} | ZOOM: {Math.round(zoom * 100)}%
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
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(${COLORS.grid} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.grid} 1px, transparent 1px)`,
                        backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
                        backgroundPosition: `${pan.x}px ${pan.y}px`,
                        opacity: 0.5
                    }}
                />

                {/* --- World Container --- */}
                <div
                    className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                >
                    {/* 1. Edges Layer */}
                    <svg className="overflow-visible w-full h-full absolute inset-0 z-0">
                        {edges.map((edge) => {
                            if (!edge.from.coordinates || !edge.to.coordinates) return null;
                            const srcStyles = resolveNodeAppearance(edge.from.type || 'core', edge.from.status || 'available', false);

                            const start = {
                                x: edge.from.coordinates.x + srcStyles.width,
                                y: edge.from.coordinates.y + 60
                            };
                            const end = {
                                x: edge.to.coordinates.x,
                                y: edge.to.coordinates.y + 60
                            };

                            const colorClass = getEdgeColor(edge.to);
                            const isDashed = edge.to.status === 'locked';

                            return (
                                <g key={`${edge.from.moduleId}-${edge.to.moduleId}`}>
                                    <path
                                        d={getConnectorPath(start, end)}
                                        fill="none"
                                        className={`${colorClass} stroke-[3px] transition-all duration-500`}
                                        strokeDasharray={isDashed ? "8 4" : "none"}
                                        strokeOpacity={0.6}
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* 2. Nodes Layer */}
                    <div className="z-10 relative">
                        {modules.map(module => {
                            if (!module.coordinates) return null;
                            const styles = resolveNodeAppearance(module.type || 'core', module.status || 'available', module.level === 0);
                            const isLocked = module.status === 'locked';

                            return (
                                <div
                                    key={module.moduleId}
                                    className={`absolute group pointer-events-auto transition-transform duration-100 ease-out`}
                                    style={{
                                        left: module.coordinates.x,
                                        top: module.coordinates.y,
                                        width: styles.width,
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, module.moduleId)}
                                    onClick={(e) => handleNodeClick(e, module.moduleId)}
                                >
                                    <div className={`
                                        relative rounded-2xl border backdrop-blur-xl transition-all duration-300
                                        ${styles.bg} ${styles.border} ${styles.glow}
                                        ${draggingId === module.moduleId ? 'scale-105 shadow-2xl z-50 cursor-grabbing' : 'hover:scale-105 cursor-grab'}
                                        ${isLocked ? 'opacity-80 blur-[0.5px] grayscale-[0.3]' : ''}
                                        ${selectedNodeId === module.moduleId ? 'ring-2 ring-white/50' : ''}
                                     `}>
                                        <div className="p-4 select-none">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isLocked && <Lock className="w-3 h-3 text-gray-500" />}
                                                        {!isLocked && <div className={`w-2 h-2 rounded-full ${styles.progressColor} animate-pulse`} />}
                                                        <span className={`text-[9px] font-black uppercase ${styles.text} opacity-70`}>{module.type}</span>
                                                    </div>
                                                    <h4 className="font-bold text-sm text-gray-100 leading-tight">{module.title}</h4>
                                                </div>
                                                <div className={`p-2 rounded-lg ${styles.bg} border border-white/5`}>
                                                    {styles.icon}
                                                </div>
                                            </div>

                                            <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden mb-3">
                                                <div
                                                    className={`h-full ${styles.progressColor}`}
                                                    style={{ width: `${module.progress || 0}%` }}
                                                />
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                                                    <Zap className="w-3 h-3 text-amber-500" />
                                                    <span>{module.xpReward} XP</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Connection Ports */}
                                        <div className={`absolute left-0 top-[60px] -translate-x-1/2 w-3 h-3 rounded-full bg-[#0B0E1A] border-2 ${styles.text.replace('text-', 'border-')}`} />
                                        <div className={`absolute right-0 top-[60px] translate-x-1/2 w-3 h-3 rounded-full bg-[#0B0E1A] border-2 ${styles.text.replace('text-', 'border-')} cursor-crosshair hover:scale-125 transition-transform`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Inspector Panel - Disable in ReadOnly for now, or make read-only */}
            {selectedNodeId && !readOnly && (
                <InspectorPanel
                    node={modules.find(m => m.moduleId === selectedNodeId)!}
                    isOpen={isInspectorOpen}
                    onClose={() => setIsInspectorOpen(false)}
                    onUpdate={handleUpdateNode}
                    onDelete={handleDeleteNode}
                    onDuplicate={handleDuplicateNode}
                    allNodes={modules}
                />
            )}

            {/* Global Confirm Dialog */}
            <ConfirmDialog
                {...confirmState}
                onCancel={handleCancel}
            />
        </div>
    );
};

export default RoadmapManagement;
