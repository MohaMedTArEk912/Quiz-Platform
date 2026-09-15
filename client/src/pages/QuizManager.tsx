import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Download, Upload, Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { Quiz, Subject, UserData, Question } from '../types';
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
import ShareQuizModal from '../components/quizzes/ShareQuizModal';
import ReplaceQuizModal from '../components/quizzes/ReplaceQuizModal';
import LiveHostMode from '../components/multiplayer/LiveHostMode';

interface QuizManagerProps {
    quizzes: Quiz[];
    currentUser: UserData;
    onRefresh: () => void | Promise<void>;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
    selectedSubjectId?: string;
}

const QuizManager: React.FC<QuizManagerProps> = ({ quizzes, currentUser, onRefresh, onNotification, selectedSubjectId }) => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [localQuizzes, setLocalQuizzes] = useState<Quiz[]>(quizzes);

    // View State
    const [viewMode, setViewMode] = useState<'stacks' | 'list'>('stacks');
    const [selectedStackId, setSelectedStackId] = useState<string | null>(null);
    const [activeHeaderMenu, setActiveHeaderMenu] = useState(false);
    const [quizTypeFilter, setQuizTypeFilter] = useState<'all' | 'session' | 'homework' | 'exam' | 'pool'>('all');

    const getQuizSet = (quiz: Quiz) => {
        const text = `${quiz.id || ''} ${quiz.title || ''} ${quiz.description || ''}`.toLowerCase();

        if (quiz.quizType === 'pool' || quiz.isQuestionPool || /\b(pool|question bank|bank)\b/.test(text)) {
            return 'pool';
        }

        if (quiz.quizType === 'exam' || /\bexam\b|final/.test(text)) {
            return 'exam';
        }

        if (/home\s*work|homework/.test(text)) {
            return 'homework';
        }

        if (/end\s*of\s*class|endoclass|after\s*session|\bafs\b/.test(text)) {
            return 'session';
        }

        return 'session';
    };

    // Handle initial subject selection
    useEffect(() => {
        if (selectedSubjectId) {
            setSelectedStackId(selectedSubjectId);
            setViewMode('list');
        }
    }, [selectedSubjectId]);

    useEffect(() => {
        if (selectedSubjectId) return;

        if (
            selectedStackId &&
            selectedStackId !== 'uncategorized' &&
            !subjects.some(subject => subject._id === selectedStackId)
        ) {
            setSelectedStackId(null);
            setViewMode('stacks');
        }
    }, [selectedSubjectId, selectedStackId, subjects]);

    // Modal States
    const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [deleteQuizConfirmation, setDeleteQuizConfirmation] = useState<{ isOpen: boolean; id: string } | null>(null);
    const [sharingQuiz, setSharingQuiz] = useState<Quiz | null>(null);
    const [liveHostQuiz, setLiveHostQuiz] = useState<Quiz | null>(null);
    const [quizToReplace, setQuizToReplace] = useState<Quiz | null>(null);
    const [replacementFile, setReplacementFile] = useState<File | null>(null);
    const [parsedReplacement, setParsedReplacement] = useState<{
        questions: Partial<Question>[];
        title?: string;
        description?: string;
        timeLimit?: number;
        passingScore?: number;
    } | null>(null);
    const [isReplacing, setIsReplacing] = useState(false);
    const replaceFileInputRef = useRef<HTMLInputElement>(null);

    // Import State
    const [importTargetStackId, setImportTargetStackId] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    // Hooks
    const quizzesBySubject = useQuizzesBySubject(localQuizzes);
    const { searchTerm, setSearchTerm, filteredQuizzes: baseFilteredQuizzes } = useQuizFilters({
        quizzes: localQuizzes,
        selectedStackId,
        viewMode
    });

    // Apply quiz type filter
    const filteredQuizzes = baseFilteredQuizzes.filter(quiz => {
        if (quizTypeFilter === 'all') return true;
        return getQuizSet(quiz) === quizTypeFilter;
    });

    // Debug logging
    console.log('[QuizManager] Received quizzes:', quizzes.length, quizzes);
    console.log('[QuizManager] Local quizzes:', localQuizzes.length, localQuizzes);
    console.log('[QuizManager] First quiz sample:', localQuizzes[0]);
    console.log('[QuizManager] Filtered quizzes:', filteredQuizzes.length, filteredQuizzes);
    console.log('[QuizManager] Quizzes by subject:', quizzesBySubject);

    // Effects
    useEffect(() => {
        setLocalQuizzes(quizzes);
    }, [quizzes]);

    const loadSubjects = useCallback(async () => {
        try {
            // api.getAllSubjects already extracts and returns the data array directly
            const subjects = await api.getAllSubjects(currentUser.userId);
            if (Array.isArray(subjects)) {
                setSubjects(subjects);
            } else {
                console.warn('[QuizManager] Unexpected subjects response format:', subjects);
                setSubjects([]);
            }
        } catch (error) {
            console.error('[QuizManager] Failed to load subjects:', error);
            // Don't leave subjects as undefined - set to empty array
            setSubjects([]);
        }
    }, [currentUser.userId]);

    useEffect(() => {
        loadSubjects();
    }, [loadSubjects]);

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
            console.error('Delete subject error:', error);
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

            const finalQuiz: Quiz = {
                ...quizToSave,
                questions: validatedQuestions,
                quizType: quizToSave.quizType || (quizToSave.isQuestionPool ? 'pool' : 'quiz'),
                isQuestionPool: quizToSave.isQuestionPool || quizToSave.quizType === 'pool',
                questionsPerAttempt: quizToSave.questionsPerAttempt || 10,
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
            await Promise.resolve(onRefresh());
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
            await Promise.resolve(onRefresh());
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

    const handleReplaceClick = (quiz: Quiz) => {
        setQuizToReplace(quiz);
        setReplacementFile(null);
        setParsedReplacement(null);
        if (replaceFileInputRef.current) {
            replaceFileInputRef.current.value = '';
            replaceFileInputRef.current.click();
        }
    };

    const handleReplacementFileSelected = async (file: File) => {
        try {
            const text = await file.text();
            let json: unknown;
            try {
                json = JSON.parse(text);
            } catch {
                onNotification('error', `Failed to parse ${file.name}: Invalid JSON.`);
                return;
            }

            let questions: Partial<Question>[] = [];
            let metadata: { title?: string; description?: string; timeLimit?: number; passingScore?: number } = {};

            if (Array.isArray(json)) {
                const list = json as Record<string, unknown>[];
                if (list.length > 0 && list[0]?.question && Array.isArray(list[0]?.options)) {
                    questions = list as Partial<Question>[];
                } else if (list.length > 0 && list[0]?.questions && Array.isArray(list[0]?.questions)) {
                    questions = list[0].questions as Partial<Question>[];
                    metadata = {
                        title: typeof list[0].title === 'string' ? list[0].title : undefined,
                        description: typeof list[0].description === 'string' ? list[0].description : undefined,
                        timeLimit: typeof list[0].timeLimit === 'number' ? list[0].timeLimit : undefined,
                        passingScore: typeof list[0].passingScore === 'number' ? list[0].passingScore : undefined,
                    };
                }
            } else if (json && typeof json === 'object') {
                const obj = json as Record<string, unknown>;
                if (Array.isArray(obj.questions)) {
                    questions = obj.questions as Partial<Question>[];
                    metadata = {
                        title: typeof obj.title === 'string' ? obj.title : undefined,
                        description: typeof obj.description === 'string' ? obj.description : undefined,
                        timeLimit: typeof obj.timeLimit === 'number' ? obj.timeLimit : undefined,
                        passingScore: typeof obj.passingScore === 'number' ? obj.passingScore : undefined,
                    };
                } else if (obj.question && Array.isArray(obj.options)) {
                    questions = [obj as Partial<Question>];
                }
            }

            if (!questions || questions.length === 0) {
                onNotification('error', `No questions found in "${file.name}". Please ensure the JSON contains questions.`);
                return;
            }

            setReplacementFile(file);
            setParsedReplacement({
                questions,
                ...metadata
            });
        } catch (err) {
            console.error('Error reading replacement file:', err);
            onNotification('error', 'Error reading replacement file.');
        }
    };

    const handleConfirmReplace = async (applyMetadata: boolean) => {
        if (!quizToReplace || !parsedReplacement || !parsedReplacement.questions.length) return;

        try {
            setIsReplacing(true);
            const targetId = quizToReplace.id || quizToReplace._id;
            if (!targetId) throw new Error('Quiz has no valid ID');

            const validatedQuestions: Question[] = parsedReplacement.questions.map((q: Partial<Question>, idx: number) => ({
                ...q,
                id: q.id !== undefined && !isNaN(Number(q.id)) ? Number(q.id) : idx + 1,
                part: q.part || 'A',
                question: q.question || '',
                options: Array.isArray(q.options) ? q.options : [],
                correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
                explanation: q.explanation || '',
                points: q.points || 10
            }));

            const updatedQuiz: Quiz = {
                ...quizToReplace,
                questions: validatedQuestions,
                ...(applyMetadata && parsedReplacement.title ? { title: parsedReplacement.title } : {}),
                ...(applyMetadata && parsedReplacement.description !== undefined ? { description: parsedReplacement.description } : {}),
                ...(applyMetadata && parsedReplacement.timeLimit ? { timeLimit: parsedReplacement.timeLimit } : {}),
                ...(applyMetadata && parsedReplacement.passingScore ? { passingScore: parsedReplacement.passingScore } : {})
            };

            await api.updateQuiz(targetId, updatedQuiz, currentUser.userId);

            setLocalQuizzes(prev => prev.map(q => (q.id === targetId || q._id === targetId) ? updatedQuiz : q));
            onNotification('success', `Quiz "${updatedQuiz.title}" successfully replaced (${validatedQuestions.length} questions updated)!`);
            setQuizToReplace(null);
            setReplacementFile(null);
            setParsedReplacement(null);
            await Promise.resolve(onRefresh());
        } catch (err) {
            console.error('Failed to replace quiz:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to replace quiz.';
            onNotification('error', errorMessage);
        } finally {
            setIsReplacing(false);
        }
    };

    // --- Import / Export Helpers ---

    const handleDownloadSample = () => {
        const link = document.createElement('a');
        link.href = '/samples/quiz-import-sample.json';
        link.download = 'quiz-import-sample.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportQuiz = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const effectiveTargetStackId =
            importTargetStackId ||
            (viewMode === 'list' && selectedStackId !== 'uncategorized' ? selectedStackId : null);

        const readFileContent = (file: File): Promise<unknown> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const json = JSON.parse(e.target?.result as string);
                        resolve(json);
                    } catch {
                        reject(new Error(`Invalid JSON in file ${file.name}`));
                    }
                };
                reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
                reader.readAsText(file);
            });
        };

        try {
            setIsImporting(true);
            const fileList = Array.from(files);
            const allQuizzes: Partial<Quiz>[] = [];
            let parseErrors = 0;

            const results = await Promise.allSettled(fileList.map(readFileContent));

            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    const content = result.value;
                    if (Array.isArray(content)) {
                        allQuizzes.push(...(content as Partial<Quiz>[]));
                    } else if (content && typeof content === 'object' && content !== null) {
                        allQuizzes.push(content as Partial<Quiz>);
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

            if (effectiveTargetStackId) {
                allQuizzes.forEach(q => {
                    q.subjectId = effectiveTargetStackId;
                });
            }

            const result = await api.importQuizzes(allQuizzes, currentUser.userId);

            // Optimistically upsert imported quizzes so the current view updates immediately.
            setLocalQuizzes(prev => {
                const map = new Map(prev.map(q => [q.id, q]));
                for (const imported of allQuizzes) {
                    if (!imported || !imported.id || !imported.title) continue;
                    map.set(imported.id, {
                        ...(map.get(imported.id) || {}),
                        ...imported
                    } as Quiz);
                }
                return Array.from(map.values());
            });

            if (parseErrors > 0) {
                onNotification('warning', `${result.message}. Note: ${parseErrors} files failed to parse.`);
            } else {
                onNotification('success', result.message || 'Quizzes imported successfully');
            }
            setImportTargetStackId(null);

            // Then refresh canonical data to keep local and server state fully aligned.
            await Promise.resolve(onRefresh());
            await loadSubjects();
        } catch (error) {
            console.error('Import error:', error);
            onNotification('error', 'Failed to import quizzes.');
        } finally {
            setIsImporting(false);
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap gap-3 sm:gap-4 justify-between mb-4 items-center">
                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                    {viewMode === 'list' && (
                        <button
                            onClick={() => { setViewMode('stacks'); setSelectedStackId(null); }}
                            className="p-2 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors cursor-pointer shrink-0"
                            title="Back to Collections"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        </button>
                    )}
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate">
                        {viewMode === 'stacks' ? 'Quiz Collections' : activeSubjectTitle}
                    </h2>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setActiveHeaderMenu(!activeHeaderMenu)}
                            className="p-2.5 sm:p-3 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 rounded-xl transition-colors cursor-pointer"
                            title="More Options"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {activeHeaderMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1e1e2d] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <button
                                    onClick={() => { handleDownloadSample(); setActiveHeaderMenu(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
                                >
                                    <Download className="w-4 h-4 text-gray-400" /> Sample JSON
                                </button>
                                <label className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                                    <Upload className="w-4 h-4 text-emerald-500" /> {isImporting ? 'Importing...' : 'Import JSON'}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        multiple
                                        className="hidden"
                                        disabled={isImporting}
                                        onChange={(e) => { handleImportQuiz(e); setActiveHeaderMenu(false); }}
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setEditingQuiz(getEmptyQuiz())}
                        className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg hover:shadow-violet-500/25 flex items-center gap-2 cursor-pointer shrink-0"
                    >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Create Quiz</span>
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                resultCount={filteredQuizzes.length}
            />

            {/* Quiz Type Filter */}
            {viewMode === 'list' && (
                <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
                    <button
                        onClick={() => setQuizTypeFilter('all')}
                        className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
                            quizTypeFilter === 'all'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                        }`}
                    >
                        All Quizzes
                    </button>
                    <button
                        onClick={() => setQuizTypeFilter('session')}
                        className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
                            quizTypeFilter === 'session'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                        }`}
                    >
                        Session
                    </button>
                    <button
                        onClick={() => setQuizTypeFilter('homework')}
                        className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
                            quizTypeFilter === 'homework'
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                        }`}
                    >
                        Homework
                    </button>
                    <button
                        onClick={() => setQuizTypeFilter('exam')}
                        className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
                            quizTypeFilter === 'exam'
                                ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                        }`}
                    >
                        Exams
                    </button>
                    <button
                        onClick={() => setQuizTypeFilter('pool')}
                        className={`px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            quizTypeFilter === 'pool'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                        }`}
                    >
                        <span>📦</span> Question Banks
                    </button>
                </div>
            )}

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
                    onPlay={(quiz) => {
                        const quizId = quiz.id || quiz._id;
                        if (quizId) {
                            navigate(`/quiz/${encodeURIComponent(quizId)}`);
                        }
                    }}
                    onHost={setLiveHostQuiz}
                    onExport={handleDownloadQuiz}
                    onReplace={handleReplaceClick}
                    onEdit={setEditingQuiz}
                    onDelete={(id) => setDeleteQuizConfirmation({ isOpen: true, id })}
                    onShare={setSharingQuiz}
                    onCreateFirstQuiz={() => setEditingQuiz(getEmptyQuiz())}
                />
            )}

            {/* Hidden file input for Replace action */}
            <input
                ref={replaceFileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        handleReplacementFileSelected(file);
                    }
                }}
            />

            <ReplaceQuizModal
                isOpen={!!quizToReplace && !!replacementFile}
                onClose={() => {
                    setQuizToReplace(null);
                    setReplacementFile(null);
                    setParsedReplacement(null);
                }}
                quiz={quizToReplace}
                replacementFile={replacementFile}
                parsedData={parsedReplacement}
                onConfirm={handleConfirmReplace}
                onFileSelected={handleReplacementFileSelected}
                isLoading={isReplacing}
            />

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

            <ShareQuizModal
                quiz={sharingQuiz}
                isOpen={!!sharingQuiz}
                onClose={() => setSharingQuiz(null)}
            />

            {liveHostQuiz && (
                <LiveHostMode
                    quiz={liveHostQuiz}
                    onClose={() => setLiveHostQuiz(null)}
                />
            )}
        </div>
    );
};

export default QuizManager;
