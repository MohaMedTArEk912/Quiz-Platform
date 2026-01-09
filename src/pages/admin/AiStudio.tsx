import React, { useState, useEffect } from 'react';
import {
    Layout, Upload, FileText, CheckCircle2, Play,
    RotateCcw, Sparkles, AlertCircle, Trash2, Library,
    Bot, GraduationCap, ArrowRight, Loader2, Search
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAiJobs } from '../../contexts/AiJobContext'; // Assuming context is set up in App

interface Material {
    _id: string;
    title: string;
    type: 'lesson' | 'exam_raw' | 'exam_processed';
    isProcessed: boolean;
    uploadedAt: string;
    summary?: string;
    extractedQuestions?: any[];
}

interface Subject {
    _id: string;
    title: string;
    materials: Material[];
}

const AiStudio: React.FC = () => {
    // Get admin ID from session (legacy way)
    const getAdminId = () => {
        const session = sessionStorage.getItem('userSession');
        return session ? JSON.parse(session).user.userId : '';
    };
    const adminId = getAdminId();

    const { addJob } = useAiJobs();
    const [activeTab, setActiveTab] = useState<'ingest' | 'library' | 'generate'>('ingest');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);

    // Ingest State
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadType, setUploadType] = useState<'lesson' | 'exam_raw'>('lesson');
    const [isUploading, setIsUploading] = useState(false);

    // Generator State
    const [genSelectedMaterials, setGenSelectedMaterials] = useState<string[]>([]);
    const [genConfig, setGenConfig] = useState({ count: 10, difficulty: 'Medium' });
    const [genResult, setGenResult] = useState<any[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        try {
            setLoading(true);
            const res = await api.getAllSubjects(adminId);
            if (res.success) setSubjects(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile || !selectedSubjectId) return;
        try {
            setIsUploading(true);
            addJob('upload', `Uploading ${uploadFile.name}...`);
            await api.uploadMaterial(selectedSubjectId, uploadFile, uploadType, adminId);
            setUploadFile(null);
            loadSubjects(); // Refresh
            addJob('process', `Upload complete for ${uploadFile.name}`, { status: 'success' });
        } catch (e: any) {
            console.error(e);
            alert('Upload failed: ' + e.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleProcess = async (subjectId: string, materialId: string) => {
        addJob('process', 'AI is processing material...');
        try {
            await api.processMaterial(subjectId, materialId, adminId);
            loadSubjects();
            // In a real app, we'd update the job status via socket or polling
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (subjectId: string, materialId: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.deleteMaterial(subjectId, materialId, adminId);
            loadSubjects();
        } catch (e) {
            console.error(e);
        }
    };

    const handleGenerate = async () => {
        if (genSelectedMaterials.length === 0) return;
        try {
            setIsGenerating(true);
            addJob('generate', 'Generating Quiz from selected materials...');
            const res = await api.generateQuizFromMaterials({
                subjectId: selectedSubjectId,
                materialIds: genSelectedMaterials,
                questionCount: genConfig.count,
                difficulty: genConfig.difficulty
            }, adminId);

            if (res.success) {
                setGenResult(res.data);
                addJob('generate', 'Quiz ready!', { status: 'success' });
            }
        } catch (e) {
            console.error(e);
            alert('Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    // --- RENDER HELPERS ---

    const renderIngestTab = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
            {/* Left: Upload Form */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1a1b26] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-purple-500" />
                        Upload Raw Material
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Target Subject</label>
                            <select
                                value={selectedSubjectId}
                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10"
                            >
                                <option value="">Select a Subject...</option>
                                {subjects.map(s => (
                                    <option key={s._id} value={s._id}>{s.title}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setUploadType('lesson')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${uploadType === 'lesson'
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-white/10'}`}
                            >
                                <div className="font-bold text-gray-900 dark:text-white mb-1">New Lesson</div>
                                <div className="text-xs text-gray-500">Slides, Text Notes</div>
                            </button>
                            <button
                                onClick={() => setUploadType('exam_raw')}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${uploadType === 'exam_raw'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-white/10'}`}
                            >
                                <div className="font-bold text-gray-900 dark:text-white mb-1">Old Exam</div>
                                <div className="text-xs text-gray-500">Past Papers (PDF)</div>
                            </button>
                        </div>

                        <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors">
                            <input
                                type="file"
                                accept=".pdf,.txt"
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3 text-purple-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <p className="font-bold text-gray-900 dark:text-white">{uploadFile ? uploadFile.name : 'Click to Upload PDF/TXT'}</p>
                            </label>
                            {uploadFile && (
                                <button
                                    onClick={handleUpload}
                                    disabled={!selectedSubjectId || isUploading}
                                    className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isUploading ? 'Uploading...' : 'Start Upload'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Recent Uploads / Status */}
            <div className="bg-white dark:bg-[#1a1b26] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-[500px]">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Pipeline Status</h3>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {subjects.flatMap(s => s.materials.map(m => ({ ...m, subjectName: s.title, subjectId: s._id })))
                        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                        .map((m) => (
                            <div key={m._id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-between group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-2 h-10 rounded-full ${m.isProcessed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                    <div className="min-w-0">
                                        <div className="font-bold text-gray-900 dark:text-white truncate">{m.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <span>{m.subjectName}</span>
                                            <span>•</span>
                                            <span className="uppercase text-[10px] bg-gray-200 dark:bg-white/10 px-1 rounded">{m.type}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!m.isProcessed && (
                                        <button
                                            onClick={() => handleProcess(m.subjectId, m._id)}
                                            className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200"
                                            title="Process with AI"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(m.subjectId, m._id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );

    const renderLibraryTab = () => (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
            {subjects.map(subject => (
                <div key={subject._id} className="bg-white dark:bg-[#1a1b26] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{subject.title}</h3>
                        <span className="text-xs font-bold bg-purple-100 text-purple-600 px-2 py-1 rounded-lg">
                            {subject.materials?.length || 0} Files
                        </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subject.materials?.map(m => (
                            <div key={m._id} className="p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:border-purple-200 transition-colors relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${m.type === 'exam_processed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {m.type.replace('_', ' ')}
                                    </span>
                                    {m.isProcessed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                </div>
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1 line-clamp-1">{m.title}</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">
                                    {m.summary || (m.extractedQuestions ? `${m.extractedQuestions.length} Questions Extracted` : 'Raw Text')}
                                </p>
                            </div>
                        ))}
                        {(!subject.materials || subject.materials.length === 0) && (
                            <div className="col-span-full py-8 text-center text-gray-400 text-sm italic">
                                No materials uploaded yet.
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderGeneratorTab = () => (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in duration-300">
            {/* Left: Configuration */}
            <div className="w-full md:w-1/3 space-y-6">
                <div className="bg-white dark:bg-[#1a1b26] p-6 rounded-2xl border border-gray-200 dark:border-white/5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">1. Select Material</h3>

                    <div className="space-y-4 mb-6">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Subject</label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => { setSelectedSubjectId(e.target.value); setGenSelectedMaterials([]); }}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10"
                        >
                            <option value="">Select Subject...</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
                        </select>
                    </div>

                    {selectedSubjectId && (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar p-2 bg-gray-50 dark:bg-black/10 rounded-xl">
                            {subjects.find(s => s._id === selectedSubjectId)?.materials.map(m => (
                                <label key={m._id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={genSelectedMaterials.includes(m._id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setGenSelectedMaterials([...genSelectedMaterials, m._id]);
                                            else setGenSelectedMaterials(genSelectedMaterials.filter(id => id !== m._id));
                                        }}
                                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                    />
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{m.title}</div>
                                        <div className="text-xs text-gray-500 capitalize">{m.type.replace('_', ' ')}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-gray-100 dark:border-white/5 my-6 pt-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">2. Configuration</h3>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Questions</label>
                            <input
                                type="range" min="5" max="50" step="5"
                                value={genConfig.count}
                                onChange={(e) => setGenConfig({ ...genConfig, count: parseInt(e.target.value) })}
                                className="w-full accent-purple-600"
                            />
                            <div className="text-right font-bold text-purple-600">{genConfig.count} Qs</div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Difficulty</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Easy', 'Medium', 'Hard'].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setGenConfig({ ...genConfig, difficulty: d })}
                                        className={`py-2 text-xs font-bold rounded-lg ${genConfig.difficulty === d ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || genSelectedMaterials.length === 0}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Generate Quiz'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Results Preview */}
            <div className="flex-1 bg-white dark:bg-[#1a1b26] rounded-2xl border border-gray-200 dark:border-white/5 p-6 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generated Preview</h3>
                    {genResult && (
                        <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600">
                            Publish to Quiz Bank
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                    {genResult ? genResult.map((q, i) => (
                        <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                            <div className="flex gap-4">
                                <span className="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">{i + 1}</span>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-lg mb-3">{q.question}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {q.options.map((opt: string, idx: number) => (
                                            <div key={idx} className={`p-3 rounded-lg text-sm border-2 ${idx === q.correctAnswer ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-transparent bg-white dark:bg-black/20'}`}>
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <Bot className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select materials and click Generate to see questions here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1016] p-8">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600" />
                        AI Studio
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage raw learning materials and generate advanced quizzes.</p>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-white dark:bg-[#1a1b26] p-1.5 rounded-2xl w-fit border border-gray-200 dark:border-white/5 shadow-sm">
                {[
                    { id: 'ingest', label: 'Ingest & Label', icon: Upload },
                    { id: 'library', label: 'Material Library', icon: Library },
                    { id: 'generate', label: 'Generator', icon: Bot },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === tab.id
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="h-[calc(100vh-250px)]">
                {activeTab === 'ingest' && renderIngestTab()}
                {activeTab === 'library' && renderLibraryTab()}
                {activeTab === 'generate' && renderGeneratorTab()}
            </div>
        </div>
    );
};

export default AiStudio;
