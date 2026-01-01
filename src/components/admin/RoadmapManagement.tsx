import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../lib/api';
import type { SkillTrack, Quiz, BadgeNode } from '../../types';
import { Route, Save, X, Plus, Edit, Download, Upload, MoreVertical } from 'lucide-react';

interface RoadmapManagementProps {
    adminId: string;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const RoadmapManagement: React.FC<RoadmapManagementProps> = ({ adminId, onNotification }) => {
    const [tracks, setTracks] = useState<SkillTrack[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [badges, setBadges] = useState<BadgeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
    const [showTrackForm, setShowTrackForm] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [trackForm, setTrackForm] = useState({
        trackId: '',
        title: '',
        description: '',
        icon: '📚',
        category: 'General',
        modules: [] as any[]
    });

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
            const [tracksData, quizzesData, badgesData] = await Promise.all([
                api.getSkillTracks(),
                api.getQuizzes(),
                api.getBadgeNodes()
            ]);
            setTracks(tracksData);
            setQuizzes(quizzesData);
            setBadges(badgesData);
        } catch (error) {
            console.error('Failed to load data:', error);
            onNotification('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSample = () => {
        const sample = {
            title: "Frontend Development Path",
            description: "A comprehensive guide to modern frontend development",
            icon: "🎨",
            modules: [
                {
                    title: "HTML & CSS Basics",
                    description: "Learn the building blocks of the web",
                    quizId: "(optional) quiz_id_here",
                    badgeId: "(optional) badge_id_here"
                },
                {
                    title: "JavaScript Fundamentals",
                    description: "Master the language of the web",
                    quizId: "",
                    badgeId: ""
                }
            ]
        };

        const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'roadmap_sample.json';
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
                setTrackForm({
                    trackId: '',
                    title: json.title || '',
                    description: json.description || '',
                    icon: json.icon || '📚',
                    category: json.category || 'General',
                    modules: Array.isArray(json.modules) ? json.modules.map((m: any) => ({
                        moduleId: `mod_${crypto.randomUUID()}`,
                        title: m.title || '',
                        description: m.description || '',
                        quizId: m.quizId || '',
                        badgeId: m.badgeId || ''
                    })) : []
                });
                setShowTrackForm(true);
                onNotification('success', 'Roadmap loaded from JSON. Please review and save.');
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

    if (loading) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Skill Roadmaps</h2>
                    <p className="text-gray-500 dark:text-gray-400">Manage learning paths and modules</p>
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
                            setTrackForm({
                                trackId: '',
                                title: '',
                                description: '',
                                icon: '📚',
                                category: 'General',
                                modules: []
                            });
                            setShowTrackForm(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold shadow-lg transition-all"
                    >
                        <Route className="w-5 h-5" />
                        New Roadmap
                    </button>
                </div>
            </div>

            {/* Roadmaps Section */}
            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Route className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Skill Roadmaps
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tracks.map(track => (
                        <div
                            key={track.trackId}
                            className="bg-gray-50 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer shadow-sm dark:shadow-none"
                            onClick={() => setSelectedTrack(selectedTrack === track.trackId ? null : track.trackId)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">{track.icon || '📚'}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-900 dark:text-white">{track.title}</h4>
                                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                                                {track.category || 'General'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{track.modules.length} modules</p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTrackForm({
                                            trackId: track.trackId,
                                            title: track.title,
                                            description: track.description || '',
                                            icon: track.icon || '📚',
                                            category: track.category || 'General',
                                            modules: track.modules
                                        });
                                        setShowTrackForm(true);
                                    }}
                                    className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-all"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>

                            {selectedTrack === track.trackId && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                    {track.modules.map((module, idx) => (
                                        <div key={module.moduleId} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                            <span className="text-blue-600 dark:text-blue-400">{idx + 1}.</span>
                                            {module.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {tracks.length === 0 && (
                        <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                            <Route className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 font-bold">No roadmaps created yet</p>
                        </div>
                    )}
                </div>
            </div>



            {/* Track Editor Modal */}
            {showTrackForm && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Route className="w-6 h-6 text-blue-400" />
                                {trackForm.trackId ? 'Edit Roadmap' : 'Create New Roadmap'}
                            </h3>
                            <button
                                onClick={() => setShowTrackForm(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Track Title</label>
                                    <input
                                        type="text"
                                        value={trackForm.title}
                                        onChange={(e) => setTrackForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g. Frontend Basics"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Track Icon</label>
                                    <input
                                        type="text"
                                        value={trackForm.icon}
                                        onChange={(e) => setTrackForm(prev => ({ ...prev, icon: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g. 📚"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</label>
                                    <select
                                        value={trackForm.category}
                                        onChange={(e) => setTrackForm(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="General">General</option>
                                        <option value="Frontend">Frontend</option>
                                        <option value="Backend">Backend</option>
                                        <option value="DevOps">DevOps</option>
                                        <option value="Design">Design</option>
                                        <option value="Mobile">Mobile</option>
                                        <option value="Data Science">Data Science</option>
                                        <option value="Soft Skills">Soft Skills</option>
                                    </select>
                                </div>
                                <div className="col-span-full space-y-2">
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Description</label>
                                    <textarea
                                        value={trackForm.description}
                                        onChange={(e) => setTrackForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none h-24"
                                        placeholder="Brief description of this learning path..."
                                    />
                                </div>
                            </div>

                            {/* Modules */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        Modules
                                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400">
                                            {trackForm.modules.length}
                                        </span>
                                    </h4>
                                    <button
                                        onClick={() => setTrackForm(prev => ({
                                            ...prev,
                                            modules: [...prev.modules, { moduleId: `mod_${Date.now()}`, title: '', description: '' }]
                                        }))}
                                        className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> Add Module
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {trackForm.modules.map((module, index) => (
                                        <div key={index} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex gap-4">
                                            <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    type="text"
                                                    value={module.title}
                                                    onChange={(e) => {
                                                        const newModules = [...trackForm.modules];
                                                        newModules[index].title = e.target.value;
                                                        setTrackForm(prev => ({ ...prev, modules: newModules }));
                                                    }}
                                                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                                                    placeholder="Module Title"
                                                />
                                                <input
                                                    type="text"
                                                    value={module.description}
                                                    onChange={(e) => {
                                                        const newModules = [...trackForm.modules];
                                                        newModules[index].description = e.target.value;
                                                        setTrackForm(prev => ({ ...prev, modules: newModules }));
                                                    }}
                                                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                                                    placeholder="Module Description (Optional)"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Required Quiz:</label>
                                                    <select
                                                        value={module.quizId || ''}
                                                        onChange={(e) => {
                                                            const newModules = [...trackForm.modules];
                                                            newModules[index].quizId = e.target.value;
                                                            setTrackForm(prev => ({ ...prev, modules: newModules }));
                                                        }}
                                                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                                                    >
                                                        <option value="">No Quiz Required</option>
                                                        {quizzes.map(quiz => (
                                                            <option key={quiz.id} value={quiz.id}>
                                                                {quiz.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Reward Badge:</label>
                                                    <select
                                                        value={module.badgeId || ''}
                                                        onChange={(e) => {
                                                            const newModules = [...trackForm.modules];
                                                            newModules[index].badgeId = e.target.value;
                                                            setTrackForm(prev => ({ ...prev, modules: newModules }));
                                                        }}
                                                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:border-purple-500 focus:outline-none"
                                                    >
                                                        <option value="">No Badge Reward</option>
                                                        {badges.map(badge => (
                                                            <option key={badge.badgeId} value={badge.badgeId}>
                                                                {badge.icon} {badge.name} ({badge.rarity})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newModules = trackForm.modules.filter((_, i) => i !== index);
                                                    setTrackForm(prev => ({ ...prev, modules: newModules }));
                                                }}
                                                className="self-start p-2 text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900 z-10">
                            <button
                                onClick={() => setShowTrackForm(false)}
                                className="px-6 py-2 rounded-xl font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        setLoading(true); // Re-use loading state or add a saving state locally

                                        // 1. Save/Update Track
                                        let savedTrack: SkillTrack;
                                        if (trackForm.trackId) {
                                            savedTrack = await api.updateSkillTrack(trackForm.trackId, {
                                                trackId: trackForm.trackId,
                                                title: trackForm.title,
                                                description: trackForm.description,
                                                icon: trackForm.icon,
                                                category: trackForm.category,
                                                modules: trackForm.modules
                                            }, adminId);
                                        } else {
                                            savedTrack = await api.createSkillTrack({
                                                trackId: '', // Server should gen ID or we use empty string if optional
                                                title: trackForm.title,
                                                description: trackForm.description,
                                                icon: trackForm.icon,
                                                category: trackForm.category,
                                                modules: trackForm.modules
                                            }, adminId);
                                        }

                                        // 2. Link Quizzes
                                        // For each module that has a quizId, update that Quiz to link back to this track/module
                                        const updatePromises = trackForm.modules
                                            .filter(m => m.quizId)
                                            .map(m => api.updateQuiz(m.quizId!, {
                                                linkedTrackId: savedTrack.trackId,
                                                linkedModuleId: m.moduleId
                                            }, adminId));

                                        await Promise.all(updatePromises);

                                        onNotification('success', 'Roadmap saved successfully!');
                                        setShowTrackForm(false);
                                        loadData();
                                    } catch (err: any) {
                                        console.error(err);
                                        onNotification('error', err.message || 'Failed to save roadmap');
                                        setLoading(false); // Only stop loading on error, loadData will handle it on success
                                    }
                                }}
                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold shadow-lg transition-all"
                            >
                                <Save className="w-4 h-4" />
                                Save Roadmap
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default RoadmapManagement;
