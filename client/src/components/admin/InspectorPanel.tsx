import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    X, Hash, Layers, Video, Trash2, Copy, ChevronDown,
    Plus, Check, BrainCircuit, Award, Link2
} from 'lucide-react';
import type { SkillModule, SubModule, Quiz, BadgeNode } from '../../types';
import { NodeType, NodeState } from '../../types';

interface InspectorPanelProps {
    node: SkillModule | null | undefined;
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
    const getQuizKey = (quiz: Pick<Quiz, 'id'> & { _id?: string } | string) => {
        if (typeof quiz === 'string') return quiz;
        return (quiz.id || quiz._id || '').trim();
    };

    const getInitialNode = (value: SkillModule): SkillModule => {
        const initialNode = { ...value };
        if ((!initialNode.quizIds || initialNode.quizIds.length === 0) && initialNode.quizId) {
            initialNode.quizIds = [initialNode.quizId];
        }
        return initialNode;
    };

    const currentNode = useMemo(() => (node ? getInitialNode(node) : null), [node]);
    const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
    const [quizSearch, setQuizSearch] = useState('');

    useEffect(() => {
        setSelectedQuizIds([]);
        setQuizSearch('');
    }, [node?.moduleId]);

    const linkedQuizIds = (currentNode?.quizIds || []).map(id => getQuizKey(id)).filter(Boolean);

    const globallyUsedQuizIds = useMemo(() => {
        if (!currentNode) return new Set<string>();

        const used = new Set<string>();
        allNodes.forEach(item => {
            if (item.moduleId === currentNode.moduleId) return;

            if (item.quizIds) {
                item.quizIds.forEach(id => {
                    const normalized = getQuizKey(id);
                    if (normalized) used.add(normalized);
                });
            }

            if (item.quizId) {
                const normalized = getQuizKey(item.quizId);
                if (normalized) used.add(normalized);
            }
        });
        return used;
    }, [allNodes, currentNode]);

    const selectableQuizzes = availableQuizzes
        .map(quiz => ({ quiz, quizKey: getQuizKey(quiz) }))
        .filter(({ quizKey }) => Boolean(quizKey) && !linkedQuizIds.includes(quizKey) && !globallyUsedQuizIds.has(quizKey))
        .filter(({ quiz }) => {
            if (!quizSearch.trim()) return true;
            const haystack = `${quiz.title || ''} ${quiz.category || ''} ${quiz.description || ''}`.toLowerCase();
            return haystack.includes(quizSearch.trim().toLowerCase());
        });

    const updateNode = useCallback((updates: Partial<SkillModule>) => {
        if (!currentNode) return;
        onUpdate({ ...currentNode, ...updates });
    }, [currentNode, onUpdate]);

    const handleChange = (field: keyof SkillModule, value: unknown) => {
        updateNode({ [field]: value } as Partial<SkillModule>);
    };

    const handlePrerequisiteToggle = (prereqId: string) => {
        if (!currentNode) return;

        const currentPrereqs = currentNode.prerequisites || [];
        const isSelected = currentPrereqs.includes(prereqId);
        const prerequisites = isSelected
            ? currentPrereqs.filter(id => id !== prereqId)
            : [...currentPrereqs, prereqId];

        handleChange('prerequisites', prerequisites);
    };

    const handleAddSubModule = () => {
        if (!currentNode) return;

        const newSubModule: SubModule = {
            id: `sub_${Date.now()}`,
            title: 'New Lesson',
            state: 'locked',
            xp: 25
        };

        handleChange('subModules', [...(currentNode.subModules || []), newSubModule]);
    };

    const handleUpdateSubModule = (subModuleId: string, field: keyof SubModule, value: unknown) => {
        if (!currentNode) return;

        const updatedSubModules = (currentNode.subModules || []).map(subModule =>
            subModule.id === subModuleId ? { ...subModule, [field]: value } : subModule
        );
        handleChange('subModules', updatedSubModules);
    };

    const handleDeleteSubModule = (subModuleId: string) => {
        if (!currentNode) return;
        handleChange('subModules', (currentNode.subModules || []).filter(subModule => subModule.id !== subModuleId));
    };

