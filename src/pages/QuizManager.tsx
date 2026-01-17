import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MoreVertical, Download, Upload, Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { Quiz, Subject, UserData } from '../types';
import { DIFFICULTY_LEVELS } from '../constants/quizDefaults';

// Custom Hooks
import { useQuizzesBySubject } from '../hooks/useQuizzesBySubject';
import { useQuizFilters } from '../hooks/useQuizFilters';

// Components
import SearchBar from '../components/common/SearchBar';
import StackGrid from '../components/stacks/StackGrid';
import QuizGrid from '../components/quizzes/QuizGrid';
import StackEditModal from '../components/stacks/StackEditModal';
import StackDeleteModal from '../components/stacks/StackDeleteModal';
import QuizEditorModal from '../components/quizzes/QuizEditorModal';
import DeleteQuizModal from '../components/quizzes/DeleteQuizModal';

interface QuizManagerProps {
    quizzes: Quiz[];
    currentUser: UserData;
    onRefresh: () => void;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const QuizManager: React.FC<QuizManagerProps> = ({ quizzes, currentUser, onRefresh, onNotification }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [localQuizzes, setLocalQuizzes] = useState<Quiz[]>(quizzes);

    // View State
    const [viewMode, setViewMode] = useState<'stacks' | 'list'>('stacks');
    const [selectedStackId, setSelectedStackId] = useState<string | null>(null);
    const [activeHeaderMenu, setActiveHeaderMenu] = useState(false);

    // Modal States
    const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [deleteQuizConfirmation, setDeleteQuizConfirmation] = useState<{ isOpen: boolean; id: string } | null>(null);

    // Import State
    const [importTargetStackId, setImportTargetStackId] = useState<string | null>(null);

    // Hooks
    const quizzesBySubject = useQuizzesBySubject(localQuizzes);
    const { searchTerm, setSearchTerm, filteredQuizzes } = useQuizFilters({
        quizzes: localQuizzes,
        selectedStackId,
        viewMode
    });

    // Effects
    useEffect(() => {
        setLocalQuizzes(quizzes);
    }, [quizzes]);

    useEffect(() => {
        loadSubjects();
    }, [currentUser.userId]);

    const loadSubjects = async () => {
        try {
            const res = await api.getAllSubjects(currentUser.userId);
            if (res.success) setSubjects(res.data);
        } catch (error) {
            console.error('Failed to load subjects', error);
        }
    };

    // --- Subject Handlers ---

    const handleSubjectUpdate = async (updatedSubject: Subject) => {
        try {
            const formData = new FormData();
            formData.append('title', updatedSubject.title);
            formData.append('description', updatedSubject.description || '');
            formData.append('icon', updatedSubject.icon);
            formData.append('appendContent', 'true'); // Preserving legacy behavior

            await api.updateSubject(updatedSubject._id, formData, currentUser.userId);

            setSubjects(prev => prev.map(s => s._id === updatedSubject._id ? updatedSubject : s));
            onNotification('success', 'Stack updated successfully');
            setSubjectToEdit(null);
        } catch (error) {
            console.error('Update subject error', error);
            onNotification('error', 'Failed to update stack');
        }
    };

    const handleSubjectDelete = async () => {
        if (!subjectToDelete) return;
        try {
            await api.deleteSubject(subjectToDelete._id, currentUser.userId);
            setSubjects(prev => prev.filter(s => s._id !== subjectToDelete._id));
            setLocalQuizzes(prev => prev.map(q => q.subjectId === subjectToDelete._id ? { ...q, subjectId: undefined } : q));
            onNotification('success', 'Stack deleted successfully');
            setSubjectToDelete(null);
        } catch (error) {
            onNotification('error', 'Failed to delete stack');
        }
    };

    const handleStackImportClick = (subjectId: string) => {
        setImportTargetStackId(subjectId);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // --- Quiz Handlers ---

    const handleSaveQuiz = async (quizToSave: Quiz) => {
        try {
            // Ensure all questions have required fields (ported from original)
            const validatedQuestions = quizToSave.questions.map(q => ({
                ...q,
                part: q.part || 'A',
                id: Number(q.id)
            }));

            const finalQuiz = {
                ...quizToSave,
                questions: validatedQuestions,
                id: quizToSave.id || crypto.randomUUID()
            };

            if (quizToSave.id && localQuizzes.some(q => q.id === quizToSave.id)) {
                await api.updateQuiz(quizToSave.id, finalQuiz, currentUser.userId);
                setLocalQuizzes(prev => prev.map(q => q.id === finalQuiz.id ? finalQuiz : q));
                onNotification('success', 'Quiz updated successfully');
            } else {
                await api.createQuiz(finalQuiz, currentUser.userId);
                setLocalQuizzes(prev => [...prev, finalQuiz]);
                onNotification('success', 'Quiz created successfully');
            }
            setEditingQuiz(null);
            onRefresh();
        } catch (error) {
            console.error('Save quiz error:', error);
            onNotification('error', 'Failed to save quiz. Please check all fields.');
        }
    };

    const confirmDeleteQuiz = async () => {
        if (!deleteQuizConfirmation) return;
        try {
            await api.deleteQuiz(deleteQuizConfirmation.id, currentUser.userId);
            setLocalQuizzes(prev => prev.filter(q => q.id !== deleteQuizConfirmation.id));
            onNotification('success', 'Quiz deleted successfully');
            onRefresh();
        } catch (error) {
            console.error('Delete error:', error);
            onNotification('error', 'Failed to delete quiz');
        } finally {
            setDeleteQuizConfirmation(null);
        }
    };

    const handleDownloadQuiz = (quiz: Quiz) => {
        const dataStr = JSON.stringify(quiz, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${quiz.id || quiz.title.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onNotification('success', `Quiz "${quiz.title}" downloaded successfully`);
    };

    // --- Import / Export Helpers ---

    const handleDownloadSample = () => {
        const sampleQuiz: Quiz = {
            id: 'sample-quiz-template',
            title: 'Sample Quiz Template',
            description: 'Use this template to structure your JSON import.',
            category: 'General',
            difficulty: 'Easy',
            timeLimit: 15,
            passingScore: 70,
            coinsReward: 50,
            xpReward: 100,
            icon: 'Code',
            isTournamentOnly: false,
            questions: [
                {
                    id: 1,
                    type: 'multiple-choice',
                    part: 'Part 1',
                    question: 'What is the answer?',
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswer: 0,
                    points: 10,
                    explanation: 'Explanation here.'
                }
            ]
        };
        // ... download logic ...
        const dataStr = JSON.stringify([sampleQuiz], null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'quiz-import-sample.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportQuiz = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const readFileContent = (file: File): Promise<any> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const json = JSON.parse(e.target?.result as string);
                        resolve(json);
                    } catch (error) {
                        reject(new Error(`Invalid JSON in file ${file.name}`));
                    }
                };
                reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
                reader.readAsText(file);
            });
        };

        try {
            const fileList = Array.from(files);
            const allQuizzes: any[] = [];
            let parseErrors = 0;

            const results = await Promise.allSettled(fileList.map(readFileContent));

            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    const content = result.value;
                    if (Array.isArray(content)) {
                        allQuizzes.push(...content);
                    } else if (content && typeof content === 'object') {
                        allQuizzes.push(content);
                    }
                } else {
                    console.error(result.reason);
                    parseErrors++;
                }
            });

            if (allQuizzes.length === 0) {
                if (parseErrors > 0) {
                    onNotification('error', 'Failed to parse any of the selected files.');
                }
                event.target.value = '';
                return;
            }

            if (importTargetStackId) {
                allQuizzes.forEach(q => q.subjectId = importTargetStackId);
            }

            const result = await api.importQuizzes(allQuizzes, currentUser.userId);

            if (parseErrors > 0) {
                onNotification('warning', `${result.message}. Note: ${parseErrors} files failed to parse.`);
            } else {
                onNotification('success', result.message || 'Quizzes imported successfully');
            }
            setImportTargetStackId(null);
            onRefresh();
        } catch (error) {
            console.error('Import error:', error);
            onNotification('error', 'Failed to import quizzes.');
        } finally {
            event.target.value = '';
        }
    };

    // --- Render ---

    const activeSubjectTitle = selectedStackId === 'uncategorized'
        ? 'Uncategorized Quizzes'
        : subjects.find(s => s._id === selectedStackId)?.title || 'All Quizzes';

    const getEmptyQuiz = (): Quiz => ({
        id: '',
        title: '',
        description: '',
        timeLimit: 10,
        passingScore: 60,
        coinsReward: 10,
        xpReward: 50,
        category: 'General',
        difficulty: DIFFICULTY_LEVELS[0],
        icon: 'Code',
        questions: [],
        subjectId: (selectedStackId && selectedStackId !== 'uncategorized') ? selectedStackId : undefined
    });

    return (
        <div>
            {/* Header */}
            <div className="flex flex-wrap gap-4 justify-between mb-8 items-center">
                <div className="flex items-center gap-4">
                    {viewMode === 'list' && (
                        <button
                            onClick={() => { setViewMode('stacks'); setSelectedStackId(null); }}
                            className="p-2 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        </button>
                    )}
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                        {viewMode === 'stacks' ? 'Quiz Collections' : activeSubjectTitle}
                    </h2>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setActiveHeaderMenu(!activeHeaderMenu)}
                            className="p-3 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 rounded-xl transition-colors"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {activeHeaderMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1e1e2d] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <button
                                    onClick={() => { handleDownloadSample(); setActiveHeaderMenu(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"
                                >
                                    <Download className="w-4 h-4 text-gray-400" /> Sample JSON
                                </button>
                                <label className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                                    <Upload className="w-4 h-4 text-emerald-500" /> Import JSON
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => { handleImportQuiz(e); setActiveHeaderMenu(false); }}
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setEditingQuiz(getEmptyQuiz())}
                        className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-violet-500/25 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Create Quiz
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                resultCount={filteredQuizzes.length}
            />

            {/* Content */}
            {viewMode === 'stacks' ? (
                <StackGrid
                    subjects={[...subjects].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }))}
                    quizzesBySubject={quizzesBySubject}
                    onSelectStack={(id) => { setSelectedStackId(id); setViewMode('list'); }}
                    onImport={handleStackImportClick}
                    onEdit={setSubjectToEdit}
                    onDelete={setSubjectToDelete}
                />
            ) : (
                <QuizGrid
                    quizzes={filteredQuizzes}
                    onExport={handleDownloadQuiz}
                    onEdit={setEditingQuiz}
                    onDelete={(id) => setDeleteQuizConfirmation({ isOpen: true, id })}
                    onCreateFirstQuiz={() => setEditingQuiz(getEmptyQuiz())}
                />
            )}

            {/* Modals */}
            <StackEditModal
                isOpen={!!subjectToEdit}
                subject={subjectToEdit}
                onClose={() => setSubjectToEdit(null)}
                onSave={handleSubjectUpdate}
            />

            <StackDeleteModal
                isOpen={!!subjectToDelete}
                subject={subjectToDelete}
                onClose={() => setSubjectToDelete(null)}
                onDelete={handleSubjectDelete}
            />

            <QuizEditorModal
                isOpen={!!editingQuiz}
                quiz={editingQuiz}
                subjects={subjects}
                onClose={() => setEditingQuiz(null)}
                onSave={handleSaveQuiz}
                onNotification={onNotification}
            />

            <DeleteQuizModal
                isOpen={!!deleteQuizConfirmation}
                onClose={() => setDeleteQuizConfirmation(null)}
                onDelete={confirmDeleteQuiz}
            />
        </div>
    );
};

export default QuizManager;
