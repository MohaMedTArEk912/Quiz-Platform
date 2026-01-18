import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../lib/api';
import type { SkillTrack, Quiz, BadgeNode } from '../../types';
import { Route, Save, X, Plus, Edit, Download, Upload, MoreVertical } from 'lucide-react';

interface RoadmapManagementProps {
    adminId: string;
    onNotification: (type: 'success' | 'error', message: string) => void;
    subjectId?: string;
}

const RoadmapManagement: React.FC<RoadmapManagementProps> = ({ adminId, onNotification, subjectId }) => {
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
        modules: [] as any[],
        subjectId: subjectId || ''
    });

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, [subjectId]);

    useEffect(() => {
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
                api.getSkillTracks(subjectId),
                api.getQuizzes(subjectId),
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
                    })) : [],
                    subjectId: subjectId || ''
                });
                setShowTrackForm(true);
                onNotification('success', 'Roadmap loaded from JSON. Please review and save.');
            } catch (error) {
                console.error('Failed to parse JSON:', error);
                onNotification('error', 'Invalid JSON file');
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
        setShowMenu(false);
    };

    if (loading) {
        return (
            <div className="text-center py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Loading Roadmaps...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Route className="w-8 h-8 text-blue-500" />
                        </div>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">
                            Skill Roadmaps
                        </span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium ml-1">Manage learning paths and modules</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-3 bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl hover:bg-white dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 rounded-xl font-bold transition-all border border-white/20 dark:border-white/5 shadow-sm hover:shadow-md"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white/90 dark:bg-[#1e1e2d]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={handleDownloadSample}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm"
                                >
                                    <Download className="w-4 h-4 text-purple-500" />
                                    Sample JSON
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm border-t border-gray-100 dark:border-white/5"
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
                                modules: [],
                                subjectId: subjectId || ''
                            });
                            setShowTrackForm(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all transform hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" />
                        New Roadmap
                    </button>
                </div>
            </div>

            {/* Roadmaps Section */}
            <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-white/5 shadow-sm min-h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tracks.map(track => (
                        <div
                            key={track.trackId}
                            className={`group relative overflow-hidden bg-white/40 dark:bg-white/5 rounded-2xl p-6 border border-white/20 dark:border-white/5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${selectedTrack === track.trackId ? 'ring-2 ring-blue-500/50 bg-white/80 dark:bg-white/10' : 'hover:border-blue-500/30'
                                }`}
                            onClick={() => setSelectedTrack(selectedTrack === track.trackId ? null : track.trackId)}
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-white/50 dark:border-white/10 group-hover:scale-110 transition-transform">
                                        {track.icon || '📚'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-black text-lg text-gray-900 dark:text-white line-clamp-1">{track.title}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300">
                                                {track.category || 'General'}
                                            </span>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{track.modules.length} modules</p>
                                        </div>
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
                                            modules: track.modules,
                                            subjectId: track.subjectId || subjectId || ''
                                        });
                                        setShowTrackForm(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>

                            {track.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 relative z-10 h-10">
                                    {track.description}
                                </p>
                            )}

                            {selectedTrack === track.trackId && (
                                <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-white/5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {track.modules.map((module, idx) => (
                                        <div key={module.moduleId} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                                            <span className="flex-none w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                                {idx + 1}
                                            </span>
                                            <span className="font-medium truncate">{module.title}</span>
                                        </div>
                                    ))}
                                    {track.modules.length === 0 && (
                                        <p className="text-xs text-gray-400 text-center italic py-2">No modules yet</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {tracks.length === 0 && (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-3xl bg-gray-50/50 dark:bg-white/5">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl grayscale opacity-50">
                                <Route className="w-10 h-10 opacity-50" />
                            </div>
                            <p className="text-gray-500 font-bold text-lg">No roadmaps created yet.</p>
                            <p className="text-gray-400 text-sm mt-1">Start by creating a new learning path above.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Track Editor Modal */}
            {
                showTrackForm && createPortal(
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-[#1e1e2d] border border-white/20 dark:border-white/5 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative overflow-hidden scale-100 animate-in zoom-in-95 duration-200 custom-scrollbar">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />

                            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-[#1e1e2d]/95 backdrop-blur-xl z-20">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                    <span className="p-2 bg-blue-500/10 rounded-lg"><Route className="w-6 h-6 text-blue-500" /></span>
                                    {trackForm.trackId ? 'Edit Roadmap' : 'New Roadmap'}
                                </h3>
                                <button
                                    onClick={() => setShowTrackForm(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Track Title</label>
                                        <input
                                            type="text"
                                            value={trackForm.title}
                                            onChange={(e) => setTrackForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-blue-500 rounded-xl text-gray-900 dark:text-white font-bold transition-all outline-none"
                                            placeholder="e.g. Frontend Basics"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Icon</label>
                                        <input
                                            type="text"
                                            value={trackForm.icon}
                                            onChange={(e) => setTrackForm(prev => ({ ...prev, icon: e.target.value }))}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-blue-500 rounded-xl text-gray-900 dark:text-white font-bold transition-all outline-none"
                                            placeholder="e.g. 📚"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</label>
                                        <select
                                            value={trackForm.category}
                                            onChange={(e) => setTrackForm(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-blue-500 rounded-xl text-gray-900 dark:text-white font-medium transition-all outline-none"
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
                                        <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</label>
                                        <textarea
                                            value={trackForm.description}
                                            onChange={(e) => setTrackForm(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-blue-500 rounded-xl text-gray-900 dark:text-white font-medium transition-all outline-none h-24 resize-none"
                                            placeholder="Brief description of this learning path..."
                                        />
                                    </div>
                                </div>

                                {/* Modules */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-white/5 rounded-xl">
                                        <h4 className="font-black text-gray-900 dark:text-white flex items-center gap-3 px-2">
                                            Modules
                                            <span className="text-xs bg-white dark:bg-white/10 px-2.5 py-1 rounded-lg text-gray-500 dark:text-gray-300 font-bold border border-gray-200 dark:border-white/5">
                                                {trackForm.modules.length}
                                            </span>
                                        </h4>
                                        <button
                                            onClick={() => setTrackForm(prev => ({
                                                ...prev,
                                                modules: [...prev.modules, { moduleId: `mod_${Date.now()}`, title: '', description: '' }]
                                            }))}
                                            className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add Module
                                        </button>
                                    </div>

                                    <div className="space-y-4 relative">
                                        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800 -z-10" />
                                        {trackForm.modules.map((module, index) => (
                                            <div key={index} className="bg-white dark:bg-black/20 p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                                                <div className="flex gap-4">
                                                    <div className="flex-none flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-sm shadow-md z-10">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <input
                                                                type="text"
                                                                value={module.title}
                                                                onChange={(e) => {
                                                                    const newModules = [...trackForm.modules];
                                                                    newModules[index].title = e.target.value;
                                                                    setTrackForm(prev => ({ ...prev, modules: newModules }));
                                                                }}
                                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-lg text-gray-900 dark:text-white text-sm font-bold placeholder-gray-400 outline-none transition-colors"
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
                                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-lg text-gray-900 dark:text-white text-sm font-medium placeholder-gray-400 outline-none transition-colors"
                                                                placeholder="Description (Optional)"
                                                            />
                                                        </div>

                                                        <div className="flex flex-col md:flex-row gap-3">
                                                            <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap px-1">Quiz:</label>
                                                                <select
                                                                    value={module.quizId || ''}
                                                                    onChange={(e) => {
                                                                        const newModules = [...trackForm.modules];
                                                                        newModules[index].quizId = e.target.value;
                                                                        setTrackForm(prev => ({ ...prev, modules: newModules }));
                                                                    }}
                                                                    className="w-full bg-transparent text-sm font-medium text-gray-900 dark:text-white outline-none cursor-pointer"
                                                                >
                                                                    <option value="" className="dark:bg-gray-900">None</option>
                                                                    {quizzes.map(quiz => (
                                                                        <option key={quiz.id} value={quiz.id} className="dark:bg-gray-900">
                                                                            {quiz.title}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap px-1">Badge:</label>
                                                                <select
                                                                    value={module.badgeId || ''}
                                                                    onChange={(e) => {
                                                                        const newModules = [...trackForm.modules];
                                                                        newModules[index].badgeId = e.target.value;
                                                                        setTrackForm(prev => ({ ...prev, modules: newModules }));
                                                                    }}
                                                                    className="w-full bg-transparent text-sm font-medium text-gray-900 dark:text-white outline-none cursor-pointer"
                                                                >
                                                                    <option value="" className="dark:bg-gray-900">None</option>
                                                                    {badges.map(badge => (
                                                                        <option key={badge.badgeId} value={badge.badgeId} className="dark:bg-gray-900">
                                                                            {badge.icon} {badge.name} ({badge.rarity})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newModules = trackForm.modules.filter((_, i) => i !== index);
                                                            setTrackForm(prev => ({ ...prev, modules: newModules }));
                                                        }}
                                                        className="self-start p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 sticky bottom-0 bg-white/95 dark:bg-[#1e1e2d]/95 backdrop-blur-xl z-20">
                                <button
                                    onClick={() => setShowTrackForm(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            setLoading(true);
                                            let savedTrack: SkillTrack;
                                            if (trackForm.trackId) {
                                                savedTrack = await api.updateSkillTrack(trackForm.trackId, {
                                                    trackId: trackForm.trackId,
                                                    title: trackForm.title,
                                                    description: trackForm.description,
                                                    icon: trackForm.icon,
                                                    category: trackForm.category,
                                                    modules: trackForm.modules,
                                                    subjectId: subjectId
                                                }, adminId);
                                            } else {
                                                savedTrack = await api.createSkillTrack({
                                                    trackId: '',
                                                    title: trackForm.title,
                                                    description: trackForm.description,
                                                    icon: trackForm.icon,
                                                    category: trackForm.category,
                                                    modules: trackForm.modules,
                                                    subjectId: subjectId
                                                }, adminId);
                                            }

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
                                            setLoading(false);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
                                >
                                    <Save className="w-5 h-5" />
                                    Save Roadmap
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div >
    );
};

export default RoadmapManagement;