    const handleAddSelectedQuizzes = () => {
        if (!currentNode || selectedQuizIds.length === 0) return;

        const uniqueIds = Array.from(new Set([
            ...linkedQuizIds,
            ...selectedQuizIds.filter(id => !linkedQuizIds.includes(id))
        ]));

        handleChange('quizIds', uniqueIds);
        setSelectedQuizIds([]);
    };

    if (!isOpen || !currentNode) return null;

    const subModules = currentNode.subModules || [];
    const totalSubXP = subModules.reduce((sum, subModule) => sum + subModule.xp, 0);
    const moduleTypeClass = currentNode.type === NodeType.CORE
        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
        : currentNode.type === NodeType.ACHIEVEMENT
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';

    return (
        <div className={`fixed top-[64px] right-0 z-[50] flex h-[calc(100vh-64px)] w-[420px] transform flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-200 dark:border-white/10 dark:bg-[#101522] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-white/10 dark:bg-[#0d1220]">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${moduleTypeClass}`}>
                            <Hash size={12} />
                            {currentNode.type || 'core'}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Module Inspector</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{currentNode.moduleId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <section className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#0b0f1a]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Basics</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Edit the main module details.</p>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm dark:bg-[#161c2b] dark:text-gray-300">
                            Level {currentNode.level + 1}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">Title</label>
                        <input
                            type="text"
                            value={currentNode.title}
                            onChange={(event) => handleChange('title', event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                            placeholder="Module title"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">Description</label>
                        <textarea
                            value={currentNode.description || ''}
                            onChange={(event) => handleChange('description', event.target.value)}
                            className="h-24 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                            placeholder="What should learners get from this module?"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[NodeType.CORE, NodeType.OPTIONAL, NodeType.ACHIEVEMENT].map(type => {
                                    const isActive = currentNode.type === type;
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => handleChange('type', type)}
                                            className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${isActive
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                                                : 'border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-[#161c2b] dark:text-gray-300'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">Status</label>
                            <div className="relative">
                                <select
                                    value={currentNode.status || NodeState.LOCKED}
                                    onChange={(event) => handleChange('status', event.target.value)}
                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                                >
                                    {Object.values(NodeState).map(state => (
                                        <option key={state} value={state}>
                                            {state.replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">XP Reward</label>
                            <input
                                type="number"
                                value={currentNode.xpReward || 100}
                                onChange={(event) => handleChange('xpReward', parseInt(event.target.value, 10) || 0)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">Level</label>
                            <input
                                type="number"
                                min={0}
                                value={currentNode.level || 0}
                                onChange={(event) => handleChange('level', parseInt(event.target.value, 10) || 0)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">X Position</label>
                            <input
                                type="number"
                                value={currentNode.coordinates?.x || 0}
                                onChange={(event) => handleChange('coordinates', { ...currentNode.coordinates, x: parseInt(event.target.value, 10) || 0 })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">Y Position</label>
                            <input
                                type="number"
                                value={currentNode.coordinates?.y || 0}
                                onChange={(event) => handleChange('coordinates', { ...currentNode.coordinates, y: parseInt(event.target.value, 10) || 0 })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#0b0f1a]">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Resources and Rewards</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Attach video guidance, quizzes, and completion rewards.</p>
                    </div>

                    <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                            <Video size={14} /> Video URL
                        </label>
                        <input
                            type="text"
                            value={currentNode.videoUrl || ''}
                            onChange={(event) => handleChange('videoUrl', event.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                            <Award size={14} /> Reward Badge
                        </label>
                        <div className="relative">
                            <select
                                value={currentNode.badgeId || ''}
                                onChange={(event) => handleChange('badgeId', event.target.value)}
                                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                            >
                                <option value="">No badge</option>
                                {availableBadges.map(badge => (
                                    <option key={badge.badgeId} value={badge.badgeId}>{badge.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                            <BrainCircuit size={14} /> Linked Quizzes
                        </div>
                        <div className="space-y-2">
                            {linkedQuizIds.length === 0 && (
                                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                                    No quizzes linked yet.
                                </div>
                            )}
                            {linkedQuizIds.map(quizId => {
                                const quiz = availableQuizzes.find(item => getQuizKey(item) === quizId);
                                return (
                                    <div key={quizId} className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-white px-3 py-3 shadow-sm dark:border-indigo-500/20 dark:bg-[#161c2b]">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{quiz?.title || quizId}</div>
                                            <div className="text-[11px] text-gray-500 dark:text-gray-400">Linked to this module</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('quizIds', linkedQuizIds.filter(id => id !== quizId))}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-3 space-y-3">
                            <input
                                type="text"
                                value={quizSearch}
                                onChange={(event) => setQuizSearch(event.target.value)}
                                placeholder="Search quizzes to link"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-white/10 dark:bg-[#161c2b] dark:text-white"
                            />

                            <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-[#161c2b]">
                                {selectableQuizzes.length === 0 ? (
                                    <div className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">No unlinked quizzes match this search.</div>
                                ) : selectableQuizzes.map(({ quiz, quizKey }) => {
                                    const isSelected = selectedQuizIds.includes(quizKey);
                                    return (
                                        <button
                                            key={quizKey}
                                            type="button"
                                            onClick={() => setSelectedQuizIds(previous => previous.includes(quizKey)
                                                ? previous.filter(id => id !== quizKey)
                                                : [...previous, quizKey]
                                            )}
                                            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${isSelected
                                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200'
                                                : 'border-transparent bg-transparent text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {isSelected && <Check size={11} className="text-white" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold">{quiz.title}</div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">{quiz.category || 'Uncategorized'}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    {selectedQuizIds.length} selected
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAddSelectedQuizzes}
                                    disabled={selectedQuizIds.length === 0}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus size={14} />
                                    Add Selected
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#0b0f1a]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Lessons</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Break the module into smaller checkpoints.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddSubModule}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 dark:border-white/10 dark:bg-[#161c2b] dark:text-gray-200"
                        >
                            <Plus size={14} />
                            Add Lesson
                        </button>
                    </div>

                    {subModules.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
                            No lessons yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {subModules.map(subModule => (
                                <div key={subModule.id} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-[#161c2b]">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 text-gray-400 dark:text-gray-500">
                                            <Layers size={14} />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                value={subModule.title}
                                                onChange={(event) => handleUpdateSubModule(subModule.id, 'title', event.target.value)}
                                                className="w-full border-0 bg-transparent text-sm font-medium text-gray-900 focus:outline-none dark:text-white"
                                                placeholder="Lesson title"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="number"
                                                    value={subModule.xp}
                                                    onChange={(event) => handleUpdateSubModule(subModule.id, 'xp', parseInt(event.target.value, 10) || 0)}
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none dark:border-white/10 dark:bg-[#0b0f1a] dark:text-gray-200"
                                                />
                                                <select
                                                    value={subModule.state}
                                                    onChange={(event) => handleUpdateSubModule(subModule.id, 'state', event.target.value)}
                                                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none dark:border-white/10 dark:bg-[#0b0f1a] dark:text-gray-200"
                                                >
                                                    <option value="locked">Locked</option>
                                                    <option value="available">Available</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSubModule(subModule.id)}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {subModules.length > 0 && (
                        <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                            <span>{subModules.length} lesson(s)</span>
                            <span>{totalSubXP} lesson XP</span>
                        </div>
                    )}
                </section>

                <section className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#0b0f1a]">
                    <div className="flex items-center gap-2">
                        <Link2 size={14} className="text-gray-500 dark:text-gray-400" />
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Prerequisites</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Choose which modules must be completed first.</p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#161c2b]">
                        {allNodes.filter(item => item.moduleId !== currentNode.moduleId).length === 0 ? (
                            <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">No other modules available yet.</div>
                        ) : (
                            allNodes.filter(item => item.moduleId !== currentNode.moduleId).map(item => {
                                const isSelected = (currentNode.prerequisites || []).includes(item.moduleId);
                                return (
                                    <label
                                        key={item.moduleId}
                                        className="flex cursor-pointer items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-white/5"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            handlePrerequisiteToggle(item.moduleId);
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {isSelected && <Check size={11} className="text-white" />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400">{item.moduleId}</div>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{item.type}</span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-white/10 dark:bg-[#0d1220]">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Changes apply instantly in the roadmap editor. Use <span className="font-semibold text-gray-700 dark:text-gray-200">Save Roadmap</span> to persist them.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => onDuplicate(currentNode)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 dark:border-white/10 dark:bg-[#161c2b] dark:text-gray-200"
                    >
                        <Copy size={15} />
                        Copy
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(currentNode.moduleId)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                    >
                        <Trash2 size={15} />
                        Delete
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white"
                    >
                        <X size={15} />
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
