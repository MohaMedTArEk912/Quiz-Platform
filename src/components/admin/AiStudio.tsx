import React, { useState, useEffect } from 'react';
import {
    Upload, FileText, CheckCircle2,
    Sparkles, Trash2, Library,
    Bot, Loader2, Plus, BookOpen, X, Edit, RefreshCw, Save
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAiJobs } from '../../contexts/AiJobContext';

// Unified Interface
interface Material {
    _id: string; // If from backend 'materials' array
    title: string;
    type: 'lesson' | 'exam_raw' | 'exam_processed' | 'content' | 'exam';
    isProcessed: boolean;
    uploadedAt: string;
    summary?: string;
    extractedQuestions?: any[];
    // For file updates mapping
    originalName?: string;
    currentName?: string;
    status?: 'unchanged' | 'renamed' | 'replaced';
    replacementFile?: File;
    isEditingName?: boolean;
}

interface Subject {
    _id: string;
    title: string;
    description: string;
    materials: Material[];
    createdAt: string;
    oldQuestions?: any[]; // legacy
}

interface AiStudioProps {
    adminId: string;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const AiStudio: React.FC<AiStudioProps> = ({ adminId, onNotification }) => {
    const { addJob } = useAiJobs();
    const [activeTab, setActiveTab] = useState<'subjects' | 'generate'>('subjects');
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // Generator State
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [genSelectedMaterials, setGenSelectedMaterials] = useState<string[]>([]);
    const [genConfig, setGenConfig] = useState({ count: 10, difficulty: 'Medium' });
    const [genResult, setGenResult] = useState<any[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Subject Management State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

    // Publish State
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [publishConfig, setPublishConfig] = useState({
        title: '',
        timeLimit: 30,
        passingScore: 70
    });
    const [isPublishing, setIsPublishing] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [contentFiles, setContentFiles] = useState<File[]>([]);
    const [oldExamFiles, setOldExamFiles] = useState<File[]>([]);
    const [appendContent, setAppendContent] = useState(true);
    const [managedFiles, setManagedFiles] = useState<Material[]>([]);

    const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

    useEffect(() => {
        loadSubjects();
    }, [adminId]);

    const loadSubjects = async () => {
        try {
            const res = await api.getAllSubjects(adminId);
            if (res.success) setSubjects(res.data);
        } catch (e) {
            console.error(e);
            onNotification('error', 'Failed to load subjects');
        }
    };

    // --- Subject CRUD ---

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const allFiles = [...contentFiles, ...oldExamFiles];
        const oversizedFile = allFiles.find(f => f.size > MAX_FILE_SIZE);
        if (oversizedFile) {
            onNotification('error', `File "${oversizedFile.name}" exceeds 200MB limit.`);
            return;
        }

        if (!title) {
            onNotification('error', 'Title is required');
            return;
        }

        try {
            setCreating(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            contentFiles.forEach(file => formData.append('contentFiles', file));
            oldExamFiles.forEach(file => formData.append('oldExamFiles', file));

            const response = await api.createSubject(formData, adminId);
            if (response.success) {
                onNotification('success', 'Subject created successfully');
                setIsCreateModalOpen(false);
                resetForm();
                loadSubjects();
            }
        } catch (error: any) {
            onNotification('error', error.message || 'Failed to create subject');
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject);
        setTitle(subject.title);
        setDescription(subject.description || '');
        setContentFiles([]);
        setOldExamFiles([]);
        setAppendContent(true);

        if (subject.materials) {
            setManagedFiles(subject.materials.map(m => ({
                ...m,
                originalName: m.title, // Assume title is original name
                currentName: m.title,
                status: 'unchanged',
                isEditingName: false,
                type: m.type as any
            })));
        } else {
            setManagedFiles([]);
        }
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSubject) return;

        try {
            const replacementFilesToUpload = managedFiles
                .filter(f => f.status === 'replaced' && f.replacementFile)
                .map(f => f.replacementFile as File);

            const allFiles = [...contentFiles, ...oldExamFiles, ...replacementFilesToUpload];
            const oversizedFile = allFiles.find(f => f.size > MAX_FILE_SIZE);
            if (oversizedFile) {
                onNotification('error', `File "${oversizedFile.name}" exceeds 200MB limit.`);
                return;
            }

            setUpdating(true);
            const formData = new FormData();
            if (title !== editingSubject.title) formData.append('title', title);
            if (description !== editingSubject.description) formData.append('description', description);
            formData.append('appendContent', appendContent.toString());

            const fileUpdates: any[] = [];
            const replacementFiles: File[] = [];

            managedFiles.forEach((file) => {
                if (file.status === 'renamed') {
                    fileUpdates.push({
                        action: 'rename',
                        originalName: file.originalName,
                        newName: file.currentName,
                        type: file.type
                    });
                } else if (file.status === 'replaced' && file.replacementFile) {
                    fileUpdates.push({
                        action: 'replace',
                        originalName: file.originalName,
                        type: file.type,
                        replacementIndex: replacementFiles.length
                    });
                    replacementFiles.push(file.replacementFile);
                }
            });

            if (fileUpdates.length > 0) {
                formData.append('fileUpdates', JSON.stringify(fileUpdates));
                replacementFiles.forEach(file => formData.append('replacementFiles', file));
            }

            contentFiles.forEach(file => formData.append('contentFiles', file));
            oldExamFiles.forEach(file => formData.append('oldExamFiles', file));

            const response = await api.updateSubject(editingSubject._id, formData, adminId);
            if (response.success) {
                onNotification('success', 'Subject updated successfully!');
                setIsEditModalOpen(false);
                resetForm();
                loadSubjects();
            }
        } catch (error: any) {
            onNotification('error', error.message || 'Failed to update subject');
        } finally {
            setUpdating(false);
        }
    };

    const handleFileAction = (index: number, action: 'start-rename' | 'cancel-rename' | 'save-rename' | 'replace', data?: any) => {
        const newFiles = [...managedFiles];
        const file = newFiles[index];

        if (action === 'start-rename') {
            file.isEditingName = true;
        } else if (action === 'cancel-rename') {
            file.currentName = file.originalName;
            file.isEditingName = false;
            if (file.status === 'renamed') file.status = 'unchanged';
        } else if (action === 'save-rename') {
            file.currentName = data;
            file.isEditingName = false;
            file.status = file.status === 'replaced' ? 'replaced' : 'renamed';
        } else if (action === 'replace') {
            const newFile = data as File;
            file.replacementFile = newFile;
            file.currentName = newFile.name;
            file.status = 'replaced';
        }
        setManagedFiles(newFiles);
    };

    const handleDeleteSubject = async () => {
        if (!subjectToDelete) return;
        try {
            const response = await api.deleteSubject(subjectToDelete._id, adminId);
            if (response.success) {
                onNotification('success', 'Subject deleted');
                setSubjects(subjects.filter(s => s._id !== subjectToDelete._id));
                setIsDeleteModalOpen(false);
                setSubjectToDelete(null);
            }
        } catch (error: any) {
            onNotification('error', error.message);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setContentFiles([]);
        setOldExamFiles([]);
        setEditingSubject(null);
        setAppendContent(true);
        setManagedFiles([]);
    };

    // --- AI Material Actions ---

    const handleProcess = async (e: React.MouseEvent, subjectId: string, materialId: string) => {
        e.stopPropagation(); // prevent card click
        if (!materialId) {
            onNotification('error', 'Cannot process: Missing ID');
            return;
        }
        addJob('process', 'AI is processing material...');
        try {
            await api.processMaterial(subjectId, materialId, adminId);
            // Optimistic update or wait for websocket?
            // Re-load subjects to see updated status?
            onNotification('success', 'Processing started');
            // Background job will handle it, but we might want to refresh periodically or optimistically set loading
        } catch (e: any) {
            onNotification('error', 'Processing failed: ' + e.message);
        }
    };

    const handleMaterialDelete = async (e: React.MouseEvent, subjectId: string, materialId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this file?')) return;
        try {
            await api.deleteMaterial(subjectId, materialId, adminId);
            loadSubjects();
            onNotification('success', 'Material deleted');
        } catch (e: any) {
            onNotification('error', 'Delete failed: ' + e.message);
        }
    };

    // --- Generator Logic ---

    const handleNavigateToGenerator = (subjectId: string) => {
        setSelectedSubjectId(subjectId);
        setGenSelectedMaterials([]); // Reset previous selection or maybe auto-select all processed?
        // Auto-select all processed materials for convenience
        const subject = subjects.find(s => s._id === subjectId);
        if (subject) {
            const processedIds = subject.materials.filter(m => m.isProcessed).map(m => m._id);
            setGenSelectedMaterials(processedIds);
        }
        setActiveTab('generate');
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
                onNotification('success', 'Quiz generated successfully');
            }
        } catch (e: any) {
            onNotification('error', 'Generation failed: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!genResult || !selectedSubjectId) return;

        try {
            setIsPublishing(true);
            const subject = subjects.find(s => s._id === selectedSubjectId);

            // Map AI questions to Quiz Question format
            // Assuming AI returns { question: string, options: string[], correctAnswer: number, type: 'multiple-choice' }
            // And Quiz expects { id: number, text: string, options: string[], correctOption: number, type: 'multiple-choice', points: 1 }

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
                description: `Generated from ${subject?.title || 'AI Studio'}`,
                questions: questions,
                timeLimit: publishConfig.timeLimit,
                passingScore: publishConfig.passingScore,
                shuffleQuestions: true,
                showFeedback: true,
                maxAttempts: 3,
                status: 'published',
                subjectId: selectedSubjectId
            };

            const res = await api.createQuiz(quizData, adminId);
            if (res.success || res._id) { // createQuiz returns the created object or success wrapper? checking legacy api might be needed but api.ts says returns json. 
                onNotification('success', 'Quiz published to Quiz Bank successfully!');
                setIsPublishModalOpen(false);
                setGenResult(null); // Clear result after publishing
                // Maybe redirect to Quizzes tab? For now stay here.
            }
        } catch (e: any) {
            console.error(e);
            onNotification('error', 'Failed to publish quiz: ' + e.message);
        } finally {
            setIsPublishing(false);
        }
    };

    // --- RENDER ---

    const renderSubjectsTab = () => (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Subjects</h3>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Subject
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject) => (
                    <div key={subject._id} className="bg-white dark:bg-[#1a1b26] rounded-xl border border-gray-200 dark:border-white/5 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(subject); }}
                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Edit Subject"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSubjectToDelete(subject); setIsDeleteModalOpen(true); }}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete Subject"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 pr-8">{subject.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{subject.description || 'No description'}</p>

                        {/* Inline Files List with Process Actions */}
                        <div className="space-y-2 mt-4 max-h-40 overflow-y-auto custom-scrollbar">
                            {subject.materials?.map(m => (
                                <div key={m._id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-black/20 group/file">
                                    <div className="min-w-0 flex items-center gap-2">
                                        {m.isProcessed ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        )}
                                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate" title={m.title}>{m.title}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/file:opacity-100 transition-opacity">
                                        {!m.isProcessed && (
                                            <button
                                                onClick={(e) => handleProcess(e, subject._id, m._id)}
                                                className="p-1 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded"
                                                title="Process with AI"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleMaterialDelete(e, subject._id, m._id)}
                                            className="p-1 text-red-400 hover:text-red-500"
                                            title="Delete File"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(!subject.materials || subject.materials.length === 0) && (
                                <div className="text-xs text-gray-400 italic">No files uploaded.</div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                            <div className="text-xs text-gray-400">
                                {new Date(subject.createdAt).toLocaleDateString()} • {subject.materials?.length || 0} Files
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNavigateToGenerator(subject._id); }}
                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1"
                            >
                                <Bot className="w-3 h-3" />
                                Generate Quiz
                            </button>
                        </div>
                    </div>
                ))}

                {subjects.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-xl">
                        <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                        <p>No subjects found. Create one to get started.</p>
                    </div>
                )}
            </div>
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
                                    {m.isProcessed && <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />}
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
                        <button
                            onClick={() => {
                                const subject = subjects.find(s => s._id === selectedSubjectId);
                                setPublishConfig(prev => ({ ...prev, title: `AI Quiz: ${subject?.title || 'General'}` }));
                                setIsPublishModalOpen(true);
                            }}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
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
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-purple-500" />
                        AI Studio & Subjects
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage course subjects and generate quizzes.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white dark:bg-[#1a1b26] p-1 rounded-xl border border-gray-200 dark:border-white/5">
                    {[
                        { id: 'subjects', label: 'Subjects', icon: Library },
                        { id: 'generate', label: 'Generator', icon: Bot },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === tab.id
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'subjects' && renderSubjectsTab()}
                {activeTab === 'generate' && renderGeneratorTab()}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#0f1016] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-white/10">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center sticky top-0 bg-white dark:bg-[#0f1016] z-10">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create New Subject</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2.5 text-white bg-gray-800 hover:bg-red-600 rounded-lg"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500 h-24 resize-none" />
                            </div>
                            {/* File Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-6 text-center bg-gray-50 dark:bg-white/5">
                                    <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                                    <p className="text-xs font-bold mb-2">Content Files</p>
                                    <input type="file" title='contentFiles' accept=".pdf,.pptx,.txt" multiple onChange={(e) => setContentFiles(Array.from(e.target.files || []))} className="text-xs w-full" />
                                </div>
                                <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-6 text-center bg-gray-50 dark:bg-white/5">
                                    <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                    <p className="text-xs font-bold mb-2">Old Exams</p>
                                    <input type="file" title='examFiles' accept=".pdf,.txt" multiple onChange={(e) => setOldExamFiles(Array.from(e.target.files || []))} className="text-xs w-full" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100">Cancel</button>
                                <button type="submit" disabled={creating} className="px-6 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Subject'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#0f1016] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-white/10">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center sticky top-0 bg-white dark:bg-[#0f1016] z-10">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Subject</h3>
                            <button onClick={() => { setIsEditModalOpen(false); resetForm(); }} className="p-2.5 text-white bg-gray-800 hover:bg-red-600 rounded-lg"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-4 space-y-4">
                            <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10" /></div>
                            <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 h-20" /></div>

                            {/* Managed Files */}
                            {managedFiles.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase">Manage Files</h4>
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl border max-h-48 overflow-y-auto p-2 space-y-2">
                                        {managedFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-white/5 rounded-lg">
                                                <div className="flex-1 truncate">
                                                    {file.isEditingName ? (
                                                        <div className="flex gap-1">
                                                            <input defaultValue={file.currentName} className="flex-1 bg-transparent border-b border-purple-500 outline-none"
                                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFileAction(idx, 'save-rename', e.currentTarget.value); } }}
                                                            />
                                                            <button type="button" onClick={() => handleFileAction(idx, 'cancel-rename')}><X className="w-4 h-4" /></button>
                                                        </div>
                                                    ) : (
                                                        <span className={file.status !== 'unchanged' ? 'text-purple-500 font-bold' : ''}>{file.currentName}</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    {!file.isEditingName && (
                                                        <>
                                                            <button type="button" onClick={() => handleFileAction(idx, 'start-rename')} className="p-1 hover:bg-gray-200 rounded"><Edit className="w-3 h-3" /></button>
                                                            <label className="p-1 hover:bg-gray-200 rounded cursor-pointer">
                                                                <RefreshCw className="w-3 h-3" />
                                                                <input type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileAction(idx, 'replace', e.target.files[0]); }} />
                                                            </label>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={appendContent} onChange={(e) => setAppendContent(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Append New Content (Uncheck to replace all)</span>
                                </label>
                            </div>

                            {/* Add New Files */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border dashed rounded-lg text-center"><p className="text-xs font-bold">Add Content</p><input type="file" multiple onChange={(e) => setContentFiles(Array.from(e.target.files || []))} className="text-xs w-full mt-2" /></div>
                                <div className="p-4 border dashed rounded-lg text-center"><p className="text-xs font-bold">Add Exams</p><input type="file" multiple onChange={(e) => setOldExamFiles(Array.from(e.target.files || []))} className="text-xs w-full mt-2" /></div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => { setIsEditModalOpen(false); resetForm(); }} className="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100">Cancel</button>
                                <button type="submit" disabled={updating} className="px-6 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50">{updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Subject'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && subjectToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#0f1016] rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
                        <Trash2 className="w-12 h-12 text-red-500 mx-auto bg-red-100 p-2 rounded-full" />
                        <h3 className="text-lg font-bold">Delete Subject?</h3>
                        <p className="text-sm text-gray-500">Are you sure you want to delete "{subjectToDelete.title}"?</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded border hover:bg-gray-50">Cancel</button>
                            <button onClick={handleDeleteSubject} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Publish Modal */}
            {isPublishModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#0f1016] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-white/10">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-[#13141f] rounded-t-2xl">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Save className="w-4 h-4 text-green-500" />
                                Publish Quiz
                            </h3>
                            <button onClick={() => setIsPublishModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Quiz Title</label>
                                <input
                                    type="text"
                                    value={publishConfig.title}
                                    onChange={(e) => setPublishConfig({ ...publishConfig, title: e.target.value })}
                                    className="w-full p-2 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Time Limit (min)</label>
                                    <input
                                        type="number"
                                        value={publishConfig.timeLimit}
                                        onChange={(e) => setPublishConfig({ ...publishConfig, timeLimit: parseInt(e.target.value) })}
                                        className="w-full p-2 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Pass Score (%)</label>
                                    <input
                                        type="number"
                                        value={publishConfig.passingScore}
                                        onChange={(e) => setPublishConfig({ ...publishConfig, passingScore: parseInt(e.target.value) })}
                                        className="w-full p-2 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handlePublish}
                                disabled={isPublishing}
                                className="w-full py-3 mt-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 disabled:opacity-50"
                            >
                                {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiStudio;
