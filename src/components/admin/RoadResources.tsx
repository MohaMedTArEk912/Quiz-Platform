import React, { useState } from 'react';
import {
    Sparkles, Trash2, Bot, Loader2, Save,
    FileText, CheckCircle2, Upload, AlertCircle, X
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAiJobs } from '../../contexts/AiJobContext';
import type { Subject } from '../../types';

interface RoadResourcesProps {
    subject: Subject;
    adminId: string;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
    onRefresh: () => void;
}

const RoadResources: React.FC<RoadResourcesProps> = ({ subject, adminId, onNotification, onRefresh }) => {
    const { addJob } = useAiJobs();

    // Generator State
    const [genSelectedMaterials, setGenSelectedMaterials] = useState<string[]>([]);
    const [genConfig, setGenConfig] = useState({ count: 10, difficulty: 'Medium' });
    const [genResult, setGenResult] = useState<any[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Publish State
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [publishConfig, setPublishConfig] = useState({
        title: `AI Quiz: ${subject.title}`,
        timeLimit: 30,
        passingScore: 70
    });
    const [isPublishing, setIsPublishing] = useState(false);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);

    // --- Actions ---

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const files = Array.from(e.target.files);

        // Simple validation
        const oversized = files.find(f => f.size > 200 * 1024 * 1024);
        if (oversized) {
            onNotification('error', `File ${oversized.name} exceeds 200MB limit.`);
            return;
        }

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('appendContent', 'true');
            files.forEach(file => formData.append('contentFiles', file));
            formData.append('title', subject.title);
            formData.append('description', subject.description || '');

            const res = await api.updateSubject(subject._id, formData, adminId);
            if (res.success) {
                onNotification('success', `Uploaded ${files.length} file(s)`);
                onRefresh();
            }
        } catch (error: any) {
            onNotification('error', 'Upload failed: ' + error.message);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleProcess = async (materialId: string) => {
        addJob('process', 'AI is processing material...');
        try {
            await api.processMaterial(subject._id, materialId, adminId);
            onNotification('success', 'Processing started');
        } catch (e: any) {
            onNotification('error', 'Processing failed: ' + e.message);
        }
    };

    const handleDeleteMaterial = async (materialId: string) => {
        if (!confirm('Delete this resource?')) return;
        try {
            await api.deleteMaterial(subject._id, materialId, adminId);
            onNotification('success', 'Resource deleted');
            onRefresh();
        } catch (e: any) {
            onNotification('error', 'Delete failed: ' + e.message);
        }
    };

    const handleGenerate = async () => {
        if (genSelectedMaterials.length === 0) return;
        try {
            setIsGenerating(true);
            addJob('generate', 'Generating Quiz...');
            const res = await api.generateQuizFromMaterials({
                subjectId: subject._id,
                materialIds: genSelectedMaterials,
                questionCount: genConfig.count,
                difficulty: genConfig.difficulty
            }, adminId);

            if (res.success) {
                setGenResult(res.data);
                addJob('generate', 'Quiz ready!', { status: 'success' });
            }
        } catch (e: any) {
            onNotification('error', 'Generation failed: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!genResult) return;
        setIsPublishing(true);
        try {
            const questions = genResult.map((q, idx) => ({
                id: Date.now() + idx,
                question: q.question,
                options: q.options,
                correctOption: q.correctAnswer,
                type: 'multiple-choice' as 'multiple-choice',
                points: 1,
                explanation: '',
                part: '1'
            }));

            const quizData = {
                title: publishConfig.title,
                description: `Generated from ${subject.title}`,
                questions: questions,
                timeLimit: publishConfig.timeLimit,
                passingScore: publishConfig.passingScore,
                shuffleQuestions: true,
                showFeedback: true,
                maxAttempts: 3,
                status: 'published',
                subjectId: subject._id
            };

            const res = await api.createQuiz(quizData, adminId);
            if (res.success || res._id) {
                onNotification('success', 'Quiz published successfully!');
                setGenResult(null);
                setIsPublishModalOpen(false);
            }
        } catch (e: any) {
            onNotification('error', 'Publish failed: ' + e.message);
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6">
            {/* Left: Resource List & Config */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">

                {/* 1. Resources List */}
                <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 p-6 flex-1 flex flex-col min-h-[300px] shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                            <span className="p-2 bg-indigo-500/10 rounded-lg">
                                <FileText className="w-5 h-5 text-indigo-500" />
                            </span>
                            Resources
                        </h3>
                        <label className={`cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:-translate-y-0.5'}`}>
                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            Upload
                            <input type="file" multiple className="hidden" onChange={handleUpload} accept=".pdf,.txt,.pptx" />
                        </label>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {subject.materials?.map(m => (
                            <div key={m._id}
                                className={`group flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${genSelectedMaterials.includes(m._id)
                                    ? 'bg-indigo-50/80 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-500/30 shadow-md shadow-indigo-500/5'
                                    : 'bg-white/40 dark:bg-white/5 border-transparent hover:bg-white/60 dark:hover:bg-white/10 hover:border-white/20'
                                    }`}
                                onClick={() => {
                                    if (genSelectedMaterials.includes(m._id)) {
                                        setGenSelectedMaterials(prev => prev.filter(id => id !== m._id));
                                    } else {
                                        setGenSelectedMaterials(prev => [...prev, m._id]);
                                    }
                                }}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${m.isProcessed ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                                    {m.isProcessed ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{m.title}</div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">{m.type?.replace('_', ' ')}</div>
                                </div>
                                <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!m.isProcessed && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleProcess(m._id); }}
                                            className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                            title="Process with AI"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(m._id); }}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!subject.materials || subject.materials.length === 0) && (
                            <div className="text-center py-16 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-3xl bg-gray-50/50 dark:bg-white/5">
                                <Upload className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No resources yet.</p>
                                <p className="text-xs opacity-70 mt-1">Upload PDF or text files to get started.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Generator Config */}
                <div className="bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 p-6 shadow-sm">
                    <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 mb-6 text-lg">
                        <span className="p-2 bg-purple-500/10 rounded-lg">
                            <Bot className="w-5 h-5 text-purple-500" />
                        </span>
                        AI Generator
                    </h3>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                                <span>Question Count</span>
                                <span className="text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 px-2 py-0.5 rounded text-[10px]">{genConfig.count}</span>
                            </div>
                            <input
                                type="range" min="5" max="50" step="5"
                                value={genConfig.count}
                                onChange={(e) => setGenConfig({ ...genConfig, count: parseInt(e.target.value) })}
                                className="w-full accent-purple-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div>
                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Difficulty</div>
                            <div className="grid grid-cols-3 gap-2">
                                {['Easy', 'Medium', 'Hard'].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setGenConfig({ ...genConfig, difficulty: d })}
                                        className={`py-2.5 text-xs font-bold rounded-xl transition-all border ${genConfig.difficulty === d
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20'
                                            : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-transparent hover:bg-white dark:hover:bg-white/10'
                                            }`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || genSelectedMaterials.length === 0}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3 text-sm"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate AI Quiz
                                </>
                            )}
                        </button>
                        {genSelectedMaterials.length === 0 && (
                            <p className="text-xs text-center text-amber-500 font-bold flex items-center justify-center gap-1.5 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg border border-amber-100 dark:border-amber-900/20">
                                <AlertCircle className="w-3 h-3" /> Select resources above first
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Preview & Results */}
            <div className="flex-1 bg-white/60 dark:bg-[#1e1e2d]/60 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/5 p-8 flex flex-col overflow-hidden shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        Preview
                        {genResult && <span className="text-sm px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg font-bold">Ready</span>}
                    </h3>
                    {genResult && (
                        <button
                            onClick={() => setIsPublishModalOpen(true)}
                            className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-green-500/20 hover:scale-105 transition-all"
                        >
                            <Save className="w-4 h-4" />
                            Publish Quiz
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                    {genResult ? genResult.map((q, i) => (
                        <div key={i} className="p-6 rounded-2xl border border-white/40 dark:border-white/5 bg-white/50 dark:bg-black/20 hover:border-indigo-500/20 transition-colors">
                            <div className="flex gap-4">
                                <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm border border-white/50 dark:border-white/10">
                                    {i + 1}
                                </span>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 dark:text-white text-lg mb-4">{q.question}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {q.options.map((opt: string, idx: number) => (
                                            <div key={idx} className={`p-4 rounded-xl text-sm border-2 transition-all font-medium ${idx === q.correctAnswer
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                                : 'border-transparent bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300'
                                                }`}>
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6">
                            <div className="w-24 h-24 bg-indigo-50 dark:bg-white/5 rounded-full flex items-center justify-center relative">
                                <Bot className="w-12 h-12 opacity-20 text-indigo-500" />
                                <div className="absolute inset-0 border-2 border-indigo-500/10 rounded-full animate-pulse-slow"></div>
                            </div>
                            <div className="text-center max-w-sm">
                                <p className="font-black text-xl text-gray-900 dark:text-white mb-2">AI Quiz Generator</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Select resources from the left, configure your difficulty, and let our AI craft the perfect quiz for your students.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Publish Modal */}
            {isPublishModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e2d] rounded-3xl w-full max-w-md shadow-2xl p-8 border border-white/20 dark:border-white/5 relative overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Publish Quiz</h3>
                            <button onClick={() => setIsPublishModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Quiz Title</label>
                                <input
                                    type="text"
                                    value={publishConfig.title}
                                    onChange={e => setPublishConfig({ ...publishConfig, title: e.target.value })}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-green-500/50 outline-none transition-all font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Time Limit (mins)</label>
                                <input
                                    type="number"
                                    value={publishConfig.timeLimit}
                                    onChange={e => setPublishConfig({ ...publishConfig, timeLimit: parseInt(e.target.value) })}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-green-500/50 outline-none transition-all font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">Passing Score (%)</label>
                                <input
                                    type="number"
                                    value={publishConfig.passingScore}
                                    onChange={e => setPublishConfig({ ...publishConfig, passingScore: parseInt(e.target.value) })}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-green-500/50 outline-none transition-all font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 relative z-10">
                            <button
                                onClick={() => setIsPublishModalOpen(false)}
                                className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={isPublishing}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all flex items-center gap-2"
                            >
                                {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Publish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoadResources;
