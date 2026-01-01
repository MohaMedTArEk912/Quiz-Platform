import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { BadgeNode } from '../../types';
import { Plus, Edit2, Trash2, Award, Download, Upload, MoreVertical } from 'lucide-react';
import BadgeNodeEditor from './BadgeNodeEditor';
import { SAMPLE_BADGE, BADGE_RARITY_COLORS } from '../../constants/badgeDefaults';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../ConfirmDialog';

interface BadgeManagementProps {
    adminId: string;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const BadgeManagement: React.FC<BadgeManagementProps> = ({ adminId, onNotification }) => {
    const { confirm, confirmState, handleCancel } = useConfirm();
    const [badges, setBadges] = useState<BadgeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBadgeEditor, setShowBadgeEditor] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [editingBadge, setEditingBadge] = useState<Partial<BadgeNode> | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const badgesData = await api.getBadgeNodes();
            setBadges(badgesData);
        } catch (error) {
            console.error('Failed to load badges:', error);
            onNotification('error', 'Failed to load badges');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSample = () => {
        const sample = SAMPLE_BADGE;

        const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'badge_sample.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowMenu(false);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                setEditingBadge({
                    badgeId: '', // Generate new ID on save
                    name: json.name || '',
                    description: json.description || '',
                    icon: json.icon || '🏆',
                    rarity: json.rarity || 'common',
                    color: json.color || '#3B82F6',
                    unlockCriteria: Array.isArray(json.unlockCriteria) ? json.unlockCriteria : [],
                    rewards: json.rewards || { xp: 0, coins: 0, powerUps: [] },
                    trees: json.trees || []
                });
                setShowBadgeEditor(true);
                onNotification('success', 'Badge loaded from JSON. Please review and save.');
            } catch (error) {
                console.error('Failed to parse JSON:', error);
                onNotification('error', 'Invalid JSON file');
            }
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
        setShowMenu(false);
    };

    const handleSaveBadge = async (badgeData: Partial<BadgeNode>) => {
        try {
            if (badgeData.badgeId && badges.some(b => b.badgeId === badgeData.badgeId)) {
                await api.updateBadgeNode(badgeData.badgeId, badgeData, adminId);
                onNotification('success', 'Badge updated successfully');
            } else {
                await api.createBadgeNode(badgeData, adminId);
                onNotification('success', 'Badge created successfully');
            }
            setShowBadgeEditor(false);
            setEditingBadge(null);
            loadData();
        } catch (error) {
            console.error('Failed to save badge:', error);
            onNotification('error', 'Failed to save badge');
        }
    };

    const handleDeleteBadge = async (badgeId: string) => {
        const confirmed = await confirm({
            title: 'Delete Badge',
            message: 'Are you sure you want to delete this badge? This action cannot be undone.',
            confirmText: 'Delete',
            type: 'danger'
        });
        if (!confirmed) return;

        try {
            await api.deleteBadgeNode(badgeId, adminId);
            onNotification('success', 'Badge deleted successfully');
            loadData();
        } catch (error) {
            console.error('Failed to delete badge:', error);
            onNotification('error', 'Failed to delete badge');
        }
    };

    const getRarityColor = (rarity: string) => {
        return BADGE_RARITY_COLORS[rarity as keyof typeof BADGE_RARITY_COLORS] || BADGE_RARITY_COLORS.default;
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Loading badges...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Achievement Badges</h2>
                    <p className="text-gray-500 dark:text-gray-400">Create and manage badges, rewards, and unlock criteria</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-xl font-bold transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                <button
                                    onClick={handleDownloadSample}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm"
                                >
                                    <Download className="w-4 h-4 text-purple-500" />
                                    Sample JSON
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm border-t border-gray-100 dark:border-gray-700"
                                >
                                    <Upload className="w-4 h-4 text-indigo-500" />
                                    Upload JSON
                                </button>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".json"
                        className="hidden"
                    />
                    <button
                        onClick={() => {
                            setEditingBadge({
                                badgeId: '',
                                name: '',
                                description: '',
                                icon: '🏆',
                                rarity: 'common',
                                color: '#3B82F6',
                                unlockCriteria: [],
                                rewards: { xp: 0, coins: 0, powerUps: [] },
                                trees: []
                            });
                            setShowBadgeEditor(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        New Badge
                    </button>
                </div>
            </div>

            {/* Badges Grid */}
            <div className={`rounded-2xl p-6 ${badges.length > 0 ? 'bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {badges.map(badge => (
                        <div
                            key={badge.badgeId}
                            className="bg-gray-50 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all group shadow-sm dark:shadow-none"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRarityColor(badge.rarity)} flex items-center justify-center text-2xl shadow-lg`}>
                                        {badge.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{badge.name}</h4>
                                        <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getRarityColor(badge.rarity)} text-white font-semibold capitalize`}>
                                            {badge.rarity}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            setEditingBadge(badge);
                                            setShowBadgeEditor(true);
                                        }}
                                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBadge(badge.badgeId)}
                                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-2">{badge.description}</p>

                            <div className="flex gap-2">
                                {badge.rewards.xp > 0 && (
                                    <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-semibold">
                                        +{badge.rewards.xp} XP
                                    </span>
                                )}
                                {badge.rewards.coins > 0 && (
                                    <span className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded text-xs font-semibold">
                                        +{badge.rewards.coins} 🪙
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {badges.length === 0 && (
                        <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            <Award className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 font-bold">No badges created yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Badge Editor Modal */}
            {showBadgeEditor && editingBadge && (
                <BadgeNodeEditor
                    badge={editingBadge as BadgeNode}
                    onSave={handleSaveBadge}
                    onClose={() => {
                        setShowBadgeEditor(false);
                        setEditingBadge(null);
                    }}
                />
            )}
            {confirmState.isOpen && (
                <ConfirmDialog
                    title={confirmState.title}
                    message={confirmState.message}
                    confirmText={confirmState.confirmText}
                    cancelText={confirmState.cancelText}
                    type={confirmState.type}
                    onConfirm={confirmState.onConfirm}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
};

export default BadgeManagement;
