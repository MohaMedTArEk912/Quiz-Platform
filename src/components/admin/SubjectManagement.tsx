import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, FileText, Upload, Save, X, Loader2, Edit, Check, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';

interface Subject {
    _id: string;
    title: string;
    description: string;
    oldQuestions: any[];
    sourceFiles?: { name: string; type: 'content' | 'exam'; uploadedAt: string }[];
    createdAt: string;
}

interface ManagedFile {
    originalName: string;
    currentName: string;
    type: 'content' | 'exam';
    uploadedAt: string;
    status: 'unchanged' | 'renamed' | 'replaced';
    replacementFile?: File;
    isEditingName?: boolean;
}

interface SubjectManagementProps {
    adminId: string;
    onNotification: (type: 'success' | 'error', message: string) => void;
}

const SubjectManagement: React.FC<SubjectManagementProps> = ({ adminId, onNotification }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [contentFiles, setContentFiles] = useState<File[]>([]);
    const [oldExamFiles, setOldExamFiles] = useState<File[]>([]);
    const [appendContent, setAppendContent] = useState(true); // For edit mode

    const [managedFiles, setManagedFiles] = useState<ManagedFile[]>([]);

    useEffect(() => {
        loadSubjects();
    }, [adminId]);

    const loadSubjects = async () => {
        try {
            setLoading(true);
            const response = await api.getAllSubjects(adminId);
            if (response.success) {
                setSubjects(response.data);
            }
        } catch (error) {
            console.error('Failed to load subjects', error);
            onNotification('error', 'Failed to load subjects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || contentFiles.length === 0) {
            onNotification('error', 'Title and at least one content file are required');
            return;
        }

        try {
            setCreating(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);

            // Append all content files
            contentFiles.forEach(file => {
                formData.append('contentFiles', file);
            });

            // Append all old exam files
            oldExamFiles.forEach(file => {
                formData.append('oldExamFiles', file);
            });

            // Pass admin ID if needed by backend, usually handled by auth token or prop
            // formData.append('adminId', adminId); 

            const response = await api.createSubject(formData, adminId);
            if (response.success) {
                onNotification('success', 'Subject created successfully');
                setIsCreateModalOpen(false);
                resetForm();
                loadSubjects();
            }
        } catch (error: any) {
            console.error('Create error:', error);
            onNotification('error', error.message || 'Failed to create subject');
        } finally {
            setCreating(false);
        }
    };

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

    const confirmDelete = (subject: Subject) => {
        setSubjectToDelete(subject);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
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

    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject);
        setTitle(subject.title);
        setDescription(subject.description || '');
        setContentFiles([]);
        setOldExamFiles([]);
        setAppendContent(true);

        // Initialize managed files
        if (subject.sourceFiles) {
            setManagedFiles(subject.sourceFiles.map(f => ({
                originalName: f.name,
                currentName: f.name,
                type: f.type,
                uploadedAt: f.uploadedAt,
                status: 'unchanged',
                isEditingName: false
            })));
        } else {
            setManagedFiles([]);
        }

        setIsEditModalOpen(true);
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
            file.currentName = data; // data contains new name
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

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSubject) return;

        try {
            setUpdating(true);
            const formData = new FormData();

            if (title !== editingSubject.title) {
                formData.append('title', title);
            }
            if (description !== editingSubject.description) {
                formData.append('description', description);
            }
            formData.append('appendContent', appendContent.toString());

            // Handle Managed Files (Rename/Replace)
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
                        replacementIndex: replacementFiles.length // Point to next index
                    });
                    replacementFiles.push(file.replacementFile);
                }
            });

            if (fileUpdates.length > 0) {
                formData.append('fileUpdates', JSON.stringify(fileUpdates));
                replacementFiles.forEach(file => {
                    formData.append('replacementFiles', file);
                });
            }

            // Append files if any
            contentFiles.forEach(file => {
                formData.append('contentFiles', file);
            });

            oldExamFiles.forEach(file => {
                formData.append('oldExamFiles', file);
            });

            const response = await api.updateSubject(editingSubject._id, formData, adminId);
            if (response.success) {
                onNotification('success', 'Subject updated successfully!');
                setIsEditModalOpen(false);
                resetForm();
                loadSubjects();
            }
        } catch (error: any) {
            console.error('Update error:', error);
            onNotification('error', error.message || 'Failed to update subject');
        } finally {
            setUpdating(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setContentFiles([]);
        setOldExamFiles([]);
        setEditingSubject(null);
        setAppendContent(true);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-purple-500" />
                        Subject Management
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage course subjects, content, and exam history.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Subject
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((subject) => (
                        <div key={subject._id} className="bg-white dark:bg-[#13141f] rounded-xl border border-gray-200 dark:border-white/5 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={() => handleEdit(subject)}
                                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Edit Subject"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => confirmDelete(subject)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete Subject"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 pr-8">{subject.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{subject.description || 'No description'}</p>

                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span>Content Uploaded</span>
                                </div>
                                {subject.oldQuestions && subject.oldQuestions.length > 0 && (
                                    <div className="flex items-center gap-1 text-green-500">
                                        <BookOpen className="w-3 h-3" />
                                        <span>{subject.oldQuestions.length} Old Qs</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-xs text-gray-400">
                                Created: {new Date(subject.createdAt).toLocaleDateString()}
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
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#0f1016] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-white/10">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center sticky top-0 bg-white dark:bg-[#0f1016] z-10">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create New Subject</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2.5 text-white bg-gray-800 hover:bg-red-600 dark:bg-white/10 dark:hover:bg-red-600 rounded-lg transition-all hover:scale-110"
                                aria-label="Close"
                                title="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500"
                                    placeholder="e.g. Advanced Biology"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                                    placeholder="Brief description of the subject..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Content Files */}
                                <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-6 text-center hover:border-purple-500/50 transition-colors bg-gray-50 dark:bg-white/5">
                                    <div className="mb-2 flex justify-center">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                        Slides / Content
                                    </p>
                                    <p className="text-xs text-gray-500 mb-4">Required (PDF/PPTX/TXT) - Multiple files allowed</p>
                                    <input
                                        type="file"
                                        accept=".pdf,.pptx,.txt"
                                        multiple
                                        onChange={(e) => setContentFiles(Array.from(e.target.files || []))}
                                        className="hidden"
                                        id="content-files"
                                        required
                                    />
                                    <label
                                        htmlFor="content-files"
                                        className="px-4 py-2 bg-white dark:bg-white/10 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-white/20 transition-colors inline-block text-gray-700 dark:text-gray-200"
                                    >
                                        {contentFiles.length > 0 ? `${contentFiles.length} file(s) selected` : 'Choose Files'}
                                    </label>
                                    {contentFiles.length > 0 && (
                                        <div className="mt-3 text-xs text-left space-y-1">
                                            {contentFiles.map((file, idx) => (
                                                <div key={idx} className="text-gray-600 dark:text-gray-400 truncate">
                                                    • {file.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Old Exam Files */}
                                <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors bg-gray-50 dark:bg-white/5">
                                    <div className="mb-2 flex justify-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                        Old Exams (Optional)
                                    </p>
                                    <p className="text-xs text-gray-500 mb-4">Extracts Qs & Style - Multiple files allowed</p>
                                    <input
                                        type="file"
                                        accept=".pdf,.pptx,.txt"
                                        multiple
                                        onChange={(e) => setOldExamFiles(Array.from(e.target.files || []))}
                                        className="hidden"
                                        id="exam-files"
                                    />
                                    <label
                                        htmlFor="exam-files"
                                        className="px-4 py-2 bg-white dark:bg-white/10 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-white/20 transition-colors inline-block text-gray-700 dark:text-gray-200"
                                    >
                                        {oldExamFiles.length > 0 ? `${oldExamFiles.length} file(s) selected` : 'Choose Files'}
                                    </label>
                                    {oldExamFiles.length > 0 && (
                                        <div className="mt-3 text-xs text-left space-y-1">
                                            {oldExamFiles.map((file, idx) => (
                                                <div key={idx} className="text-gray-600 dark:text-gray-400 truncate">
                                                    • {file.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#0f1016]">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Create Subject
                                </button>
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
                            <button
                                onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                                className="p-2.5 text-white bg-gray-800 hover:bg-red-600 dark:bg-white/10 dark:hover:bg-red-600 rounded-lg transition-all hover:scale-110"
                                aria-label="Close"
                                title="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500"
                                    placeholder="e.g. Advanced Biology"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                                    placeholder="Brief description of the subject..."
                                />
                            </div>

                            {/* Managed Files List (Edit/Rename/Replace) */}
                            {managedFiles.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Manage Existing Files</h4>
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                                        {managedFiles.map((file, idx) => (
                                            <div key={idx} className={`flex items-center justify-between p-3 border-b border-gray-200 dark:border-white/10 last:border-0 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${file.status !== 'unchanged' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className={`p-2 rounded-lg ${file.type === 'content' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                                                        <FileText className="w-4 h-4" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        {file.isEditingName ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    defaultValue={file.currentName}
                                                                    className="flex-1 min-w-0 p-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0a0a0b] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            handleFileAction(idx, 'save-rename', e.currentTarget.value);
                                                                        }
                                                                    }}
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                                        handleFileAction(idx, 'save-rename', input.value);
                                                                    }}
                                                                    className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFileAction(idx, 'cancel-rename')}
                                                                    className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                                                                    {file.currentName}
                                                                    {file.status !== 'unchanged' && (
                                                                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                                                                            {file.status}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-gray-500 capitalize flex items-center gap-2">
                                                                    {file.type} • {file.originalName !== file.currentName ? `Original: ${file.originalName}` : new Date(file.uploadedAt).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 pl-2">
                                                    {!file.isEditingName && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleFileAction(idx, 'start-rename')}
                                                                className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                                                                title="Rename"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                            <label className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors cursor-pointer" title="Replace File">
                                                                <RefreshCw className="w-3.5 h-3.5" />
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept=".pdf,.pptx,.txt"
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) {
                                                                            handleFileAction(idx, 'replace', e.target.files[0]);
                                                                        }
                                                                    }}
                                                                />
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
                                    <input
                                        type="checkbox"
                                        checked={appendContent}
                                        onChange={(e) => setAppendContent(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white">Append New Content</div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            {appendContent ? 'New files will be added to existing content' : 'New files will replace existing content'}
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Content Files */}
                                <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-6 text-center hover:border-purple-500/50 transition-colors bg-gray-50 dark:bg-white/5">
                                    <div className="mb-2 flex justify-center">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                        Add More Lessons
                                    </p>
                                    <p className="text-xs text-gray-500 mb-4">Optional (PDF/PPTX/TXT)</p>
                                    <input
                                        type="file"
                                        accept=".pdf,.pptx,.txt"
                                        multiple
                                        onChange={(e) => setContentFiles(Array.from(e.target.files || []))}
                                        className="hidden"
                                        id="edit-content-files"
                                    />
                                    <label
                                        htmlFor="edit-content-files"
                                        className="px-4 py-2 bg-white dark:bg-white/10 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-white/20 transition-colors inline-block text-gray-700 dark:text-gray-200"
                                    >
                                        {contentFiles.length > 0 ? `${contentFiles.length} file(s) selected` : 'Choose Files'}
                                    </label>
                                    {contentFiles.length > 0 && (
                                        <div className="mt-3 text-xs text-left space-y-1">
                                            {contentFiles.map((file, idx) => (
                                                <div key={idx} className="text-gray-600 dark:text-gray-400 truncate">
                                                    • {file.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Old Exam Files */}
                                <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors bg-gray-50 dark:bg-white/5">
                                    <div className="mb-2 flex justify-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                        Add More Exams
                                    </p>
                                    <p className="text-xs text-gray-500 mb-4">Optional</p>
                                    <input
                                        type="file"
                                        accept=".pdf,.pptx,.txt"
                                        multiple
                                        onChange={(e) => setOldExamFiles(Array.from(e.target.files || []))}
                                        className="hidden"
                                        id="edit-exam-files"
                                    />
                                    <label
                                        htmlFor="edit-exam-files"
                                        className="px-4 py-2 bg-white dark:bg-white/10 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-white/20 transition-colors inline-block text-gray-700 dark:text-gray-200"
                                    >
                                        {oldExamFiles.length > 0 ? `${oldExamFiles.length} file(s) selected` : 'Choose Files'}
                                    </label>
                                    {oldExamFiles.length > 0 && (
                                        <div className="mt-3 text-xs text-left space-y-1">
                                            {oldExamFiles.map((file, idx) => (
                                                <div key={idx} className="text-gray-600 dark:text-gray-400 truncate">
                                                    • {file.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#0f1016]">
                                <button
                                    type="button"
                                    onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                                    className="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="px-6 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Update Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && subjectToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#0f1016] rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-white/10 p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 mb-2 ring-4 ring-red-50 dark:ring-red-900/20">
                                <Trash2 className="w-6 h-6" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Subject?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] mx-auto">
                                    Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">"{subjectToDelete.title}"</span>? This action cannot be undone.
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectManagement;
