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
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/20 dark:border-white/5 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 rounded-2xl">
                        <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Achievement Badges</h2>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Create and manage user recognition</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-3 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-500 rounded-2xl transition-all border border-white/20 dark:border-white/5 shadow-sm"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white/90 dark:bg-[#1e1e2d]/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={handleDownloadSample}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-500/10 text-gray-700 dark:text-gray-200 transition-colors font-bold text-xs uppercase tracking-widest"
                                >
                                    <Download className="w-4 h-4 text-purple-500" />
                                    Sample JSON
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-500/10 text-gray-700 dark:text-gray-200 transition-colors font-bold text-xs uppercase tracking-widest border-t border-white/10"
                                >
                                    <Upload className="w-4 h-4 text-indigo-500" />
                                    Upload JSON
                                </button>
                            </div>
                        )}
                    </div>

                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />

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
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all transform hover:-translate-y-0.5"
                    >
                        <Plus className="w-4 h-4" /> New Badge
                    </button>
                </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map(badge => (
                    <div
                        key={badge.badgeId}
                        className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-[2.5rem] p-5 border border-white/20 dark:border-white/5 hover:border-indigo-500/30 transition-all group shadow-sm hover:shadow-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full -mr-12 -mt-12 pointer-events-none" />

                        <div className="flex items-start justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getRarityColor(badge.rarity)} flex items-center justify-center text-3xl shadow-xl transform group-hover:scale-110 transition-transform duration-300`}>
                                    {badge.icon}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter text-base leading-none">{badge.name}</h4>
                                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-lg bg-white/20 text-white font-black uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-sm`}>
                                        {badge.rarity}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1.5 translate-x-2 -translate-y-2">
                                <button
                                    onClick={() => { setEditingBadge(badge); setShowBadgeEditor(true); }}
                                    className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all hover:scale-110"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteBadge(badge.badgeId)}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold leading-relaxed mb-4 line-clamp-2 uppercase tracking-wide opacity-80">{badge.description}</p>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                            {badge.rewards.xp > 0 && (
                                <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest border border-purple-500/10">
                                    ⚡ {badge.rewards.xp} XP
                                </div>
                            )}
                            {badge.rewards.coins > 0 && (
                                <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/10">
                                    🪙 {badge.rewards.coins} Coins
                                </div>
                            )}
                            {badge.trees && badge.trees.length > 0 && (
                                <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/10">
                                    🌲 {badge.trees.length} Paths
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {badges.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white/40 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/10">
                        <Award className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4 animate-pulse" />
                        <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No badges created yet</p>
                    </div>
                )}
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
