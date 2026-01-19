import React, { useState, useEffect } from 'react';
import {
    X, Hash, BookOpen, Layers,
    Video, Star, Shield, Trash2, Copy, ChevronDown
} from 'lucide-react';
import type {
    SkillModule
} from '../../types';
import { NodeType, NodeState } from '../../types';

interface InspectorPanelProps {
    node: SkillModule;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedNode: SkillModule) => void;
    onDelete: (nodeId: string) => void;
    onDuplicate: (node: SkillModule) => void;
    allNodes: SkillModule[];
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
    node,
    isOpen,
    onClose,
    onUpdate,
    onDelete,
    onDuplicate,
    allNodes
}) => {
    const [editedNode, setEditedNode] = useState<SkillModule>(node);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setEditedNode(node);
        setIsDirty(false);
    }, [node]);

    const handleChange = (field: keyof SkillModule, value: any) => {
        const updated = { ...editedNode, [field]: value };
        setEditedNode(updated);
        setIsDirty(true);
        // Auto-save logic could go here, but for now we'll stick to manual update
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

    const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleChange('videoUrl', e.target.value);
    };

    const handleSave = () => {
        onUpdate(editedNode);
        setIsDirty(false);
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed top-0 right-0 h-full w-[400px] bg-[#13131f] border-l border-white/10 shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#1a1a2e]">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${editedNode.type === NodeType.CORE ? 'bg-indigo-500/20 text-indigo-400' :
                        editedNode.type === NodeType.ACHIEVEMENT ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-500/20 text-slate-400'
                        }`}>
                        {editedNode.type === NodeType.ACHIEVEMENT ? <Star size={18} /> : <Hash size={18} />}
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Mission Logistics</h3>
                        <p className="text-xs text-slate-500 font-mono">{editedNode.moduleId}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content - Scrollable */}
            <div className="h-[calc(100%-4rem-4rem)] overflow-y-auto custom-scrollbar p-6 space-y-8">

                {/* 1. Core Identity */}
                <section>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <BookOpen size={14} /> Core Identity
                    </h4>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Mission Title</label>
                            <input
                                type="text"
                                value={editedNode.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                className="w-full bg-[#0f0f16] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                placeholder="e.g. Quantum Mechanics 101"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Mission Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.values(NodeType).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => handleChange('type', type)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${editedNode.type === type
                                            ? 'bg-indigo-500/20 border-indigo-500 text-white'
                                            : 'bg-[#0f0f16] border-white/10 text-slate-400 hover:border-white/20'
                                            }`}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                            <textarea
                                value={editedNode.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="w-full bg-[#0f0f16] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                                placeholder="Brief mission briefing..."
                            />
                        </div>
                    </div>
                </section>

                {/* 2. Configuration (XP, Status) */}
                <section>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <Shield size={14} /> Configuration
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">XP Reward</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={editedNode.xpReward || 100}
                                    onChange={(e) => handleChange('xpReward', parseInt(e.target.value))}
                                    className="w-full bg-[#0f0f16] border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                />
                                <div className="absolute right-3 top-2.5 text-amber-500">
                                    <Star size={14} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">State Override</label>
                            <div className="relative">
                                <select
                                    value={editedNode.status || NodeState.LOCKED}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                    className="w-full bg-[#0f0f16] border border-white/10 rounded-lg pl-3 pr-10 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    {Object.values(NodeState).map(state => (
                                        <option key={state} value={state} className="bg-[#0f0f16] text-white">
                                            {state.replace('_', ' ').toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-2">
                            <Video size={14} /> Video Briefing (URL)
                        </label>
                        <input
                            type="text"
                            value={editedNode.videoUrl || ''}
                            onChange={handleVideoUrlChange}
                            placeholder="https://youtube.com/..."
                            className="w-full bg-[#0f0f16] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </section>

                {/* 3. Dependencies (Prerequisites) */}
                <section>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <Layers size={14} /> Dependencies
                    </h4>

                    <div className="bg-[#0f0f16] rounded-lg border border-white/10 p-3 max-h-48 overflow-y-auto custom-scrollbar">
                        {allNodes.filter(n => n.moduleId !== node.moduleId).map(potentialPrereq => {
                            const isSelected = (editedNode.prerequisites || []).includes(potentialPrereq.moduleId);
                            return (
                                <label
                                    key={potentialPrereq.moduleId}
                                    className="flex items-center justify-between p-2 hover:bg-white/5 rounded cursor-pointer group transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handlePrerequisiteToggle(potentialPrereq.moduleId);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected
                                            ? 'bg-indigo-500 border-indigo-500'
                                            : 'border-white/20 group-hover:border-indigo-500/50'
                                            }`}>
                                            {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                        </div>
                                        <span className={`text-sm ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                            {potentialPrereq.title}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-600 font-mono">{potentialPrereq.moduleId}</span>
                                </label>
                            );
                        })}
                        {allNodes.length <= 1 && (
                            <div className="text-center text-slate-500 text-sm py-4 italic">
                                No checkpoints available to link.
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                        * Selected missions must be completed before this one unlocks.
                    </p>
                </section>

                {/* 4. Actions */}
                <section className="pt-4 border-t border-white/10">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-4">Command Actions</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onDuplicate(node)} // Pass original node
                            className="flex items-center justify-center gap-2 bg-[#1a1a2e] hover:bg-[#252540] text-slate-300 py-2 rounded-lg border border-white/10 transition-colors text-sm"
                        >
                            <Copy size={16} /> Duplicate
                        </button>
                        <button
                            onClick={() => onDelete(node.moduleId)}
                            className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 rounded-lg border border-red-500/20 transition-colors text-sm"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                </section>
            </div>

            {/* Footer Buttons */}
            <div className="absolute bottom-0 left-0 w-full p-6 bg-[#13131f] border-t border-white/10 flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isDirty
                        ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                        : 'bg-indigo-500/20 text-indigo-300 cursor-not-allowed'
                        }`}
                >
                    {isDirty ? 'Update Changes' : 'Saved'}
                </button>
            </div>
        </div>
    );
};
