import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { CompilerQuestion } from '../../types';
import { Plus, Edit2, Trash2, RefreshCw, Code2, Save, X, AlertCircle, CheckCircle2, Upload, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

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
        } catch (err: any) {
            setError(err.message || 'Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuestions();
    }, [adminId]);

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
        } catch (err: any) {
            setError(err.message || 'Failed to create question');
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
        } catch (err: any) {
            setError(err.message || 'Failed to update question');
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
        } catch (err: any) {
            setError(err.message || 'Failed to delete question');
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
            const timer = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
            case 'hard': return 'bg-red-500/10 border-red-500/20 text-red-400';
            default: return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
        }
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
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Manage coding challenges for daily challenges
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={loadQuestions}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                            onClick={() => { setShowCreate(true); setForm(initialForm); }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold flex items-center gap-2 hover:from-orange-600 hover:to-red-700 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add Question
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

                {/* Create/Edit Form Modal */}
                {(showCreate || editingId) && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#13141f] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                                    {editingId ? 'Edit Question' : 'Create Question'}
                                </h2>
                                <button
                                    onClick={() => { setShowCreate(false); setEditingId(null); }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Title *</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        placeholder="e.g., Reverse a String"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Description *</label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                        rows={4}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                                        placeholder="Describe the problem and requirements..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Reference Code (Solution) *</label>
                                    <textarea
                                        value={form.referenceCode}
                                        onChange={(e) => setForm(prev => ({ ...prev, referenceCode: e.target.value }))}
                                        rows={6}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                                        placeholder="// The reference solution code..."
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Language</label>
                                        <select
                                            value={form.language}
                                            onChange={(e) => setForm(prev => ({ ...prev, language: e.target.value }))}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="python">Python</option>
                                            <option value="java">Java</option>
                                            <option value="cpp">C++</option>
                                            <option value="csharp">C#</option>
                                            <option value="typescript">TypeScript</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Difficulty</label>
                                        <select
                                            value={form.difficulty}
                                            onChange={(e) => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Category</label>
                                        <input
                                            type="text"
                                            value={form.category}
                                            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                            placeholder="e.g., Strings"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Reward Coins</label>
                                        <input
                                            type="number"
                                            value={form.rewardCoins}
                                            onChange={(e) => setForm(prev => ({ ...prev, rewardCoins: parseInt(e.target.value) || 0 }))}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Reward XP</label>
                                        <input
                                            type="number"
                                            value={form.rewardXP}
                                            onChange={(e) => setForm(prev => ({ ...prev, rewardXP: parseInt(e.target.value) || 0 }))}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Hints */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">Hints</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={hintInput}
                                            onChange={(e) => setHintInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHint())}
                                            className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                            placeholder="Add a hint..."
                                        />
                                        <button
                                            onClick={addHint}
                                            className="px-4 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                        >
                                            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </button>
                                    </div>
                                    {form.hints.length > 0 && (
                                        <ul className="space-y-1">
                                            {form.hints.map((hint, idx) => (
                                                <li key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="flex-1">{hint}</span>
                                                    <button onClick={() => removeHint(idx)} className="text-red-400 hover:text-red-500">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowCreate(false); setEditingId(null); }}
                                    className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold flex items-center gap-2 hover:from-orange-600 hover:to-red-700 transition-all"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
