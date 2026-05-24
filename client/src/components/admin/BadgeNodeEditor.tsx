import React, { useState } from 'react';
import type { BadgeNode } from '../../types';
import { Plus, Trash2, Save, Sparkles, ChevronDown } from 'lucide-react';
import Modal from '../common/Modal';
import { BADGE_CRITERIA_TYPES } from '../../constants/badgeDefaults';

interface BadgeNodeEditorProps {
    badge?: BadgeNode;
    onSave: (badge: Partial<BadgeNode>) => void;
    onClose: () => void;
}

const BadgeNodeEditor: React.FC<BadgeNodeEditorProps> = ({ badge, onSave, onClose }) => {
    const [formData, setFormData] = useState<Partial<BadgeNode>>({
        badgeId: badge?.badgeId || '',
        name: badge?.name || '',
        description: badge?.description || '',
        icon: badge?.icon || '🏆',
        rarity: badge?.rarity || 'common',
        color: badge?.color || '#3B82F6',
        unlockCriteria: badge?.unlockCriteria || [],
        rewards: badge?.rewards || { xp: 0, coins: 0, powerUps: [] },
        trees: badge?.trees || []
    });

    const [newCriterion, setNewCriterion] = useState({
        type: 'total_attempts' as const,
        threshold: 0,
        operator: '>=' as const
    });

    const criteriaTypes = BADGE_CRITERIA_TYPES;

    const handleAddCriterion = () => {
        setFormData({
            ...formData,
            unlockCriteria: [...(formData.unlockCriteria || []), newCriterion]
        });
        setNewCriterion({ type: 'total_attempts', threshold: 0, operator: '>=' });
    };

    const handleRemoveCriterion = (index: number) => {
        setFormData({
            ...formData,
            unlockCriteria: formData.unlockCriteria?.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={badge?.badgeId ? 'Edit Badge' : 'Create Badge'}
            description="Configure achievement parameters"
            maxWidth="max-w-3xl"
            icon={<Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="badge-form"
                        className="flex-[2] py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                        <Save className="w-4 h-4" />
                        Save Badge
                    </button>
                </>
            }
        >
            <form id="badge-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Badge ID</label>
                        <input
                            type="text"
                            value={formData.badgeId}
                            onChange={(e) => setFormData({ ...formData, badgeId: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all placeholder:text-gray-400"
                            required
                            disabled={!!badge}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all placeholder:text-gray-400"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all placeholder:text-gray-400 min-h-[100px] resize-none"
                        required
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Icon</label>
                        <input
                            type="text"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all text-center text-2xl"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Rarity</label>
                        <div className="relative">
                            <select
                                value={formData.rarity}
                                onChange={(e) => setFormData({ ...formData, rarity: e.target.value as any })}
                                className="w-full bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500/50 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-bold outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="common">Common</option>
                                <option value="rare">Rare</option>
                                <option value="epic">Epic</option>
                                <option value="legendary">Legendary</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1">Color</label>
                        <div className="relative h-[50px]">
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-full h-full rounded-xl border-none cursor-pointer p-0 overflow-hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* Rewards */}
                <div className="bg-gray-50/50 dark:bg-black/20 rounded-3xl p-6 border border-gray-200 dark:border-white/5 space-y-4">
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Rewards
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest absolute top-2 right-3">XP</label>
                            <input
                                type="number"
                                value={formData.rewards?.xp}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    rewards: { ...formData.rewards!, xp: parseInt(e.target.value) || 0 }
                                })}
                                className="w-full bg-white dark:bg-[#111219] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-purple-500/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all"
                                min="0"
                            />
                        </div>

                        <div className="relative">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest absolute top-2 right-3">Coins</label>
                            <input
                                type="number"
                                value={formData.rewards?.coins}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    rewards: { ...formData.rewards!, coins: parseInt(e.target.value) || 0 }
                                })}
                                className="w-full bg-white dark:bg-[#111219] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-amber-500/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold outline-none transition-all"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Unlock Criteria */}
                <div className="bg-gray-50/50 dark:bg-black/20 rounded-3xl p-6 border border-gray-200 dark:border-white/5 space-y-4">
                    <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Unlock Criteria
                    </h3>

                    {/* Existing Criteria */}
                    <div className="space-y-2">
                        {formData.unlockCriteria?.map((criterion, index) => (
                            <div key={index} className="flex items-center gap-3 bg-white dark:bg-[#111219] rounded-xl p-3 border border-gray-200 dark:border-gray-800">
                                <span className="text-gray-700 dark:text-gray-300 font-bold text-sm flex-1 flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[10px] uppercase tracking-widest">
                                        {criteriaTypes.find(t => t.value === criterion.type)?.label || criterion.type}
                                    </span>
                                    {criterion.operator && criterion.threshold !== undefined && (
                                        <span className="text-gray-400 font-mono text-xs">
                                            {criterion.operator} {criterion.threshold}
                                        </span>
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveCriterion(index)}
                                    className="p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add New Criterion */}
                    <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 border border-dashed border-gray-300 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div className="relative col-span-1">
                                <select
                                    value={newCriterion.type}
                                    onChange={(e) => setNewCriterion({ ...newCriterion, type: e.target.value as any })}
                                    className="w-full bg-white dark:bg-[#111219] text-gray-900 dark:text-white rounded-xl pl-3 pr-8 py-2.5 border border-gray-200 dark:border-gray-800 text-xs font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    {criteriaTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>

                            <div className="relative">
                                <select
                                    value={newCriterion.operator}
                                    onChange={(e) => setNewCriterion({ ...newCriterion, operator: e.target.value as any })}
                                    className="w-full bg-white dark:bg-[#111219] text-gray-900 dark:text-white rounded-xl pl-3 pr-8 py-2.5 border border-gray-200 dark:border-gray-800 text-xs font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    <option value=">=">&ge;</option>
                                    <option value=">">&gt;</option>
                                    <option value="=">=</option>
                                    <option value="<">&lt;</option>
                                    <option value="<=">&le;</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                            </div>

                            <input
                                type="number"
                                value={newCriterion.threshold}
                                onChange={(e) => setNewCriterion({ ...newCriterion, threshold: parseInt(e.target.value) || 0 })}
                                className="bg-white dark:bg-[#111219] text-gray-900 dark:text-white rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                placeholder="Threshold"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleAddCriterion}
                            className="w-full bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest"
                        >
                            <Plus className="w-3 h-3" />
                            Add Criterion
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default BadgeNodeEditor;
