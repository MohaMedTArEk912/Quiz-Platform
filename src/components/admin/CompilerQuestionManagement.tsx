import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import type { CompilerQuestion } from '../../types';
import Modal from '../common/Modal';
import { Plus, Edit2, Trash2, RefreshCw, Code2, Save, X, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Upload, Download } from 'lucide-react';

interface CompilerQuestionManagementProps {
    adminId: string;
}

/**
 * Admin component for managing compiler questions used in daily challenges.
 * Provides CRUD operations and bulk upload functionality.
 */
const CompilerQuestionManagement: React.FC<CompilerQuestionManagementProps> = ({ adminId }) => {
    const [questions, setQuestions] = useState<CompilerQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importPreview, setImportPreview] = useState<Partial<CompilerQuestion>[]>([]);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const initialForm = {
        title: '',
        description: '',
        referenceCode: '',
        language: 'javascript',
        difficulty: 'medium',
        category: 'general',
        hints: [] as string[],
        rewardCoins: 100,
        rewardXP: 150,
        isActive: true
    };
    const [form, setForm] = useState(initialForm);
    const [hintInput, setHintInput] = useState('');

    /**
     * Fetch all compiler questions from the API
     */
    const loadQuestions = async () => {
        try {
            setLoading(true);
            const data = await api.getCompilerQuestionsAdmin(adminId);
            setQuestions(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load questions';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuestions();
    }, [adminId]);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /**
     * Create a new compiler question
     */
    const handleCreate = async () => {
        if (!form.title || !form.description || !form.referenceCode) {
            setError('Title, description, and reference code are required');
            return;
        }

        try {
            await api.createCompilerQuestion({
                title: form.title,
                description: form.description,
                referenceCode: form.referenceCode,
                language: form.language,
                difficulty: form.difficulty,
                category: form.category,
                hints: form.hints,
                rewardCoins: form.rewardCoins,
                rewardXP: form.rewardXP
            }, adminId);

            setSuccess('Question created successfully');
            setShowCreate(false);
            setForm(initialForm);
            loadQuestions();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create question');
        }
    };

    /**
     * Update an existing compiler question
     */
    const handleUpdate = async (id: string) => {
        try {
            await api.updateCompilerQuestion(id, form, adminId);
            setSuccess('Question updated successfully');
            setEditingId(null);
            loadQuestions();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update question');
        }
    };

    /**
     * Delete a compiler question
     */
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this question?')) return;

        try {
            await api.deleteCompilerQuestion(id, adminId);
            setSuccess('Question deleted successfully');
            loadQuestions();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to delete question');
        }
    };

    /**
     * Start editing a question
     */
    const startEdit = (q: CompilerQuestion) => {
        setEditingId(q.questionId);
        setForm({
            title: q.title,
            description: q.description,
            referenceCode: q.referenceCode || '',
            language: q.language,
            difficulty: q.difficulty,
            category: q.category,
            hints: q.hints || [],
            rewardCoins: q.rewardCoins,
            rewardXP: q.rewardXP,
            isActive: q.isActive
        });
    };

    /**
     * Add a hint to the form
     */
    const addHint = () => {
        if (hintInput.trim()) {
            setForm(prev => ({ ...prev, hints: [...prev.hints, hintInput.trim()] }));
            setHintInput('');
        }
    };

    /**
     * Remove a hint from the form
     */
    const removeHint = (index: number) => {
        setForm(prev => ({ ...prev, hints: prev.hints.filter((_, i) => i !== index) }));
    };

    /**
     * Clear notifications after 3 seconds
     */
    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const t = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(t);
        }
    }, [error]);

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
            case 'hard': return 'bg-red-500/10 border-red-500/20 text-red-400';
            default: return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
        }
    };

    // ===== JSON Import/Export =====
    const handleDownloadSampleJson = () => {
        const sample = [
            { title: "Reverse a String", description: "Write a function that reverses the input string.", referenceCode: "function reverseString(str) {\n  return str.split('').reverse().join('');\n}", language: "javascript", difficulty: "easy", category: "Strings", hints: ["Think about array methods"], rewardCoins: 50, rewardXP: 100 },
            { title: "Two Sum", description: "Given an array of integers and a target sum, return indices of two numbers that add up to the target.", referenceCode: "function twoSum(nums, target) {\n  const map = {};\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map[complement] !== undefined) return [map[complement], i];\n    map[nums[i]] = i;\n  }\n  return [];\n}", language: "javascript", difficulty: "medium", category: "Arrays", hints: ["Use a hash map for O(n) solution"], rewardCoins: 100, rewardXP: 150 }
        ];
        const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'compiler-questions-sample.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccess('Sample JSON downloaded');
        setShowMenu(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            setImportJson(text);
            try {
                const parsed = JSON.parse(text);
                setImportPreview(Array.isArray(parsed) ? parsed : [parsed]);
            } catch { setImportPreview([]); }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
        setShowImportModal(true);
        setShowMenu(false);
    };

    const handleImportSubmit = async () => {
        if (importPreview.length === 0) { setError('No valid questions to import'); return; }
        let count = 0;
        for (const q of importPreview) {
            try {
                await api.createCompilerQuestion({
                    title: q.title || 'Untitled', description: q.description || '', referenceCode: q.referenceCode || '',
                    language: q.language || 'javascript', difficulty: q.difficulty || 'medium', category: q.category || 'general',
                    hints: q.hints || [], rewardCoins: q.rewardCoins || 100, rewardXP: q.rewardXP || 150
                }, adminId);
                count++;
            } catch (err) { console.error('Import error:', err); }
        }
        setSuccess(`Imported ${count} question(s)`);
        setShowImportModal(false); setImportJson(''); setImportPreview([]);
        loadQuestions();
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-[#0a0a0b] min-h-screen">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            <Code2 className="w-7 h-7 text-orange-500" />
                            Compiler Questions
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage coding challenges for daily challenges</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={loadQuestions} className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors" title="Refresh">
                            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        {/* Import/Export Menu */}
                        <div className="relative" ref={menuRef}>
                            <button onClick={() => setShowMenu(!showMenu)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                Import/Export <ChevronDown className="w-4 h-4" />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#13141f] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                    <button onClick={handleDownloadSampleJson} className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-medium text-sm flex items-center gap-3">
                                        <Download className="w-4 h-4 text-purple-500" /> Download Sample JSON
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-medium text-sm flex items-center gap-3 border-t border-gray-100 dark:border-gray-800">
                                        <Upload className="w-4 h-4 text-indigo-500" /> Import from JSON
                                    </button>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileUpload} className="hidden" />
                        </div>
                        <button onClick={() => { setShowCreate(true); setForm(initialForm); }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold flex items-center gap-2 hover:from-orange-600 hover:to-red-700 transition-all">
                            <Plus className="w-4 h-4" /> Add Question
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                {error && (
                    <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        {success}
                    </div>
                )}

                {/* Import Modal */}
                <Modal
                    isOpen={showImportModal}
                    onClose={() => { setShowImportModal(false); setImportJson(''); setImportPreview([]); }}
                    title="Import Questions"
                    description="Paste JSON or upload a file to bulk import compiler questions"
                    maxWidth="max-w-2xl"
                    icon={<Upload className="w-6 h-6 text-indigo-500" />}
                    footer={
                        <>
                            <button onClick={() => { setShowImportModal(false); setImportJson(''); setImportPreview([]); }} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
                            <button onClick={handleImportSubmit} disabled={importPreview.length === 0} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-700 hover:to-purple-700 transition-all">Import {importPreview.length} Question(s)</button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        <textarea
                            value={importJson}
                            onChange={e => { setImportJson(e.target.value); try { const p = JSON.parse(e.target.value); setImportPreview(Array.isArray(p) ? p : [p]); } catch { setImportPreview([]); } }}
                            placeholder='Paste JSON array here, e.g.:\n[\n  { "title": "...", "description": "...", ... }\n]'
                            className="w-full h-48 bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded-xl border border-gray-700 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none"
                        />
                        {importPreview.length > 0 && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <p className="text-emerald-500 font-bold text-sm mb-2">✓ {importPreview.length} valid question(s) detected:</p>
                                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto custom-scrollbar">
                                    {importPreview.slice(0, 5).map((q, i) => <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />{q.title || 'Untitled'} ({q.difficulty || 'medium'})</li>)}
                                    {importPreview.length > 5 && <li className="text-gray-500 italic pl-3">...and {importPreview.length - 5} more</li>}
                                </ul>
                            </div>
                        )}
                        {importJson && importPreview.length === 0 && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <p className="text-red-500 font-bold text-sm">⚠️ Invalid JSON format. Please check your input.</p>
                            </div>
                        )}
                    </div>
                </Modal>

                {/* Create/Edit Form Modal */}
                <Modal
                    isOpen={showCreate || !!editingId}
                    onClose={() => { setShowCreate(false); setEditingId(null); }}
                    title={editingId ? 'Edit Challenge' : 'New Challenge'}
                    description={editingId ? 'Update existing compiler question details' : 'Create a new coding challenge for users'}
                    maxWidth="max-w-3xl"
                    footer={
                        <>
                            <button
                                onClick={() => { setShowCreate(false); setEditingId(null); }}
                                className="px-6 py-2.5 rounded-xl bg-transparent border-2 border-transparent text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold flex items-center gap-2 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-95 transition-all"
                            >
                                <Save className="w-4 h-4" />
                                {editingId ? 'Save Changes' : 'Create Challenge'}
                            </button>
                        </>
                    }
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Challenge Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all font-medium text-lg"
                                    placeholder="e.g., Reverse a Linked List"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Description (Markdown supported) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={5}
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all resize-y min-h-[120px]"
                                    placeholder="Describe the problem, input/output format, and constraints..."
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Reference Solution <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-gray-200 dark:bg-white/10 text-xs font-mono text-gray-500 dark:text-gray-400 pointer-events-none">
                                        {form.language}
                                    </div>
                                    <textarea
                                        value={form.referenceCode}
                                        onChange={(e) => setForm(prev => ({ ...prev, referenceCode: e.target.value }))}
                                        rows={8}
                                        className="w-full p-4 rounded-xl bg-gray-900 dark:bg-[#0a0a0b] border border-gray-200 dark:border-gray-800 text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all resize-y min-h-[200px]"
                                        placeholder="// Paste the complete working solution here..."
                                        spellCheck={false}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Language</label>
                                <div className="relative">
                                    <select
                                        value={form.language}
                                        onChange={(e) => setForm(prev => ({ ...prev, language: e.target.value }))}
                                        className="w-full p-3 pl-4 pr-10 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer font-medium"
                                    >
                                        <option value="javascript">JavaScript (Node.js)</option>
                                        <option value="typescript">TypeScript</option>
                                        <option value="python">Python 3</option>
                                        <option value="java">Java</option>
                                        <option value="cpp">C++</option>
                                        <option value="csharp">C#</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Difficulty</label>
                                <div className="relative">
                                    <select
                                        value={form.difficulty}
                                        onChange={(e) => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                                        className="w-full p-3 pl-4 pr-10 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 cursor-pointer font-medium"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Category</label>
                                <input
                                    type="text"
                                    value={form.category}
                                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                                    placeholder="e.g., Arrays, DP"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Coins Reward</label>
                                    <input
                                        type="number"
                                        value={form.rewardCoins}
                                        onChange={(e) => setForm(prev => ({ ...prev, rewardCoins: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">XP Reward</label>
                                    <input
                                        type="number"
                                        value={form.rewardXP}
                                        onChange={(e) => setForm(prev => ({ ...prev, rewardXP: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-bold"
                                    />
                                </div>
                            </div>

                            {/* Hints */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Hints</label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={hintInput}
                                        onChange={(e) => setHintInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHint())}
                                        className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        placeholder="Type a hint and press Enter..."
                                    />
                                    <button
                                        onClick={addHint}
                                        className="px-4 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                                    >
                                        <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                                {form.hints.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {form.hints.map((hint, idx) => (
                                            <div key={idx} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-500 group">
                                                <span className="max-w-[200px] truncate">{hint}</span>
                                                <button
                                                    onClick={() => removeHint(idx)}
                                                    className="p-0.5 rounded-full hover:bg-blue-500/20"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* Questions List */}
                {loading ? (
                    <div className="text-center py-12">
                        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">Loading questions...</p>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="bg-white dark:bg-[#13141f] rounded-2xl border border-gray-200 dark:border-white/10 p-12 text-center">
                        <Code2 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-2">No Questions Yet</h3>
                        <p className="text-gray-400 dark:text-gray-500 mb-4">Create your first compiler question to get started.</p>
                        <button
                            onClick={() => { setShowCreate(true); setForm(initialForm); }}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add First Question
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map((q) => (
                            <div
                                key={q.questionId}
                                className="bg-white dark:bg-[#13141f] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
                            >
                                <div className="p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                                        {q.difficulty.charAt(0).toUpperCase()}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getDifficultyColor(q.difficulty)}`}>
                                                {q.difficulty}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                                {q.language}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">
                                                {q.category}
                                            </span>
                                            {!q.isActive && (
                                                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-500/10 border border-red-500/20 text-red-400">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{q.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{q.description}</p>
                                    </div>

                                    {/* Stats */}
                                    {q.stats && (
                                        <div className="hidden md:flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                            <div className="text-center">
                                                <div className="font-bold text-gray-900 dark:text-white">{q.stats.totalSubmissions || 0}</div>
                                                <div className="text-xs">Submissions</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold text-emerald-500">{q.stats.passRate?.toFixed(0) || 0}%</div>
                                                <div className="text-xs">Pass Rate</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setExpandedId(expandedId === q.questionId ? null : q.questionId)}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                        >
                                            {expandedId === q.questionId ? (
                                                <ChevronUp className="w-5 h-5 text-gray-500" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-500" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => startEdit(q)}
                                            className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(q.questionId)}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedId === q.questionId && (
                                    <div className="px-5 pb-5 pt-0 border-t border-gray-100 dark:border-white/5">
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="font-bold text-gray-500 dark:text-gray-400">Rewards:</span>
                                                <span className="ml-2 text-gray-900 dark:text-white">{q.rewardCoins} coins, {q.rewardXP} XP</span>
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-500 dark:text-gray-400">Usage:</span>
                                                <span className="ml-2 text-gray-900 dark:text-white">{q.usageCount || 0} times used</span>
                                            </div>
                                        </div>
                                        {q.hints && q.hints.length > 0 && (
                                            <div className="mt-3">
                                                <span className="font-bold text-gray-500 dark:text-gray-400 text-sm">Hints:</span>
                                                <ul className="mt-1 list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                                                    {q.hints.map((hint, idx) => (
                                                        <li key={idx}>{hint}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div className="mt-3">
                                            <span className="font-bold text-gray-500 dark:text-gray-400 text-sm">Reference Code:</span>
                                            <pre className="mt-1 p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-sm font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                                                {q.referenceCode}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompilerQuestionManagement;
