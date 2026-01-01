import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { BadgeNode } from '../../types';
import { X, Plus, Trash2, Save, Sparkles } from 'lucide-react';
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

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            {badge?.badgeId ? 'Edit Badge' : 'Create Badge'}
                        </h2>
                        <button type="button" onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Badge ID</label>
                                <input
                                    type="text"
                                    value={formData.badgeId}
                                    onChange={(e) => setFormData({ ...formData, badgeId: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:outline-none"
                                    required
                                    disabled={!!badge}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:outline-none"
                                rows={3}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Icon (Emoji)</label>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:outline-none text-2xl text-center"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Rarity</label>
                                <select
                                    value={formData.rarity}
                                    onChange={(e) => setFormData({ ...formData, rarity: e.target.value as any })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:outline-none"
                                >
                                    <option value="common">Common</option>
                                    <option value="rare">Rare</option>
                                    <option value="epic">Epic</option>
                                    <option value="legendary">Legendary</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Color</label>
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-600 h-10"
                                />
                            </div>
                        </div>

                        {/* Rewards */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Rewards</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">XP</label>
                                    <input
                                        type="number"
                                        value={formData.rewards?.xp}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            rewards: { ...formData.rewards!, xp: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:outline-none"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Coins</label>
                                    <input
                                        type="number"
                                        value={formData.rewards?.coins}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            rewards: { ...formData.rewards!, coins: parseInt(e.target.value) || 0 }
                                        })}
                                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:outline-none"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Unlock Criteria */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Unlock Criteria (ALL must be met)</h3>

                            {/* Existing Criteria */}
                            <div className="space-y-2 mb-4">
                                {formData.unlockCriteria?.map((criterion, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-gray-700 rounded-lg p-3">
                                        <span className="text-white flex-1">
                                            {criteriaTypes.find(t => t.value === criterion.type)?.label || criterion.type}
                                            {criterion.operator && criterion.threshold !== undefined && (
                                                <span className="text-gray-400 ml-2">
                                                    {criterion.operator} {criterion.threshold}
                                                </span>
                                            )}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCriterion(index)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add New Criterion */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <select
                                        value={newCriterion.type}
                                        onChange={(e) => setNewCriterion({ ...newCriterion, type: e.target.value as any })}
                                        className="bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-500"
                                    >
                                        {criteriaTypes.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={newCriterion.operator}
                                        onChange={(e) => setNewCriterion({ ...newCriterion, operator: e.target.value as any })}
                                        className="bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-500"
                                    >
                                        <option value=">=">&gt;=</option>
                                        <option value=">">&gt;</option>
                                        <option value="=">=</option>
                                        <option value="<">&lt;</option>
                                        <option value="<=">&lt;=</option>
                                    </select>

                                    <input
                                        type="number"
                                        value={newCriterion.threshold}
                                        onChange={(e) => setNewCriterion({ ...newCriterion, threshold: parseInt(e.target.value) || 0 })}
                                        className="bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-500"
                                        placeholder="Threshold"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddCriterion}
                                    className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Criterion
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg px-6 py-3 font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg px-6 py-3 font-semibold flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            Save Badge
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default BadgeNodeEditor;
