import React, { useState, useEffect, useMemo } from 'react';
import {
    X, Hash, BookOpen, Layers,
    Video, Star, Shield, Trash2, Copy, ChevronDown,
    Plus, GripVertical, Check, BrainCircuit, Award
} from 'lucide-react';
import type { SkillModule, SubModule, Quiz, BadgeNode } from '../../types';
import { NodeType, NodeState } from '../../types';

interface InspectorPanelProps {
    node: SkillModule;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedNode: SkillModule) => void;
    onDelete: (nodeId: string) => void;
    onDuplicate: (node: SkillModule) => void;
    allNodes: SkillModule[];
    availableQuizzes?: Quiz[];
    availableBadges?: BadgeNode[];
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
    node,
    isOpen,
    onClose,
    onUpdate,
    onDelete,
    onDuplicate,
    allNodes,
    availableQuizzes = [],
    availableBadges = []
}) => {
    const [editedNode, setEditedNode] = useState<SkillModule>(node);
    const [isDirty, setIsDirty] = useState(false);
    const [activeSection, setActiveSection] = useState<'identity' | 'config' | 'lessons' | 'deps'>('identity');

    useEffect(() => {
        // Migration: Ensure quizIds is populated from quizId if needed
        const initialNode = { ...node };
        if ((!initialNode.quizIds || initialNode.quizIds.length === 0) && initialNode.quizId) {
            initialNode.quizIds = [initialNode.quizId];
        }
        setEditedNode(initialNode);
        setIsDirty(false);
    }, [node]);

    // Calculate globally used quiz IDs (excluding current node)
    const globallyUsedQuizIds = useMemo(() => {
        const used = new Set<string>();
        allNodes.forEach(n => {
            if (n.moduleId === node.moduleId) return;

            if (n.quizIds) n.quizIds.forEach(id => used.add(id));
            if (n.quizId) used.add(n.quizId);
        });
        return used;
    }, [allNodes, node.moduleId]);

    const handleChange = (field: keyof SkillModule, value: any) => {
        const updated = { ...editedNode, [field]: value };
        setEditedNode(updated);
        setIsDirty(true);
    };

    const handlePrerequisiteToggle = (prereqId: string) => {
        const currentPrereqs = editedNode.prerequisites || [];
        const isSelected = currentPrereqs.includes(prereqId);

        let newPrereqs;
        if (isSelected) {
            newPrereqs = currentPrereqs.filter(id => id !== prereqId);
        } else {
            newPrereqs = [...currentPrereqs, prereqId];
        }

        handleChange('prerequisites', newPrereqs);
    };

    // --- Sub-Module Management ---
    const handleAddSubModule = () => {
        const newSub: SubModule = {
            id: `sub_${Date.now()}`,
            title: 'New Lesson',
            state: 'locked',
            xp: 25
        };
        const updatedSubs = [...(editedNode.subModules || []), newSub];
        handleChange('subModules', updatedSubs);
    };

    const handleUpdateSubModule = (subId: string, field: keyof SubModule, value: any) => {
        const updatedSubs = (editedNode.subModules || []).map(sub =>
            sub.id === subId ? { ...sub, [field]: value } : sub
        );
        handleChange('subModules', updatedSubs);
    };

    const handleDeleteSubModule = (subId: string) => {
        const updatedSubs = (editedNode.subModules || []).filter(sub => sub.id !== subId);
        handleChange('subModules', updatedSubs);
    };

    const handleSave = () => {
        onUpdate(editedNode);
        setIsDirty(false);
    };

    if (!isOpen) return null;

    const subModules = editedNode.subModules || [];
    const totalSubXP = subModules.reduce((sum, s) => sum + s.xp, 0);

    return (

        <div className={`fixed top-[64px] right-0 h-[calc(100vh-64px)] w-[420px] bg-[#0f0f18] border-l border-white/10 shadow-2xl z-[50] transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 bg-gradient-to-r from-[#1a1a2e] to-[#13131f]">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${editedNode.type === NodeType.CORE ? 'bg-indigo-500/20 text-indigo-400' :
                        editedNode.type === NodeType.ACHIEVEMENT ? 'bg-amber-500/20 text-amber-400' :
                            editedNode.type === NodeType.OPTIONAL ? 'bg-emerald-500/20 text-emerald-400' :
                                'bg-slate-500/20 text-slate-400'
                        }`}>
                        {editedNode.type === NodeType.ACHIEVEMENT ? <Star size={18} /> : <Hash size={18} />}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Module Editor</h3>
                        <p className="text-[10px] text-gray-500 font-mono">{editedNode.moduleId}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-white/5 bg-[#0a0a12]">
                {[
                    { id: 'identity', label: 'Identity', icon: BookOpen },
                    { id: 'config', label: 'Config', icon: Shield },
                    { id: 'lessons', label: 'Lessons', icon: Layers },
                    { id: 'deps', label: 'Links', icon: Hash }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`flex-1 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${activeSection === tab.id
                            ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 min-h-0">

                {/* Identity Section */}
                {activeSection === 'identity' && (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2">Module Title</label>
                            <input
                                type="text"
                                value={editedNode.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                className="w-full bg-[#0a0a12] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                placeholder="e.g. Variables & Data Types"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2">Module Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.values(NodeType).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => handleChange('type', type)}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all ${editedNode.type === type
                                            ? type === 'core' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' :
                                                type === 'optional' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                                                    type === 'achievement' ? 'bg-amber-500/20 border-amber-500 text-amber-400' :
                                                        'bg-purple-500/20 border-purple-500 text-purple-400'
                                            : 'bg-[#0a0a12] border-white/10 text-gray-500 hover:border-white/20'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2">Description</label>
                            <textarea
                                value={editedNode.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="w-full bg-[#0a0a12] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all h-24 resize-none"
                                placeholder="Brief description of what this module covers..."
                            />
                        </div>
                    </div>
                )}

                {/* Config Section */}
                {activeSection === 'config' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">Base XP Reward</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={editedNode.xpReward || 100}
                                        onChange={(e) => handleChange('xpReward', parseInt(e.target.value))}
                                        className="w-full bg-[#0a0a12] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-all"
                                    />
                                    <div className="absolute right-3 top-3 text-amber-500">
                                        <Star size={16} />
                                    </div>
                                </div>
                                {subModules.length > 0 && (
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        + {totalSubXP} XP from {subModules.length} lessons
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2">Status</label>
                                <div className="relative">
                                    <select
                                        value={editedNode.status || NodeState.LOCKED}
                                        onChange={(e) => handleChange('status', e.target.value)}
                                        className="w-full bg-[#0a0a12] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                        style={{ colorScheme: 'dark' }}
                                    >
                                        {Object.values(NodeState).map(state => (
                                            <option key={state} value={state} className="bg-[#0a0a12] text-white">
                                                {state.replace('_', ' ').toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2">Level (Hierarchy)</label>
                            <input
                                type="number"
                                value={editedNode.level || 0}
                                onChange={(e) => handleChange('level', parseInt(e.target.value))}
                                className="w-full bg-[#0a0a12] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                                min={0}
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Used for auto-layout ordering</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                <Video size={14} /> Video URL
                            </label>
                            <input
                                type="text"
                                value={editedNode.videoUrl || ''}
                                onChange={(e) => handleChange('videoUrl', e.target.value)}
                                placeholder="https://youtube.com/..."
                                className="w-full bg-[#0a0a12] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                    <BrainCircuit size={14} /> Linked Quizzes
                                </label>

                                {/* Selected Quizzes List */}
                                <div className="space-y-2 mb-3">
                                    {(editedNode.quizIds || []).map(qId => {
                                        const quiz = availableQuizzes.find(q => q.id === qId);
                                        return (
                                            <div key={qId} className="flex items-center justify-between bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 text-xs group">
                                                <span className="font-medium text-indigo-200 truncate flex-1 pr-2" title={quiz?.title}>
                                                    {quiz?.title || 'Unknown Quiz'}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const newIds = (editedNode.quizIds || []).filter(id => id !== qId);
                                                        handleChange('quizIds', newIds);
                                                    }}
                                                    className="p-1 hover:bg-red-500/20 text-indigo-400 group-hover:text-red-400 rounded-lg transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="relative">
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            const newId = e.target.value;
                                            if (newId) {
                                                const currentIds = editedNode.quizIds || [];
                                                if (!currentIds.includes(newId)) {
                                                    handleChange('quizIds', [...currentIds, newId]);
                                                }
                                            }
                                        }}
                                        className="w-full bg-[#0a0a12] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">+ Link Quiz...</option>
                                        {availableQuizzes
                                            .filter(q =>
                                                !(editedNode.quizIds || []).includes(q.id) &&
                                                !globallyUsedQuizIds.has(q.id)
                                            )
                                            .map(q => (

                                                <option key={q.id} value={q.id}>
                                                    {q.title}
                                                </option>
                                            ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                        <Plus size={14} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                    <Award size={14} /> Reward Badge
                                </label>
                                <div className="relative">
                                    <select
                                        value={editedNode.badgeId || ''}
                                        onChange={(e) => handleChange('badgeId', e.target.value)}
                                        className="w-full bg-[#0a0a12] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">-- No Badge --</option>
                                        {availableBadges.map(b => (
                                            <option key={b.badgeId} value={b.badgeId}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lessons (Sub-modules) Section */}
                {activeSection === 'lessons' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-white">Lessons</h4>
                                <p className="text-[10px] text-gray-500">Topics within this module</p>
                            </div>
                            <button
                                onClick={handleAddSubModule}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-xs font-medium transition-colors"
                            >
                                <Plus size={14} /> Add Lesson
                            </button>
                        </div>

                        {subModules.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No lessons yet</p>
                                <p className="text-xs">Add lessons to break this module into smaller topics</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {subModules.map((sub) => (
                                    <div
                                        key={sub.id}
                                        className="bg-[#0a0a12] border border-white/10 rounded-xl p-3 group hover:border-white/20 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 text-gray-600 cursor-grab">
                                                <GripVertical size={14} />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    value={sub.title}
                                                    onChange={(e) => handleUpdateSubModule(sub.id, 'title', e.target.value)}
                                                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                                                    placeholder="Lesson title..."
                                                />
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-3 h-3 text-amber-500" />
                                                        <input
                                                            type="number"
                                                            value={sub.xp}
                                                            onChange={(e) => handleUpdateSubModule(sub.id, 'xp', parseInt(e.target.value))}
                                                            className="w-12 bg-transparent text-xs text-gray-400 focus:outline-none"
                                                        />
                                                        <span className="text-[10px] text-gray-600">XP</span>
                                                    </div>
                                                    <select
                                                        value={sub.state}
                                                        onChange={(e) => handleUpdateSubModule(sub.id, 'state', e.target.value)}
                                                        className="bg-transparent text-xs text-gray-400 focus:outline-none cursor-pointer"
                                                    >
                                                        <option value="locked">🔒 Locked</option>
                                                        <option value="available">⚪ Available</option>
                                                        <option value="completed">✓ Completed</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSubModule(sub.id)}
                                                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {subModules.length > 0 && (
                            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                                <span>Total: {subModules.length} lessons</span>
                                <span className="text-amber-400 font-medium">{totalSubXP} XP</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Dependencies Section */}
                {activeSection === 'deps' && (
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-bold text-white mb-1">Prerequisites</h4>
                            <p className="text-[10px] text-gray-500">Modules that must be completed before this one</p>
                        </div>

                        <div className="bg-[#0a0a12] rounded-xl border border-white/10 overflow-hidden">
                            {allNodes.filter(n => n.moduleId !== node.moduleId).length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="text-sm">No other modules</p>
                                </div>
                            ) : (
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    {allNodes.filter(n => n.moduleId !== node.moduleId).map(potentialPrereq => {
                                        const isSelected = (editedNode.prerequisites || []).includes(potentialPrereq.moduleId);
                                        return (
                                            <label
                                                key={potentialPrereq.moduleId}
                                                className="flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer group transition-colors border-b border-white/5 last:border-0"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handlePrerequisiteToggle(potentialPrereq.moduleId);
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-indigo-500 border-indigo-500'
                                                        : 'border-gray-600 group-hover:border-indigo-500/50'
                                                        }`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-400'}`}>
                                                            {potentialPrereq.title}
                                                        </span>
                                                        <p className="text-[10px] text-gray-600 font-mono">{potentialPrereq.moduleId}</p>
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] uppercase font-bold ${potentialPrereq.type === 'core' ? 'text-indigo-500' :
                                                    potentialPrereq.type === 'optional' ? 'text-emerald-500' : 'text-amber-500'
                                                    }`}>
                                                    {potentialPrereq.type}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {(editedNode.prerequisites || []).length > 0 && (
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3">
                                <p className="text-[11px] text-indigo-300">
                                    <strong>{(editedNode.prerequisites || []).length}</strong> prerequisite(s) selected.
                                    Lines will connect from those modules to this one.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-white/10">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onDuplicate(node)}
                            className="flex items-center justify-center gap-2 bg-[#1a1a2e] hover:bg-[#252540] text-gray-300 py-2.5 rounded-xl border border-white/10 transition-colors text-sm font-medium"
                        >
                            <Copy size={16} /> Duplicate
                        </button>
                        <button
                            onClick={() => onDelete(node.moduleId)}
                            className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-xl border border-red-500/20 transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 bg-[#0f0f18] border-t border-white/10 flex gap-3 flex-none mt-auto">
                <button
                    onClick={onClose}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-medium transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isDirty
                        ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-indigo-500/20 text-indigo-300 cursor-not-allowed'
                        }`}
                >
                    {isDirty ? 'Save Changes' : 'No Changes'}
                </button>
            </div>
        </div>
    );
};
