import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Trophy,
    Users,
    Calendar,
    Clock,
    Sparkles,
    CheckCircle2,
    RefreshCw,
    Check,
    X,
    Search,
    Plus,
    Edit2,
    Trash2,
    BookOpen,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    Lock,
    Unlock,
    Download,
    Upload,
    Award,
    Zap,
    HelpCircle,
    Monitor,
    Presentation,
    FileSpreadsheet,
    UserCheck,
    UserX,
    Flame,
    Timer,
    Minus,
    AlertTriangle
} from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import MathRenderer from '../common/MathRenderer';
import FlexibleDateTimePicker from './FlexibleDateTimePicker';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { formatLocalizedTournamentDateTime, getUserTimezoneInfo } from '../../utils/timezoneUtils';
import type {
    Tournament,
    Quiz,
    UserData,
    BadgeDefinition,
    ShopItem,
    TournamentParticipant,
    TournamentCustomQuestion,
    TournamentLiveSession,
    TournamentLeaderboardEntry,
    TeacherReviewData
} from '../../types/index.ts';
import { api } from '../../lib/api.ts';

interface TournamentManagementProps {
    currentUser: UserData;
    quizzes: Quiz[];
    onRefresh: () => void | Promise<void>;
    onNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
}

type AdminTournamentView = 'overview' | 'editor' | 'control';
type ControlSubTab = 'live' | 'requests' | 'leaderboard' | 'review' | 'settings';

const TournamentManagement: React.FC<TournamentManagementProps> = ({
    currentUser,
    quizzes,
    onRefresh,
    onNotification
}) => {
    const { socket } = useSocket();
    const { isBento } = useTheme();

    // Data states
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [badges, setBadges] = useState<BadgeDefinition[]>([]);
    const [shopItems, setShopItems] = useState<ShopItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Navigation states
    const [currentView, setCurrentView] = useState<AdminTournamentView>('overview');
    const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
    const [controlTab, setControlTab] = useState<ControlSubTab>('live');

    // Overview filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'scheduled' | 'completed'>('all');
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string } | null>(null);

    // Editor Form state (In-tab creation & editing)
    const [formTournament, setFormTournament] = useState<Partial<Tournament>>({
        name: '',
        description: '',
        startsAt: new Date(Date.now() + 15 * 60000).toISOString(),
        endsAt: new Date(Date.now() + 2 * 3600000).toISOString(),
        durationMinutes: 45,
        status: 'scheduled',
        quizMode: 'assigned',
        quizIds: [],
        customQuiz: {
            title: '',
            description: '',
            timeLimit: 45,
            passingScore: 70,
            questions: []
        },
        requiresApproval: true,
        resultsRevealed: false,
        rewardCoins: 1000,
        rewardXp: 500
    });
    const [activeQuestionTab, setActiveQuestionTab] = useState<number>(0);

    // Live Room state
    const [liveSessions, setLiveSessions] = useState<TournamentLiveSession[]>([]);
    const [isRefreshingLive, setIsRefreshingLive] = useState(false);
    const [autoRefreshLive, setAutoRefreshLive] = useState(true);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

    // Requests state
    const [isProcessingRequests, setIsProcessingRequests] = useState(false);

    // Leaderboard state
    const [leaderboardData, setLeaderboardData] = useState<TournamentLeaderboardEntry[]>([]);
    const [isTogglingReveal, setIsTogglingReveal] = useState(false);

    // Teacher Review Session state
    const [reviewAttemptId, setReviewAttemptId] = useState<string>('');
    const [teacherReviewData, setTeacherReviewData] = useState<TeacherReviewData | null>(null);
    const [isLoadingReview, setIsLoadingReview] = useState(false);
    const [teacherQuestionIndex, setTeacherQuestionIndex] = useState(0);
    const [teacherViewMode, setTeacherViewMode] = useState<'slideshow' | 'sheet'>('slideshow');

    const tournamentUploadRef = useRef<HTMLInputElement>(null);
    const quizUploadRef = useRef<HTMLInputElement>(null);
    const onNotificationRef = useRef(onNotification);
    useEffect(() => {
        onNotificationRef.current = onNotification;
    }, [onNotification]);

    // --- Load initial data ---
    const loadTournaments = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tournamentsData, badgesData, shopItemsData] = await Promise.all([
                api.getTournaments(currentUser.userId).catch(() => []),
                api.getBadgeNodes().catch(() => []),
                api.getShopItems().catch(() => [])
            ]);

            // Deduplicate items & badges by ID to prevent duplicate React keys
            const uniqueBadges = Array.from(new Map((badgesData || []).map((b: any) => [b.id, b])).values()) as BadgeDefinition[];
            const uniqueShopItems = Array.from(new Map((shopItemsData || []).map((item: any) => [item.itemId || item.id, item])).values()) as ShopItem[];

            setTournaments(tournamentsData || []);
            setBadges(uniqueBadges);
            setShopItems(uniqueShopItems);

            // If active tournament is open, refresh its data in place
            setActiveTournament(prev => {
                if (!prev) return null;
                return (tournamentsData || []).find((t: any) => t.tournamentId === prev.tournamentId) || prev;
            });
        } catch (err) {
            console.error('Failed to load tournaments:', err);
            onNotificationRef.current('error', 'Failed to load tournaments');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser.userId]);

    useEffect(() => {
        loadTournaments();
    }, [loadTournaments]);

    // --- Live Room Telemetry Loader ---
    const loadLiveRoom = useCallback(async (tournamentId: string) => {
        if (!tournamentId) return;
        setIsRefreshingLive(true);
        try {
            const data = await api.getTournamentLiveTakers(tournamentId, currentUser.userId);
            // Combine live active and recent submissions
            const combinedMap = new Map<string, TournamentLiveSession>();
            (data.liveTakers || []).forEach(s => combinedMap.set(s.userId, s));
            (data.recentSubmissions || []).forEach(s => {
                if (!combinedMap.has(s.userId)) combinedMap.set(s.userId, s);
            });
            setLiveSessions(Array.from(combinedMap.values()));
            setLastRefreshedAt(new Date());
        } catch (err) {
            console.error('Failed to load live takers:', err);
        } finally {
            setIsRefreshingLive(false);
        }
    }, [currentUser.userId]);

    // Auto-refresh timer for Live Room
    useEffect(() => {
        if (currentView === 'control' && controlTab === 'live' && activeTournament && autoRefreshLive) {
            loadLiveRoom(activeTournament.tournamentId);
            const interval = setInterval(() => {
                loadLiveRoom(activeTournament.tournamentId);
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [currentView, controlTab, activeTournament, autoRefreshLive, loadLiveRoom]);

    // Socket listeners for tournament events
    useEffect(() => {
        if (!socket || !activeTournament) return;
        const tournId = activeTournament.tournamentId;

        socket.emit('join_tournament', {
            tournamentId: tournId,
            isAdmin: true,
            user: { name: currentUser.name, id: currentUser.userId }
        });

        const handleLiveUpdate = (session: TournamentLiveSession) => {
            setLiveSessions(prev => {
                const existingIndex = prev.findIndex(s => s.userId === session.userId);
                if (existingIndex >= 0) {
                    const copy = [...prev];
                    copy[existingIndex] = { ...copy[existingIndex], ...session, lastActive: Date.now() };
                    return copy;
                }
                return [session, ...prev];
            });
            setLastRefreshedAt(new Date());
        };

        const handleJoinRequested = (data: { tournamentId: string; participant: TournamentParticipant }) => {
            if (data.tournamentId === tournId) {
                onNotification('warning', `New join request from ${data.participant.userName}!`);
                loadTournaments();
            }
        };

        const handleStudentSubmitted = (data: { tournamentId: string; userName: string; score: number }) => {
            if (data.tournamentId === tournId) {
                onNotification('success', `${data.userName} finished with score ${data.score}!`);
                loadTournaments();
                loadLiveRoom(tournId);
            }
        };

        socket.on('tournament_live_update', handleLiveUpdate);
        socket.on('tournament_join_requested', handleJoinRequested);
        socket.on('tournament_student_submitted', handleStudentSubmitted);

        return () => {
            socket.emit('leave_tournament', { tournamentId: tournId, isAdmin: true });
            socket.off('tournament_live_update', handleLiveUpdate);
            socket.off('tournament_join_requested', handleJoinRequested);
            socket.off('tournament_student_submitted', handleStudentSubmitted);
        };
    }, [socket, activeTournament, currentUser, onNotification, loadTournaments, loadLiveRoom]);

    // --- Load Leaderboard for Control Center ---
    const loadLeaderboard = useCallback(async (tournamentId: string) => {
        try {
            const data = await api.getTournamentLeaderboard(tournamentId, currentUser.userId);
            setLeaderboardData(data.leaderboard || []);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
        }
    }, [currentUser.userId]);

    useEffect(() => {
        if (currentView === 'control' && controlTab === 'leaderboard' && activeTournament) {
            loadLeaderboard(activeTournament.tournamentId);
        }
    }, [currentView, controlTab, activeTournament, loadLeaderboard]);

    // --- Load Teacher Review Data ---
    const loadTeacherReview = useCallback(async (tournamentId: string, attemptId: string) => {
        if (!attemptId) return;
        setIsLoadingReview(true);
        try {
            const data = await api.getTournamentAttemptReview(tournamentId, attemptId, currentUser.userId);
            setTeacherReviewData(data);
            setTeacherQuestionIndex(0);
        } catch (err) {
            console.error('Failed to load teacher review:', err);
            onNotification('error', 'Failed to load student attempt for teacher review');
        } finally {
            setIsLoadingReview(false);
        }
    }, [currentUser.userId, onNotification]);

    useEffect(() => {
        if (currentView === 'control' && controlTab === 'review' && activeTournament && reviewAttemptId) {
            loadTeacherReview(activeTournament.tournamentId, reviewAttemptId);
        }
    }, [currentView, controlTab, activeTournament, reviewAttemptId, loadTeacherReview]);

    // --- Flexible Time Helpers ---
    const handleSetTimePreset = (preset: 'now' | 'in15m' | 'in1h' | 'tomorrow' | 'tomorrowMorning' | 'weekend') => {
        const now = new Date();
        let start = new Date(now);
        if (preset === 'in15m') start = new Date(now.getTime() + 15 * 60000);
        else if (preset === 'in1h') start = new Date(now.getTime() + 60 * 60000);
        else if (preset === 'tomorrow') {
            start.setDate(start.getDate() + 1);
            start.setHours(18, 0, 0, 0);
        } else if (preset === 'tomorrowMorning') {
            start.setDate(start.getDate() + 1);
            start.setHours(10, 0, 0, 0);
        } else if (preset === 'weekend') {
            const dayOfWeek = start.getDay();
            const daysToSat = (6 - dayOfWeek + 7) % 7 || 7;
            start.setDate(start.getDate() + daysToSat);
            start.setHours(14, 0, 0, 0);
        }

        const duration = formTournament.durationMinutes || 45;
        // Default arena window: duration + 1 hour or at least 2 hours
        const windowLength = Math.max(2 * 3600000, duration > 0 ? (duration + 60) * 60000 : 2 * 3600000);
        const end = new Date(start.getTime() + windowLength);

        setFormTournament(prev => ({
            ...prev,
            startsAt: start.toISOString(),
            endsAt: end.toISOString()
        }));
    };

    const handleSetDurationPreset = (minutes: number) => {
        setFormTournament(prev => {
            const start = prev.startsAt ? new Date(prev.startsAt) : new Date();
            const currentEnd = prev.endsAt ? new Date(prev.endsAt) : new Date(start.getTime() + 2 * 3600000);

            // If the current window is smaller than the chosen duration, expand the window so students can finish
            const minRequiredEnd = minutes > 0 ? new Date(start.getTime() + minutes * 60000) : new Date(start.getTime() + 2 * 3600000);
            const finalEnd = currentEnd.getTime() < minRequiredEnd.getTime() ? minRequiredEnd : currentEnd;

            return {
                ...prev,
                durationMinutes: minutes,
                endsAt: finalEnd.toISOString()
            };
        });
    };

    const handleAdjustDuration = (delta: number) => {
        setFormTournament(prev => {
            const current = prev.durationMinutes ?? 45;
            const next = Math.max(0, current + delta);
            return {
                ...prev,
                durationMinutes: next
            };
        });
    };

    // --- In-Tab Tournament Save ---
    const handleSaveTournament = async () => {
        if (!formTournament.name?.trim()) {
            onNotification('warning', 'Please enter a tournament title');
            return;
        }

        try {
            // Prepare clean payload without internal Mongo immutable fields
            const payload: any = { ...formTournament };
            delete payload._id;

            // Normalize questions if in custom mode
            if (payload.quizMode === 'custom' && payload.customQuiz) {
                payload.customQuiz.questions = (payload.customQuiz.questions || []).map((q: any, idx: number) => ({
                    ...q,
                    id: q.id !== undefined ? String(q.id) : `tq_${idx + 1}`,
                    text: q.text || q.question || `Question ${idx + 1}`,
                    type: q.type || 'multiple-choice',
                    points: typeof q.points === 'number' ? q.points : 10,
                    options: Array.isArray(q.options) ? q.options : [],
                    correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0
                }));
            }

            if (payload.tournamentId) {
                // Update
                const updated = await api.updateTournament(payload.tournamentId, payload, currentUser.userId);
                setTournaments(prev => prev.map(t => t.tournamentId === updated.tournamentId ? updated : t));
                if (activeTournament?.tournamentId === updated.tournamentId) setActiveTournament(updated);
                onNotification('success', 'Tournament updated successfully!');
            } else {
                // Create
                const created = await api.createTournament(payload, currentUser.userId);
                setTournaments(prev => [...prev, created]);
                onNotification('success', 'Tournament created successfully!');
            }
            await onRefresh();
            setCurrentView('overview');
        } catch (err) {
            console.error('Failed to save tournament:', err);
            onNotification('error', 'Failed to save tournament');
        }
    };

    // --- Delete Confirmation ---
    const confirmDelete = async () => {
        if (!deleteConfirmation) return;
        try {
            await api.deleteTournament(deleteConfirmation.id, currentUser.userId);
            setTournaments(prev => prev.filter(t => t.tournamentId !== deleteConfirmation.id));
            if (activeTournament?.tournamentId === deleteConfirmation.id) {
                setActiveTournament(null);
                setCurrentView('overview');
            }
            onNotification('success', 'Tournament deleted');
            await onRefresh();
        } catch (err) {
            console.error('Failed to delete tournament:', err);
            onNotification('error', 'Failed to delete tournament');
        } finally {
            setDeleteConfirmation(null);
        }
    };

    // --- Join Requests Actions ---
    const handleManageRequests = async (action: 'approve' | 'reject' | 'remove', userIds: string[]) => {
        if (!activeTournament || userIds.length === 0) return;
        setIsProcessingRequests(true);
        try {
            await api.manageTournamentRequest(activeTournament.tournamentId, { userIds, action }, currentUser.userId);
            onNotification('success', `${action === 'approve' ? 'Approved' : 'Updated'} ${userIds.length} participant(s)`);
            await loadTournaments();
        } catch (err) {
            console.error('Failed to process requests:', err);
            onNotification('error', 'Failed to process request');
        } finally {
            setIsProcessingRequests(false);
        }
    };

    // --- Reveal / Lock Results Action ---
    const handleToggleResultsReveal = async () => {
        if (!activeTournament) return;
        setIsTogglingReveal(true);
        const nextRevealState = !activeTournament.resultsRevealed;
        try {
            await api.revealTournamentResults(activeTournament.tournamentId, nextRevealState, currentUser.userId);
            setActiveTournament(prev => prev ? ({ ...prev, resultsRevealed: nextRevealState }) : null);
            setTournaments(prev => prev.map(t => t.tournamentId === activeTournament.tournamentId ? ({ ...t, resultsRevealed: nextRevealState }) : t));
            onNotification('success', nextRevealState ? 'Results revealed to all students!' : 'Results locked. Students are now on holding screen.');
        } catch (err) {
            console.error('Failed to toggle results reveal:', err);
            onNotification('error', 'Failed to toggle result reveal');
        } finally {
            setIsTogglingReveal(false);
        }
    };

    // --- Custom Quiz Question Builder Helpers ---
    const handleAddCustomQuestion = () => {
        const newQuestion: TournamentCustomQuestion = {
            id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: 'What is the correct answer to this challenge?',
            type: 'multiple-choice',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 0,
            points: 10,
            explanation: 'Explain the core reasoning and why other choices are incorrect.'
        };

        setFormTournament(prev => {
            const currentCustom = prev.customQuiz || { title: prev.name || 'Tournament Quiz', questions: [] };
            const questions = [...(currentCustom.questions || []), newQuestion];
            return {
                ...prev,
                customQuiz: {
                    ...currentCustom,
                    questions
                }
            };
        });
        setActiveQuestionTab((formTournament.customQuiz?.questions?.length || 0));
    };

    const handleUpdateQuestion = (index: number, updates: Partial<TournamentCustomQuestion>) => {
        setFormTournament(prev => {
            const currentCustom = prev.customQuiz || { title: prev.name || 'Tournament Quiz', questions: [] };
            const questions = [...(currentCustom.questions || [])];
            questions[index] = { ...questions[index], ...updates };
            return {
                ...prev,
                customQuiz: {
                    ...currentCustom,
                    questions
                }
            };
        });
    };

    const handleDeleteQuestion = (index: number) => {
        setFormTournament(prev => {
            const currentCustom = prev.customQuiz || { title: prev.name || 'Tournament Quiz', questions: [] };
            const questions = (currentCustom.questions || []).filter((_, i) => i !== index);
            return {
                ...prev,
                customQuiz: {
                    ...currentCustom,
                    questions
                }
            };
        });
        setActiveQuestionTab(Math.max(0, index - 1));
    };

    // JSON sample and upload handlers
    const handleDownloadSampleJson = () => {
        const link = document.createElement('a');
        link.href = '/samples/tournament-sample.json';
        link.download = 'tournament-sample.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadQuizSampleJson = () => {
        const link = document.createElement('a');
        link.href = '/samples/tournament-quiz-sample.json';
        link.download = 'tournament-quiz-sample.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUploadTournamentJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let json = JSON.parse(e.target?.result as string);
                if (Array.isArray(json)) json = json[0] || {};

                if (!json || typeof json !== 'object') {
                    onNotification('error', 'Invalid tournament JSON format');
                    return;
                }

                // Normalize questions in customQuiz if present
                let normalizedCustomQuiz = json.customQuiz;
                if (normalizedCustomQuiz && Array.isArray(normalizedCustomQuiz.questions)) {
                    normalizedCustomQuiz = {
                        ...normalizedCustomQuiz,
                        title: normalizedCustomQuiz.title || json.name || 'Tournament Dedicated Exam',
                        description: normalizedCustomQuiz.description || '',
                        timeLimit: normalizedCustomQuiz.timeLimit || json.durationMinutes || 45,
                        passingScore: normalizedCustomQuiz.passingScore || 70,
                        questions: normalizedCustomQuiz.questions.map((q: any, idx: number) => ({
                            id: q.id !== undefined ? String(q.id) : `tq_${idx + 1}`,
                            text: q.text || q.question || q.prompt || q.title || `Question ${idx + 1}`,
                            type: q.type || 'multiple-choice',
                            options: Array.isArray(q.options)
                                ? q.options.map((opt: any) => typeof opt === 'string' ? opt : (opt.text || opt.title || String(opt)))
                                : [],
                            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : (q.answer !== undefined ? q.answer : 0),
                            points: typeof q.points === 'number' ? q.points : 10,
                            explanation: q.explanation || '',
                            codeSnippet: q.codeSnippet || '',
                            orderingItems: Array.isArray(q.orderingItems) ? q.orderingItems : undefined
                        }))
                    };
                }

                const startsAt = json.startsAt ? new Date(json.startsAt).toISOString() : new Date(Date.now() + 15 * 60000).toISOString();
                const duration = typeof json.durationMinutes === 'number' ? json.durationMinutes : (typeof json.timeLimit === 'number' ? json.timeLimit : 45);
                const endsAt = json.endsAt ? new Date(json.endsAt).toISOString() : new Date(new Date(startsAt).getTime() + 2 * 3600000).toISOString();

                // Build clean tournament state without internal Mongo fields
                const sanitizedTournament: Partial<Tournament> = {
                    name: json.name || json.title || 'Imported Tournament Arena',
                    description: json.description || '',
                    startsAt,
                    endsAt,
                    durationMinutes: duration,
                    status: (json.status as any) || 'scheduled',
                    quizMode: json.quizMode || (normalizedCustomQuiz?.questions?.length ? 'custom' : 'assigned'),
                    quizIds: Array.isArray(json.quizIds) ? json.quizIds : [],
                    customQuiz: normalizedCustomQuiz || {
                        title: json.name || 'Tournament Quiz',
                        description: '',
                        timeLimit: duration,
                        passingScore: 70,
                        questions: []
                    },
                    requiresApproval: json.requiresApproval !== undefined ? Boolean(json.requiresApproval) : true,
                    resultsRevealed: Boolean(json.resultsRevealed),
                    rewardBadgeId: json.rewardBadgeId || undefined,
                    rewardItemId: json.rewardItemId || undefined,
                    rewardCoins: typeof json.rewardCoins === 'number' ? json.rewardCoins : 1000,
                    rewardXp: typeof json.rewardXp === 'number' ? json.rewardXp : 500
                };

                // Strip internal MongoDB _id to prevent duplicate or immutable errors
                delete (sanitizedTournament as any)._id;

                setFormTournament(sanitizedTournament);
                setCurrentView('editor');
                onNotificationRef.current('success', `Tournament "${sanitizedTournament.name}" imported and ready in editor!`);
            } catch (err) {
                console.error('Failed to parse tournament JSON:', err);
                onNotificationRef.current('error', 'Failed to parse tournament JSON file');
            }
            if (event.target) event.target.value = '';
        };
        reader.readAsText(file);
    };

    const handleUploadQuizJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let json = JSON.parse(e.target?.result as string);
                let rawQuestions: any[] = [];
                let quizTitle = '';
                let quizDesc = '';
                let quizTime = 45;
                let quizScore = 70;

                if (Array.isArray(json)) {
                    // Check if array of quiz objects (e.g. [{ title, questions: [...] }])
                    if (json.length > 0 && json[0] && Array.isArray(json[0].questions)) {
                        const quizItem = json[0];
                        rawQuestions = quizItem.questions;
                        quizTitle = quizItem.title || quizItem.name || '';
                        quizDesc = quizItem.description || '';
                        quizTime = quizItem.timeLimit || quizItem.durationMinutes || 45;
                        quizScore = quizItem.passingScore || 70;
                    } else {
                        // Direct array of questions
                        rawQuestions = json;
                    }
                } else if (typeof json === 'object' && json !== null) {
                    if (Array.isArray(json.questions)) {
                        rawQuestions = json.questions;
                        quizTitle = json.title || json.name || '';
                        quizDesc = json.description || '';
                        quizTime = json.timeLimit || json.durationMinutes || 45;
                        quizScore = json.passingScore || 70;
                    } else if (json.quiz && Array.isArray(json.quiz.questions)) {
                        rawQuestions = json.quiz.questions;
                        quizTitle = json.quiz.title || json.quiz.name || '';
                        quizDesc = json.quiz.description || '';
                        quizTime = json.quiz.timeLimit || 45;
                        quizScore = json.quiz.passingScore || 70;
                    }
                }

                if (!rawQuestions.length) {
                    onNotification('error', 'No valid questions found in quiz JSON file');
                    return;
                }

                const normalizedQuestions: TournamentCustomQuestion[] = rawQuestions.map((q: any, idx: number) => {
                    const text = q.text || q.question || q.prompt || q.title || `Question ${idx + 1}`;
                    let qType = q.type || 'multiple-choice';
                    if (!['multiple-choice', 'text', 'code-output', 'ordering', 'matching', 'compiler', 'block'].includes(qType)) {
                        qType = 'multiple-choice';
                    }

                    let options: string[] = [];
                    if (Array.isArray(q.options)) {
                        options = q.options.map((opt: any) => typeof opt === 'string' ? opt : (opt.text || opt.title || String(opt)));
                    }

                    return {
                        id: q.id !== undefined ? String(q.id) : `tq_${idx + 1}`,
                        text,
                        type: qType,
                        options,
                        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : (q.answer !== undefined ? q.answer : 0),
                        points: typeof q.points === 'number' ? q.points : (typeof q.point === 'number' ? q.point : 10),
                        explanation: q.explanation || '',
                        codeSnippet: q.codeSnippet || '',
                        orderingItems: Array.isArray(q.orderingItems) ? q.orderingItems : undefined
                    };
                });

                setFormTournament(prev => ({
                    ...prev,
                    quizMode: 'custom',
                    durationMinutes: quizTime || prev.durationMinutes || 45,
                    customQuiz: {
                        title: quizTitle || prev.name || 'Tournament Dedicated Exam',
                        description: quizDesc || prev.description || '',
                        timeLimit: quizTime || prev.durationMinutes || 45,
                        passingScore: quizScore || 70,
                        questions: normalizedQuestions
                    }
                }));

                setCurrentView('editor');
                onNotification('success', `Imported ${normalizedQuestions.length} questions into Tournament Quiz successfully!`);
            } catch (err) {
                console.error('Failed to parse quiz JSON:', err);
                onNotification('error', 'Failed to parse quiz JSON');
            }
            if (event.target) event.target.value = '';
        };
        reader.readAsText(file);
    };

    // Filtered Tournaments
    const filteredTournaments = tournaments.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Counts
    const liveCount = tournaments.filter(t => t.status === 'live').length;
    const scheduledCount = tournaments.filter(t => t.status === 'scheduled').length;
    const completedCount = tournaments.filter(t => t.status === 'completed').length;
    const totalRegistrations = tournaments.reduce((acc, t) => acc + (t.participants?.length || 0), 0);
    const totalPendingRequests = tournaments.reduce((acc, t) => acc + (t.pendingCount || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Navigation & Breadcrumb Header */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-3xl gap-4 transition-all ${
                isBento
                    ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000]'
                    : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${
                        isBento
                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20'
                    }`}>
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => { setCurrentView('overview'); setActiveTournament(null); }}
                                className={`text-xl font-black uppercase tracking-tight transition-colors ${
                                    isBento ? 'text-black hover:text-amber-600' : 'text-gray-900 dark:text-white hover:text-amber-500'
                                }`}
                            >
                                Tournament Command Hub
                            </button>
                            {activeTournament && (
                                <>
                                    <ChevronRight className={`w-4 h-4 ${isBento ? 'text-black' : 'text-gray-400'}`} />
                                    <span className={`text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider ${
                                        isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    }`}>
                                        {activeTournament.name}
                                    </span>
                                </>
                            )}
                            {currentView === 'editor' && !activeTournament && (
                                <>
                                    <ChevronRight className={`w-4 h-4 ${isBento ? 'text-black' : 'text-gray-400'}`} />
                                    <span className={`text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider ${
                                        isBento
                                            ? 'bg-[#67e8f9] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                            : 'bg-indigo-500/10 text-indigo-500'
                                    }`}>
                                        New Tournament Builder
                                    </span>
                                </>
                            )}
                        </div>
                        <p className={`text-[11px] font-bold uppercase tracking-widest mt-0.5 ${
                            isBento ? 'text-gray-600 font-black' : 'text-gray-400'
                        }`}>
                            {currentView === 'overview' && 'Live Arena Management, Request Approvals & Proctoring'}
                            {currentView === 'editor' && 'In-Tab Tournament & Exam Architecture'}
                            {currentView === 'control' && 'Live Telemetry, Leaderboard & Teacher Session'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                            <span>🌍 System Timezone: <strong>{getUserTimezoneInfo().friendlyLabel}</strong> (automatically converted to each student's country)</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {currentView !== 'overview' && (
                        <button
                            onClick={() => { setCurrentView('overview'); setActiveTournament(null); }}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                isBento
                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 hover:shadow-[3px_3px_0px_#000]'
                                    : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            <ArrowLeft className="w-4 h-4" /> Tournaments List
                        </button>
                    )}

                    {currentView === 'overview' && (
                        <>
                            <button
                                onClick={async () => {
                                    await loadTournaments();
                                    onNotificationRef.current('success', 'Tournaments reloaded!');
                                }}
                                disabled={isLoading}
                                className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 hover:shadow-[3px_3px_0px_#000]'
                                        : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}
                                title="Refresh tournament list and telemetry"
                            >
                                <RefreshCw className={`w-4 h-4 text-indigo-500 ${isLoading ? 'animate-spin' : ''}`} />
                                <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
                            </button>

                            <button
                                onClick={() => tournamentUploadRef.current?.click()}
                                className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 hover:shadow-[3px_3px_0px_#000]'
                                        : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}
                                title="Upload Tournament JSON directly"
                            >
                                <Upload className="w-4 h-4 text-indigo-500" />
                                <span>Upload JSON</span>
                            </button>
                            <input
                                type="file"
                                ref={tournamentUploadRef}
                                onChange={handleUploadTournamentJson}
                                accept=".json"
                                className="hidden"
                            />

                            <button
                                onClick={() => {
                                    setFormTournament({
                                        name: '',
                                        description: '',
                                        startsAt: new Date(Date.now() + 15 * 60000).toISOString(),
                                        endsAt: new Date(Date.now() + 2 * 3600000).toISOString(),
                                        durationMinutes: 45,
                                        status: 'scheduled',
                                        quizMode: 'assigned',
                                        quizIds: [],
                                        customQuiz: {
                                            title: '',
                                            description: '',
                                            timeLimit: 45,
                                            passingScore: 70,
                                            questions: []
                                        },
                                        requiresApproval: true,
                                        resultsRevealed: false,
                                        rewardCoins: 1000,
                                        rewardXp: 500
                                    });
                                    setCurrentView('editor');
                                }}
                                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
                                    isBento
                                        ? 'bg-[#fb923c] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:bg-[#f97316] active:translate-x-0.5 active:translate-y-0.5'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25'
                                }`}
                            >
                                <Plus className="w-4 h-4" /> Create Tournament
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ============================================================== */}
            {/* VIEW 1: OVERVIEW / DASHBOARD LIST                              */}
            {/* ============================================================== */}
            {currentView === 'overview' && (
                <div className="space-y-6">
                    {/* Metrics Banner */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className={`p-4 sm:p-5 rounded-2xl transition-all ${
                            isBento
                                ? 'bg-[#bef264] text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                : 'bg-white/60 dark:bg-[#1a1b26]/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 shadow-sm'
                        }`}>
                            <div className={`flex items-center justify-between mb-2 ${isBento ? 'text-black' : 'text-emerald-500'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isBento ? 'text-black' : 'text-gray-400'}`}>Live Arenas</span>
                                <Flame className="w-4 h-4 animate-pulse" />
                            </div>
                            <div className={`text-2xl sm:text-3xl font-black font-tabular ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>{liveCount}</div>
                        </div>

                        <div className={`p-4 sm:p-5 rounded-2xl transition-all ${
                            isBento
                                ? 'bg-[#67e8f9] text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                : 'bg-white/60 dark:bg-[#1a1b26]/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 shadow-sm'
                        }`}>
                            <div className={`flex items-center justify-between mb-2 ${isBento ? 'text-black' : 'text-blue-500'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isBento ? 'text-black' : 'text-gray-400'}`}>Scheduled</span>
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div className={`text-2xl sm:text-3xl font-black font-tabular ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>{scheduledCount}</div>
                        </div>

                        <div className={`p-4 sm:p-5 rounded-2xl transition-all ${
                            isBento
                                ? 'bg-[#f472b6] text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                : 'bg-white/60 dark:bg-[#1a1b26]/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 shadow-sm'
                        }`}>
                            <div className={`flex items-center justify-between mb-2 ${isBento ? 'text-black' : 'text-purple-500'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isBento ? 'text-black' : 'text-gray-400'}`}>Registrations</span>
                                <Users className="w-4 h-4" />
                            </div>
                            <div className={`text-2xl sm:text-3xl font-black font-tabular ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>{totalRegistrations}</div>
                        </div>

                        <div className={`p-4 sm:p-5 rounded-2xl transition-all ${
                            isBento
                                ? 'bg-[#fde047] text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                : 'bg-white/60 dark:bg-[#1a1b26]/60 backdrop-blur-xl border border-amber-500/20 shadow-sm bg-gradient-to-br from-amber-500/5 to-transparent'
                        }`}>
                            <div className={`flex items-center justify-between mb-2 ${isBento ? 'text-black' : 'text-amber-500'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isBento ? 'text-black' : 'text-gray-400'}`}>Pending Requests</span>
                                <UserCheck className="w-4 h-4" />
                            </div>
                            <div className={`text-2xl sm:text-3xl font-black font-tabular ${isBento ? 'text-black' : 'text-amber-500'}`}>{totalPendingRequests}</div>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className={`flex flex-col sm:flex-row gap-3 items-center justify-between p-3 sm:p-4 rounded-2xl transition-all ${
                        isBento
                            ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-white/60 dark:bg-[#1a1b26]/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5'
                    }`}>
                        <div className="relative w-full sm:w-80">
                            <Search className={`w-4 h-4 absolute left-3.5 top-3.5 ${isBento ? 'text-black' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                placeholder="Search tournaments..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-bold outline-none transition-all ${
                                    isBento
                                        ? 'bg-slate-100 text-black border-2 border-black placeholder:text-gray-500 focus:shadow-[2px_2px_0px_#000]'
                                        : 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/30'
                                }`}
                            />
                        </div>

                        <div className={`flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 rounded-xl ${
                            isBento ? 'bg-slate-200 border-2 border-black' : 'bg-gray-100 dark:bg-black/30'
                        }`}>
                            {(['all', 'live', 'scheduled', 'completed'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setStatusFilter(tab)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                        statusFilter === tab
                                            ? isBento
                                                ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                            : isBento
                                                ? 'text-black hover:bg-white/70 font-bold'
                                                : 'bg-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {tab === 'all' ? `All (${tournaments.length})` : tab === 'completed' ? `Completed (${completedCount})` : tab.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tournaments Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredTournaments.map(tournament => {
                            const isLive = tournament.status === 'live';
                            const isScheduled = tournament.status === 'scheduled';
                            const pendingCount = tournament.pendingCount || 0;
                            const isRevealed = Boolean(tournament.resultsRevealed);

                            return (
                                <div
                                    key={tournament.tournamentId}
                                    className={`rounded-[2rem] p-6 transition-all flex flex-col justify-between group relative overflow-hidden ${
                                        isBento
                                            ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-0.5'
                                            : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 hover:border-amber-500/40 shadow-sm hover:shadow-xl'
                                    }`}
                                >
                                    <div className="space-y-4">
                                        {/* Status Header */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                                        isBento
                                                            ? isLive
                                                                ? 'bg-[#bef264] text-black border border-black'
                                                                : isScheduled
                                                                    ? 'bg-[#67e8f9] text-black border border-black'
                                                                    : 'bg-slate-200 text-black border border-black'
                                                            : isLive
                                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                                                                : isScheduled
                                                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                                                    : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-ping' : 'bg-current'}`} />
                                                        {tournament.status}
                                                    </span>

                                                    {pendingCount > 0 && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase animate-pulse ${
                                                            isBento ? 'bg-[#fdba74] text-black border border-black' : 'bg-amber-500 text-white'
                                                        }`}>
                                                            {pendingCount} Pending
                                                        </span>
                                                    )}

                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        isBento
                                                            ? isRevealed
                                                                ? 'bg-[#c084fc] text-black border border-black'
                                                                : 'bg-slate-100 text-black border border-black'
                                                            : isRevealed
                                                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                                : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                                                    }`}>
                                                        {isRevealed ? 'Results Public' : 'Results Locked'}
                                                    </span>
                                                </div>

                                                <h3 className={`text-lg font-black uppercase tracking-tight group-hover:text-amber-500 transition-colors ${
                                                    isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                                                }`}>
                                                    {tournament.name}
                                                </h3>
                                            </div>

                                            {/* Action Dropdown / Quick Edit */}
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        setFormTournament(tournament);
                                                        setCurrentView('editor');
                                                    }}
                                                    title="Edit Tournament"
                                                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                                                        isBento
                                                            ? 'bg-slate-100 text-black border-2 border-black hover:bg-[#bef264] shadow-[1px_1px_0px_#000]'
                                                            : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-indigo-400'
                                                    }`}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmation({ isOpen: true, id: tournament.tournamentId })}
                                                    title="Delete Tournament"
                                                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                                                        isBento
                                                            ? 'bg-slate-100 text-black border-2 border-black hover:bg-rose-300 shadow-[1px_1px_0px_#000]'
                                                            : 'hover:bg-red-500/10 text-gray-400 hover:text-red-500'
                                                    }`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <p className={`text-xs font-semibold leading-relaxed line-clamp-2 ${
                                            isBento ? 'text-gray-700' : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                            {tournament.description || 'No event description provided.'}
                                        </p>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                                            <div className={`p-2.5 rounded-xl ${
                                                isBento
                                                    ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                    : 'bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5'
                                            }`}>
                                                <div className={`uppercase text-[9px] tracking-wider mb-0.5 flex items-center gap-1 ${
                                                    isBento ? 'text-black font-black' : 'text-gray-400'
                                                }`}>
                                                    <Calendar className="w-3 h-3" /> Starts
                                                </div>
                                                <div className={`truncate ${isBento ? 'text-black font-mono' : 'text-gray-800 dark:text-gray-200'}`} title={formatLocalizedTournamentDateTime(tournament.startsAt, true)}>
                                                    {formatLocalizedTournamentDateTime(tournament.startsAt, true)}
                                                </div>
                                            </div>

                                            <div className={`p-2.5 rounded-xl ${
                                                isBento
                                                    ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                    : 'bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5'
                                            }`}>
                                                <div className={`uppercase text-[9px] tracking-wider mb-0.5 flex items-center gap-1 ${
                                                    isBento ? 'text-black font-black' : 'text-gray-400'
                                                }`}>
                                                    <Clock className="w-3 h-3" /> Duration
                                                </div>
                                                <div className={isBento ? 'text-black font-mono' : 'text-gray-800 dark:text-gray-200'}>
                                                    {tournament.durationMinutes ? `${tournament.durationMinutes} Mins Limit` : 'Open Window'}
                                                </div>
                                            </div>

                                            <div className={`p-2.5 rounded-xl ${
                                                isBento
                                                    ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                    : 'bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5'
                                            }`}>
                                                <div className={`uppercase text-[9px] tracking-wider mb-0.5 flex items-center gap-1 ${
                                                    isBento ? 'text-black font-black' : 'text-gray-400'
                                                }`}>
                                                    <BookOpen className="w-3 h-3" /> Quiz Source
                                                </div>
                                                <div className={`truncate ${isBento ? 'text-black font-mono' : 'text-gray-800 dark:text-gray-200'}`}>
                                                    {tournament.quizMode === 'custom'
                                                        ? `Custom Quiz (${tournament.customQuiz?.questions?.length || 0} Qs)`
                                                        : `${tournament.quizIds?.length || 0} Assigned Quizzes`}
                                                </div>
                                            </div>

                                            <div className={`p-2.5 rounded-xl ${
                                                isBento
                                                    ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                    : 'bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5'
                                            }`}>
                                                <div className={`uppercase text-[9px] tracking-wider mb-0.5 flex items-center gap-1 ${
                                                    isBento ? 'text-black font-black' : 'text-gray-400'
                                                }`}>
                                                    <Users className="w-3 h-3" /> Participants
                                                </div>
                                                <div className={isBento ? 'text-black font-mono' : 'text-gray-800 dark:text-gray-200'}>
                                                    {tournament.participants?.length || 0} Registered
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Control Center Open Button */}
                                    <div className={`mt-5 pt-4 border-t ${isBento ? 'border-black' : 'border-gray-100 dark:border-white/5'}`}>
                                        <button
                                            onClick={() => {
                                                setActiveTournament(tournament);
                                                setCurrentView('control');
                                                setControlTab('live');
                                            }}
                                            className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                isBento
                                                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:bg-[#bef264]'
                                                    : 'bg-gradient-to-r from-amber-500/10 hover:from-amber-500 to-orange-500/10 hover:to-orange-600 text-amber-600 dark:text-amber-400 hover:text-white border border-amber-500/20 hover:border-transparent shadow-sm'
                                            }`}
                                        >
                                            <Zap className="w-4 h-4" /> Open Control Center & Live Room
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredTournaments.length === 0 && !isLoading && (
                            <div className="col-span-full py-20 text-center bg-white/40 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                                <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <h3 className="text-base font-black uppercase tracking-tight text-gray-700 dark:text-gray-300">
                                    No Tournaments Found
                                </h3>
                                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-5">
                                    Get started by clicking &ldquo;Create Tournament&rdquo; to configure schedule, questions, and approval rules.
                                </p>
                                <button
                                    onClick={() => {
                                        setFormTournament({
                                            name: '',
                                            description: '',
                                            startsAt: new Date(Date.now() + 15 * 60000).toISOString(),
                                            endsAt: new Date(Date.now() + 2 * 3600000).toISOString(),
                                            durationMinutes: 45,
                                            status: 'scheduled',
                                            quizMode: 'assigned',
                                            quizIds: [],
                                            requiresApproval: true,
                                            resultsRevealed: false
                                        });
                                        setCurrentView('editor');
                                    }}
                                    className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                                >
                                    Create First Tournament
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 2: IN-TAB TOURNAMENT CREATOR / EDITOR (NO MODAL!)          */}
            {/* ============================================================== */}
            {currentView === 'editor' && (
                <div className="space-y-6">
                    <div className={`flex items-center justify-between p-4 sm:p-5 rounded-3xl transition-all ${
                        isBento
                            ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                    }`}>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentView('overview')}
                                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                                    isBento ? 'bg-slate-100 text-black border-2 border-black hover:bg-[#bef264] shadow-[1px_1px_0px_#000]' : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h2 className={`text-lg font-black uppercase tracking-tight ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                    {formTournament.tournamentId ? 'Edit Tournament Event' : 'Create New Tournament'}
                                </h2>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isBento ? 'text-gray-600 font-mono' : 'text-gray-400'}`}>
                                    Configure schedule, exam questions, approval policy and prizes
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentView('overview')}
                                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                                    isBento ? 'bg-white text-black border-2 border-black hover:bg-slate-100 shadow-[2px_2px_0px_#000]' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSaveTournament}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                                    isBento
                                        ? 'bg-[#ff6b00] text-white border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/25'
                                }`}
                            >
                                {formTournament.tournamentId ? 'Save Changes' : 'Establish Tournament'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left 2 Cols: Main Configuration */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Section 1: Basic Event Information */}
                            <div className={`p-6 rounded-3xl space-y-4 transition-all ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                            }`}>
                                <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-[#fde047] text-black border-2 border-black' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <Trophy className="w-4 h-4" />
                                    </div>
                                    1. Tournament Details
                                </h3>

                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Tournament Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Master Code Clash 2026"
                                        value={formTournament.name || ''}
                                        onChange={e => setFormTournament({ ...formTournament, name: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-xl text-sm font-bold outline-none transition-all ${
                                            isBento
                                                ? 'bg-slate-50 text-black border-2 border-black shadow-[2px_2px_0px_#000] focus:shadow-[3px_3px_0px_#000]'
                                                : 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/30'
                                        }`}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Event Brief & Student Instructions</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Describe the topics, rules, and rewards..."
                                        value={formTournament.description || ''}
                                        onChange={e => setFormTournament({ ...formTournament, description: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-xl text-xs font-semibold outline-none transition-all resize-none ${
                                            isBento
                                                ? 'bg-slate-50 text-black border-2 border-black shadow-[2px_2px_0px_#000] focus:shadow-[3px_3px_0px_#000]'
                                                : 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/30'
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Section 2: Flexible Timing & Presets */}
                            <div className={`p-6 rounded-3xl space-y-5 transition-all ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-[#38bdf8] text-black border-2 border-black' : 'bg-blue-500/10 text-blue-500'}`}>
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        2. Flexible Time Scheduling
                                    </h3>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isBento ? 'text-black font-black' : 'text-gray-400'}`}>
                                        Freely Editable Text & Interactive Pickers
                                    </span>
                                </div>

                                {/* Quick Start Presets */}
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>
                                        Kickoff Quick Presets
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {([
                                            { label: '⚡ Start Now (Live)', preset: 'now' },
                                            { label: 'In 15 Minutes', preset: 'in15m' },
                                            { label: 'In 1 Hour', preset: 'in1h' },
                                            { label: 'Tomorrow at 10:00', preset: 'tomorrowMorning' },
                                            { label: 'Tomorrow at 18:00', preset: 'tomorrow' },
                                            { label: 'This Saturday 14:00', preset: 'weekend' }
                                        ] as const).map(item => (
                                            <button
                                                key={item.preset}
                                                type="button"
                                                onClick={() => handleSetTimePreset(item.preset)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                                    isBento
                                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#bef264] hover:shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                                        : 'bg-gray-100 dark:bg-white/5 hover:bg-amber-500/10 text-gray-700 dark:text-gray-300 hover:text-amber-500'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Flexible Datetime Pickers (Both Direct Text and Options) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FlexibleDateTimePicker
                                        label="Start Datetime"
                                        value={formTournament.startsAt || ''}
                                        onChange={isoVal => setFormTournament(prev => ({ ...prev, startsAt: isoVal }))}
                                        durationMinutes={formTournament.durationMinutes}
                                    />

                                    <FlexibleDateTimePicker
                                        label="End Datetime (Window Closes)"
                                        value={formTournament.endsAt || ''}
                                        onChange={isoVal => setFormTournament(prev => ({ ...prev, endsAt: isoVal }))}
                                        isEndTime={true}
                                        referenceStartTime={formTournament.startsAt}
                                        durationMinutes={formTournament.durationMinutes}
                                    />
                                </div>

                                {/* Duration & Countdown Section with Direct Numeric Input and Presets */}
                                <div className={`space-y-3 pt-3 border-t ${isBento ? 'border-black' : 'border-gray-100 dark:border-white/5'}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <label className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${isBento ? 'text-black' : 'text-gray-400'}`}>
                                                <Timer className={`w-3.5 h-3.5 ${isBento ? 'text-black' : 'text-blue-500'}`} />
                                                Per-Student Time Limit (Countdown per Attempt)
                                            </label>
                                            <p className={`text-[10px] font-medium mt-0.5 ${isBento ? 'text-gray-700' : 'text-gray-500'}`}>
                                                Individual timer allocated once student clicks Start Competition. Enter 0 for untimed open window.
                                            </p>
                                        </div>

                                        {/* Direct Number Input Box with Stepper Controls */}
                                        <div className={`flex items-center gap-1.5 p-1 rounded-2xl ${
                                            isBento ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-xs'
                                        }`}>
                                            <button
                                                type="button"
                                                onClick={() => handleAdjustDuration(-5)}
                                                className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center cursor-pointer transition-all ${
                                                    isBento ? 'bg-slate-100 hover:bg-[#bef264] text-black border border-black' : 'bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200'
                                                }`}
                                                title="Subtract 5 Minutes"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <input
                                                type="number"
                                                min={0}
                                                max={720}
                                                value={formTournament.durationMinutes ?? 0}
                                                onChange={e => {
                                                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                                    setFormTournament(prev => ({ ...prev, durationMinutes: val }));
                                                }}
                                                className={`w-16 text-center py-1 bg-transparent font-black text-sm outline-none ${
                                                    isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'
                                                }`}
                                            />
                                            <span className={`text-[11px] font-black uppercase tracking-wider pr-2 ${isBento ? 'text-black' : 'text-gray-400'}`}>Mins</span>
                                            <button
                                                type="button"
                                                onClick={() => handleAdjustDuration(5)}
                                                className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center cursor-pointer transition-all ${
                                                    isBento ? 'bg-slate-100 hover:bg-[#bef264] text-black border border-black' : 'bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200'
                                                }`}
                                                title="Add 5 Minutes"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Duration presets */}
                                    <div className="flex flex-wrap gap-2">
                                        {[10, 15, 20, 30, 45, 60, 90, 120, 0].map(mins => (
                                            <button
                                                key={mins}
                                                type="button"
                                                onClick={() => handleSetDurationPreset(mins)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                                    formTournament.durationMinutes === mins
                                                        ? isBento
                                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20'
                                                        : isBento
                                                            ? 'bg-white text-black border-2 border-black shadow-[1px_1px_0px_#000] hover:bg-yellow-200'
                                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                {mins === 0 ? 'Full Window (No Timer)' : `${mins} Mins`}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Real-Time Live Intelligence & Scheduling Status Banner */}
                                    {(() => {
                                        const startD = formTournament.startsAt ? new Date(formTournament.startsAt) : new Date();
                                        const endD = formTournament.endsAt ? new Date(formTournament.endsAt) : new Date();
                                        const windowMins = Math.max(0, Math.round((endD.getTime() - startD.getTime()) / 60000));
                                        const studentMins = formTournament.durationMinutes ?? 45;
                                        const isReversed = endD.getTime() <= startD.getTime();
                                        const isConflict = !isReversed && studentMins > 0 && studentMins > windowMins;

                                        const formatWindowSpan = (mins: number) => {
                                            if (mins <= 0) return '0 mins';
                                            if (mins < 60) return `${mins} Minutes`;
                                            const h = Math.floor(mins / 60);
                                            const m = mins % 60;
                                            return m === 0 ? `${h} Hour${h > 1 ? 's' : ''}` : `${h}h ${m}m`;
                                        };

                                        if (isReversed) {
                                            return (
                                                <div className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold ${
                                                    isBento
                                                        ? 'bg-[#fee2e2] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
                                                }`}>
                                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                                    <span>End Datetime must occur after Start Datetime. Please adjust your schedule.</span>
                                                </div>
                                            );
                                        }

                                        if (isConflict) {
                                            return (
                                                <div className={`p-3 rounded-2xl flex items-start gap-2.5 text-xs font-semibold ${
                                                    isBento
                                                        ? 'bg-[#fef3c7] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400'
                                                }`}>
                                                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isBento ? 'text-black' : 'text-amber-500'}`} />
                                                    <div>
                                                        <div className="font-bold">Student limit ({studentMins}m) exceeds total arena window ({windowMins}m)</div>
                                                        <p className="text-[11px] opacity-90 mt-0.5">
                                                            Students starting near the end will only receive whatever time remains before closing. Consider expanding the window or clicking &quot;Match Limit&quot; in the End Datetime options.
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className={`p-3 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                                                isBento
                                                    ? 'bg-[#e0f2fe] border-2 border-black shadow-[2px_2px_0px_#000] text-black font-mono'
                                                    : 'bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 text-gray-700 dark:text-gray-300'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <Clock className={`w-4 h-4 flex-shrink-0 ${isBento ? 'text-black' : 'text-blue-500'}`} />
                                                    <span>
                                                        Arena Window: <strong>{formatWindowSpan(windowMins)}</strong> ({new Date(startD).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} → {new Date(endD).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})
                                                    </span>
                                                </div>
                                                <span className={`font-black text-[11px] uppercase tracking-wider ${
                                                    isBento ? 'text-black' : 'text-blue-600 dark:text-blue-400'
                                                }`}>
                                                    {studentMins > 0 ? `${studentMins}m timer per student` : 'Open untimed window'}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Section 3: Dual-Mode Quiz Engine */}
                            <div className={`p-6 rounded-3xl space-y-4 transition-all ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-[#c084fc] text-black border-2 border-black' : 'bg-purple-500/10 text-purple-500'}`}>
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            3. Tournament Quiz Mode
                                        </h3>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isBento ? 'text-gray-600 font-mono' : 'text-gray-400'}`}>
                                            Assign an existing quiz or craft dedicated tournament questions
                                        </p>
                                    </div>

                                    {/* Quiz Mode Switcher */}
                                    <div className={`flex items-center gap-1.5 p-1 rounded-xl ${isBento ? 'bg-slate-200 border-2 border-black' : 'bg-gray-100 dark:bg-black/30'}`}>
                                        <button
                                            type="button"
                                            onClick={() => setFormTournament({ ...formTournament, quizMode: 'assigned' })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                formTournament.quizMode === 'assigned'
                                                    ? isBento
                                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                        : 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                                                    : isBento
                                                        ? 'text-black hover:bg-white/50'
                                                        : 'text-gray-400 hover:text-gray-700'
                                            }`}
                                        >
                                            Assign Existing
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormTournament({ ...formTournament, quizMode: 'custom' })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                formTournament.quizMode === 'custom'
                                                    ? isBento
                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                        : 'bg-amber-500 text-white shadow-sm'
                                                    : isBento
                                                        ? 'text-black hover:bg-white/50'
                                                        : 'text-gray-400 hover:text-gray-700'
                                            }`}
                                        >
                                            Create Custom Quiz
                                        </button>
                                    </div>
                                </div>

                                {/* Option A: Assign Existing Quiz */}
                                {formTournament.quizMode === 'assigned' && (
                                    <div className="space-y-4">
                                        <p className={`text-xs font-medium ${isBento ? 'text-gray-700' : 'text-gray-500'}`}>
                                            Select existing quizzes to annex to this tournament. Students will be served this exam upon arena kickoff.
                                        </p>

                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {quizzes.map(quiz => {
                                                const isSelected = (formTournament.quizIds || []).includes(quiz.id);
                                                return (
                                                    <div
                                                        key={quiz.id}
                                                        onClick={() => {
                                                            const current = formTournament.quizIds || [];
                                                            const next = isSelected
                                                                ? current.filter(id => id !== quiz.id)
                                                                : [...current, quiz.id];
                                                            setFormTournament({ ...formTournament, quizIds: next });
                                                        }}
                                                        className={`p-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer ${
                                                            isSelected
                                                                ? isBento
                                                                    ? 'bg-[#bef264] border-2 border-black shadow-[3px_3px_0px_#000] text-black'
                                                                    : 'bg-purple-500/10 border-purple-500/40 text-purple-900 dark:text-purple-200'
                                                                : isBento
                                                                    ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-black hover:bg-slate-50'
                                                                    : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/5 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                                                                isSelected
                                                                    ? isBento
                                                                        ? 'bg-black text-[#bef264] border border-black'
                                                                        : 'bg-purple-600 text-white'
                                                                    : isBento
                                                                        ? 'bg-slate-100 text-black border border-black'
                                                                        : 'bg-gray-200 dark:bg-white/10 text-gray-500'
                                                            }`}>
                                                                {isSelected ? <Check className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                                            </div>
                                                            <div>
                                                                <div className={`text-xs font-black uppercase ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                                                    {quiz.title}
                                                                </div>
                                                                <div className={`text-[10px] font-bold uppercase tracking-wider ${isBento ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                    {quiz.questions?.length || 0} Questions • Category: {quiz.category || 'General'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                            isBento ? 'bg-white text-black border border-black' : 'bg-gray-200 dark:bg-white/10'
                                                        }`}>
                                                            {quiz.difficulty || 'Medium'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Option B: Build Custom Quiz Inline */}
                                {formTournament.quizMode === 'custom' && (
                                    <div className="space-y-5">
                                        <div className={`flex items-center justify-between p-3 rounded-2xl ${
                                            isBento ? 'bg-[#fef08a] border-2 border-black shadow-[2px_2px_0px_#000] text-black' : 'bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-600 dark:text-amber-400'
                                        }`}>
                                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
                                                <Sparkles className="w-4 h-4" />
                                                Dedicated Tournament Quiz Builder ({formTournament.customQuiz?.questions?.length || 0} Questions)
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddCustomQuestion}
                                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                                    isBento
                                                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                                }`}
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Question
                                            </button>
                                        </div>

                                        {/* Question tabs */}
                                        {(formTournament.customQuiz?.questions || []).length > 0 && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
                                                    {(formTournament.customQuiz?.questions || []).map((q, idx) => (
                                                        <button
                                                            key={q.id || idx}
                                                            type="button"
                                                            onClick={() => setActiveQuestionTab(idx)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                                                                activeQuestionTab === idx
                                                                    ? isBento
                                                                        ? 'bg-[#c084fc] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                        : 'bg-amber-500 text-white shadow-sm'
                                                                    : isBento
                                                                        ? 'bg-white text-black border-2 border-black shadow-[1px_1px_0px_#000] hover:bg-slate-100'
                                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-900'
                                                            }`}
                                                        >
                                                            Q{idx + 1}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Active Question Editor */}
                                                {formTournament.customQuiz?.questions?.[activeQuestionTab] && (() => {
                                                    const q = formTournament.customQuiz!.questions[activeQuestionTab];
                                                    return (
                                                        <div className={`p-4 rounded-2xl space-y-4 ${
                                                            isBento
                                                                ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                                                                : 'bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/5'
                                                        }`}>
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black font-mono' : 'text-amber-500'}`}>
                                                                    Question {activeQuestionTab + 1} Configuration
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteQuestion(activeQuestionTab)}
                                                                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                                                        isBento
                                                                            ? 'bg-rose-100 text-black border border-black hover:bg-rose-200'
                                                                            : 'text-red-400 hover:bg-red-500/10'
                                                                    }`}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Remove Question
                                                                </button>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Question Prompt</label>
                                                                <textarea
                                                                    rows={2}
                                                                    value={q.text}
                                                                    onChange={e => handleUpdateQuestion(activeQuestionTab, { text: e.target.value })}
                                                                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${
                                                                        isBento
                                                                            ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                                            : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                                                    }`}
                                                                />
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>
                                                                    Answer Choices (Click radio to set Correct Answer)
                                                                </label>
                                                                <div className="space-y-2">
                                                                    {q.options.map((opt, optIdx) => (
                                                                        <div key={optIdx} className="flex items-center gap-2">
                                                                            <input
                                                                                type="radio"
                                                                                name={`correct_${activeQuestionTab}`}
                                                                                checked={Number(q.correctAnswer) === optIdx}
                                                                                onChange={() => handleUpdateQuestion(activeQuestionTab, { correctAnswer: optIdx })}
                                                                                className={`w-4 h-4 cursor-pointer ${isBento ? 'accent-black' : 'accent-amber-500'}`}
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                value={opt}
                                                                                onChange={e => {
                                                                                    const updatedOpts = [...q.options];
                                                                                    updatedOpts[optIdx] = e.target.value;
                                                                                    handleUpdateQuestion(activeQuestionTab, { options: updatedOpts });
                                                                                }}
                                                                                className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold outline-none ${
                                                                                    isBento
                                                                                        ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                                                        : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                                                                }`}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>
                                                                    Teacher Explanation (Shown during review sessions)
                                                                </label>
                                                                <textarea
                                                                    rows={2}
                                                                    value={q.explanation || ''}
                                                                    onChange={e => handleUpdateQuestion(activeQuestionTab, { explanation: e.target.value })}
                                                                    placeholder="Why is this answer correct? Provide concepts and step-by-step reasoning..."
                                                                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold outline-none ${
                                                                        isBento
                                                                            ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                                            : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                                                    }`}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {(formTournament.customQuiz?.questions || []).length === 0 && (
                                            <div className={`text-center py-8 rounded-2xl border-2 border-dashed ${
                                                isBento ? 'bg-white border-black text-black' : 'bg-gray-50/50 dark:bg-black/10 border-gray-200 dark:border-white/5'
                                            }`}>
                                                <HelpCircle className={`w-8 h-8 mx-auto mb-2 ${isBento ? 'text-black' : 'text-gray-400'}`} />
                                                <p className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-500'}`}>
                                                    No questions annexed yet
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleAddCustomQuestion}
                                                    className={`mt-3 px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer ${
                                                        isBento ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-amber-500 text-white'
                                                    }`}
                                                >
                                                    Add First Question
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right 1 Col: Access, Results Gating & Rewards */}
                        <div className="space-y-6">
                            {/* Access & Result Gating Settings */}
                            <div className={`p-6 rounded-3xl space-y-5 transition-all ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                            }`}>
                                <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-[#bef264] text-black border-2 border-black' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    4. Access & Results Policy
                                </h3>

                                {/* Requires Approval Toggle */}
                                <div className={`flex items-center justify-between p-3.5 rounded-2xl ${
                                    isBento ? 'bg-slate-50 border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5'
                                }`}>
                                    <div className="space-y-0.5">
                                        <div className={`text-xs font-black uppercase tracking-tight ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                            Admin Approval Required
                                        </div>
                                        <div className={`text-[10px] font-semibold leading-relaxed ${isBento ? 'text-gray-600' : 'text-gray-400'}`}>
                                            Students request to join and must be approved before starting.
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formTournament.requiresApproval)}
                                        onChange={e => setFormTournament({ ...formTournament, requiresApproval: e.target.checked })}
                                        className={`w-5 h-5 cursor-pointer ${isBento ? 'accent-black' : 'accent-amber-500'}`}
                                    />
                                </div>

                                {/* Results Gating Toggle */}
                                <div className={`flex items-center justify-between p-3.5 rounded-2xl ${
                                    isBento ? 'bg-slate-50 border-2 border-black shadow-[2px_2px_0px_#000]' : 'bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5'
                                }`}>
                                    <div className="space-y-0.5">
                                        <div className={`text-xs font-black uppercase tracking-tight ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                            Gated Results (Wait for Reveal)
                                        </div>
                                        <div className={`text-[10px] font-semibold leading-relaxed ${isBento ? 'text-gray-600' : 'text-gray-400'}`}>
                                            Students wait on holding screen until teacher reveals results.
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={!formTournament.resultsRevealed}
                                        onChange={e => setFormTournament({ ...formTournament, resultsRevealed: !e.target.checked })}
                                        className={`w-5 h-5 cursor-pointer ${isBento ? 'accent-black' : 'accent-amber-500'}`}
                                    />
                                </div>
                            </div>

                            {/* Rewards Selection */}
                            <div className={`p-6 rounded-3xl space-y-4 transition-all ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                            }`}>
                                <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-[#fde047] text-black border-2 border-black' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <Award className="w-4 h-4" />
                                    </div>
                                    5. Tournament Prizes
                                </h3>

                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Badge Reward</label>
                                    <select
                                        value={formTournament.rewardBadgeId || ''}
                                        onChange={e => setFormTournament({ ...formTournament, rewardBadgeId: e.target.value || undefined })}
                                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer ${
                                            isBento
                                                ? 'bg-slate-50 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                        }`}
                                    >
                                        <option value="">No Badge Prize</option>
                                        {badges.map((b, bIdx) => (
                                            <option key={`${b.id}-${bIdx}`} value={b.id}>🏆 {b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Shop Item Reward</label>
                                    <select
                                        value={formTournament.rewardItemId || ''}
                                        onChange={e => setFormTournament({ ...formTournament, rewardItemId: e.target.value || undefined })}
                                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer ${
                                            isBento
                                                ? 'bg-slate-50 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                        }`}
                                    >
                                        <option value="">No Item Prize</option>
                                        {shopItems.map((item, itemIdx) => (
                                            <option key={`${item.itemId || (item as any).id}-${itemIdx}`} value={item.itemId || (item as any).id}>🎁 {item.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>Coins Prize</label>
                                        <input
                                            type="number"
                                            value={formTournament.rewardCoins || 1000}
                                            onChange={e => setFormTournament({ ...formTournament, rewardCoins: Number(e.target.value) })}
                                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${
                                                isBento
                                                    ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                    : 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                            }`}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-gray-400'}`}>XP Prize</label>
                                        <input
                                            type="number"
                                            value={formTournament.rewardXp || 500}
                                            onChange={e => setFormTournament({ ...formTournament, rewardXp: Number(e.target.value) })}
                                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none ${
                                                isBento
                                                    ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                    : 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                            }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* JSON Import/Export Tools */}
                            <div className={`p-4 rounded-2xl space-y-3 ${
                                isBento ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]' : 'bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/5'
                            }`}>
                                <span className={`text-[10px] font-black uppercase tracking-wider block ${isBento ? 'text-black font-mono' : 'text-gray-400'}`}>JSON Import & Export Tools</span>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => tournamentUploadRef.current?.click()}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#bef264] hover:shadow-[3px_3px_0px_#000]'
                                                    : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 shadow-sm hover:text-indigo-500'
                                            }`}
                                        >
                                            <Upload className={`w-3 h-3 ${isBento ? 'text-black' : 'text-indigo-500'}`} /> Upload Tournament JSON
                                        </button>
                                        <input type="file" ref={tournamentUploadRef} onChange={handleUploadTournamentJson} accept=".json" className="hidden" />
                                        <button
                                            type="button"
                                            onClick={handleDownloadSampleJson}
                                            className={`p-2 rounded-xl cursor-pointer transition-all ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#bef264]'
                                                    : 'bg-white dark:bg-white/10 text-gray-400 hover:text-indigo-500'
                                            }`}
                                            title="Download Tournament Sample JSON"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => quizUploadRef.current?.click()}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#bef264] hover:shadow-[3px_3px_0px_#000]'
                                                    : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 shadow-sm hover:text-purple-500'
                                            }`}
                                        >
                                            <Upload className={`w-3 h-3 ${isBento ? 'text-black' : 'text-purple-500'}`} /> Upload Quiz JSON
                                        </button>
                                        <input type="file" ref={quizUploadRef} onChange={handleUploadQuizJson} accept=".json" className="hidden" />
                                        <button
                                            type="button"
                                            onClick={handleDownloadQuizSampleJson}
                                            className={`p-2 rounded-xl cursor-pointer transition-all ${
                                                isBento
                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#bef264]'
                                                    : 'bg-white dark:bg-white/10 text-gray-400 hover:text-purple-500'
                                            }`}
                                            title="Download Quiz Sample JSON"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 3: TOURNAMENT CONTROL CENTER & LIVE MONITORING            */}
            {/* ============================================================== */}
            {currentView === 'control' && activeTournament && (
                <div className="space-y-6">
                    {/* Control Sub-navigation Bar */}
                    <div className={`flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-3xl transition-all ${
                        isBento
                            ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                            : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                    }`}>
                        <div className="flex items-center gap-2 overflow-x-auto">
                            <button
                                onClick={() => setControlTab('live')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                                    controlTab === 'live'
                                        ? isBento
                                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                        : isBento
                                            ? 'bg-white text-black border-2 border-black hover:bg-slate-100 shadow-[1px_1px_0px_#000]'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                <Monitor className="w-4 h-4" />
                                Live Room ({liveSessions.filter(s => s.status === 'answering').length} Active)
                            </button>

                            <button
                                onClick={() => setControlTab('requests')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                                    controlTab === 'requests'
                                        ? isBento
                                            ? 'bg-[#fdba74] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                        : isBento
                                            ? 'bg-white text-black border-2 border-black hover:bg-slate-100 shadow-[1px_1px_0px_#000]'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                <UserCheck className="w-4 h-4" />
                                Join Requests ({activeTournament.pendingCount || 0})
                            </button>

                            <button
                                onClick={() => setControlTab('leaderboard')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                                    controlTab === 'leaderboard'
                                        ? isBento
                                            ? 'bg-[#c084fc] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                        : isBento
                                            ? 'bg-white text-black border-2 border-black hover:bg-slate-100 shadow-[1px_1px_0px_#000]'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                <Trophy className="w-4 h-4" />
                                Leaderboard & Reveal
                            </button>

                            <button
                                onClick={() => setControlTab('review')}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                                    controlTab === 'review'
                                        ? isBento
                                            ? 'bg-[#67e8f9] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                            : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                        : isBento
                                            ? 'bg-white text-black border-2 border-black hover:bg-slate-100 shadow-[1px_1px_0px_#000]'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                <Presentation className="w-4 h-4" />
                                Teacher Review Session
                            </button>
                        </div>

                        {/* Quick Telemetry Refresh & Results Gating Toggle from Control Center */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={async () => {
                                    await loadTournaments();
                                    if (controlTab === 'live' && activeTournament) {
                                        await loadLiveRoom(activeTournament.tournamentId);
                                    }
                                    onNotificationRef.current('success', 'Tournament telemetry refreshed!');
                                }}
                                disabled={isLoading || isRefreshingLive}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 hover:shadow-[3px_3px_0px_#000]'
                                        : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                                }`}
                                title="Refresh telemetry and participant statuses"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isLoading || isRefreshingLive ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </button>

                            <button
                                onClick={handleToggleResultsReveal}
                                disabled={isTogglingReveal}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                                    isBento
                                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                        : activeTournament.resultsRevealed
                                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500 hover:text-white'
                                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                }`}
                            >
                                {activeTournament.resultsRevealed ? (
                                    <>
                                        <Unlock className="w-3.5 h-3.5" /> Results Revealed (Click to Lock)
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-3.5 h-3.5" /> 📢 Reveal Results Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* -------------------------------------------------------- */}
                    {/* SUB-TAB A: LIVE ROOM & ACTIVE TAKER TELEMETRY           */}
                    {/* -------------------------------------------------------- */}
                    {controlTab === 'live' && (
                        <div className="space-y-6">
                            {/* Live Header Controls */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/60 dark:bg-[#1a1b26]/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-white/5 gap-4">
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                        Live Active Quiz Proctoring
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                        Last refreshed: {lastRefreshedAt.toLocaleTimeString()}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setAutoRefreshLive(!autoRefreshLive)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            autoRefreshLive
                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                                        }`}
                                    >
                                        Auto-refresh: {autoRefreshLive ? 'ON (4s)' : 'OFF'}
                                    </button>

                                    <button
                                        onClick={() => loadLiveRoom(activeTournament.tournamentId)}
                                        disabled={isRefreshingLive}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/20"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLive ? 'animate-spin' : ''}`} />
                                        Live Refresh
                                    </button>
                                </div>
                            </div>

                            {/* Active Participants List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {liveSessions.map(session => {
                                    const isDone = session.status === 'submitted';
                                    const progressPercent = Math.round((session.currentQuestion / (session.totalQuestions || 10)) * 100);

                                    return (
                                        <div
                                            key={session.userId}
                                            className="bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl p-5 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-sm space-y-4"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center font-black text-amber-600 dark:text-amber-400 text-sm">
                                                        {session.userName?.[0] || 'S'}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-gray-900 dark:text-white uppercase">
                                                            {session.userName}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 font-bold">
                                                            {session.userEmail || session.userId}
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    isDone
                                                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse'
                                                }`}>
                                                    {isDone ? 'Submitted' : 'Answering'}
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                                                    <span>Question {session.currentQuestion} / {session.totalQuestions}</span>
                                                    <span>{progressPercent}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-300"
                                                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5">
                                                <span>Elapsed: {Math.floor((session.timeElapsed || 0) / 60)}m {(session.timeElapsed || 0) % 60}s</span>
                                                {isDone && (
                                                    <span className="font-black text-purple-500">
                                                        Score: {session.score} ({session.percentage}%)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {liveSessions.length === 0 && (
                                    <div className="col-span-full py-16 text-center bg-white/40 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                                        <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-2 opacity-50" />
                                        <h4 className="text-sm font-black uppercase tracking-tight text-gray-700 dark:text-gray-300">
                                            No Students Currently Taking Quiz
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-1">
                                            When approved participants enter the arena and start their exam, their live telemetry will appear here in real time.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* -------------------------------------------------------- */}
                    {/* SUB-TAB B: JOIN REQUESTS & APPROVALS                     */}
                    {/* -------------------------------------------------------- */}
                    {controlTab === 'requests' && (() => {
                        const participants = (activeTournament.participants as TournamentParticipant[]) || [];
                        const pending = participants.filter(p => typeof p === 'object' && p.status === 'pending');
                        const approved = participants.filter(p => typeof p === 'object' && p.status === 'approved');

                        return (
                            <div className="space-y-6">
                                {/* Pending Requests Card */}
                                <div className={`p-6 rounded-3xl space-y-4 transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                        : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                                }`}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div>
                                            <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-[#fdba74] text-black border-2 border-black' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    <UserCheck className="w-4 h-4" />
                                                </div>
                                                Pending Join Requests ({pending.length})
                                            </h3>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isBento ? 'text-gray-600 font-mono' : 'text-gray-400'}`}>
                                                Students awaiting instructor approval to enter the arena
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await loadTournaments();
                                                    onNotificationRef.current('success', 'Join requests reloaded!');
                                                }}
                                                disabled={isLoading}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 ${
                                                    isBento
                                                        ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-slate-100 hover:shadow-[3px_3px_0px_#000]'
                                                        : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200'
                                                }`}
                                                title="Check for new student join requests"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isLoading ? 'animate-spin' : ''}`} />
                                                <span>Refresh</span>
                                            </button>

                                            {pending.length > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => handleManageRequests('approve', pending.map(p => p.userId))}
                                                        disabled={isProcessingRequests}
                                                        className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 ${
                                                            isBento
                                                                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                        }`}
                                                    >
                                                        <Check className="w-3.5 h-3.5" /> Approve All ({pending.length})
                                                    </button>
                                                    <button
                                                        onClick={() => handleManageRequests('reject', pending.map(p => p.userId))}
                                                        disabled={isProcessingRequests}
                                                        className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                                                            isBento
                                                                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-rose-200'
                                                                : 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white'
                                                        }`}
                                                    >
                                                        <X className="w-3.5 h-3.5" /> Reject All
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {pending.length > 0 ? (
                                        <div className="space-y-2">
                                            {pending.map(p => (
                                                <div
                                                    key={p.userId}
                                                    className={`p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                                                        isBento
                                                            ? 'bg-slate-50 border-2 border-black shadow-[2px_2px_0px_#000]'
                                                            : 'bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                                                            isBento ? 'bg-[#fde047] text-black border-2 border-black' : 'bg-amber-500/10 text-amber-600'
                                                        }`}>
                                                            {p.userName?.[0] || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className={`text-xs font-black uppercase ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>{p.userName}</div>
                                                            <div className={`text-[10px] font-bold ${isBento ? 'text-gray-600' : 'text-gray-400'}`}>{p.userEmail} • Requested {new Date(p.requestedAt).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                                        <button
                                                            onClick={() => handleManageRequests('approve', [p.userId])}
                                                            disabled={isProcessingRequests}
                                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer transition-all ${
                                                                isBento
                                                                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000]'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            }`}
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleManageRequests('reject', [p.userId])}
                                                            disabled={isProcessingRequests}
                                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer transition-all ${
                                                                isBento
                                                                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-rose-200'
                                                                    : 'bg-gray-200 dark:bg-white/10 hover:bg-red-500 hover:text-white text-gray-700 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={`text-center py-8 text-xs font-bold uppercase tracking-wider ${isBento ? 'text-black font-mono' : 'text-gray-400'}`}>
                                            No pending requests at this time
                                        </div>
                                    )}
                                </div>

                                {/* Approved Roster Card */}
                                <div className={`p-6 rounded-3xl space-y-4 transition-all ${
                                    isBento
                                        ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                        : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                                }`}>
                                    <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-[#bef264] text-black border-2 border-black' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        Approved Participants ({approved.length})
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {approved.map(p => (
                                            <div
                                                key={p.userId}
                                                className={`p-3 rounded-2xl flex items-center justify-between ${
                                                    isBento
                                                        ? 'bg-slate-50 text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                        : 'bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                                        isBento ? 'bg-[#bef264] text-black border border-black' : 'bg-emerald-500/10 text-emerald-600'
                                                    }`}>
                                                        {p.userName?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className={`text-xs font-black uppercase truncate max-w-[130px] ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>{p.userName}</div>
                                                        <div className={`text-[9px] font-bold ${isBento ? 'text-gray-600' : 'text-gray-400'}`}>
                                                            {p.submittedAt ? 'Exam Submitted' : 'Approved (Waiting to Start)'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleManageRequests('remove', [p.userId])}
                                                    title="Revoke Approval"
                                                    className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                                        isBento ? 'hover:bg-rose-100 text-black' : 'text-gray-400 hover:text-red-500'
                                                    }`}
                                                >
                                                    <UserX className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* -------------------------------------------------------- */}
                    {/* SUB-TAB C: LEADERBOARD & RESULT REVEAL                  */}
                    {/* -------------------------------------------------------- */}
                    {controlTab === 'leaderboard' && (
                        <div className="space-y-6">
                            {/* Result Gating Banner */}
                            <div className={`p-6 rounded-3xl border-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                    : activeTournament.resultsRevealed
                                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-200'
                                        : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                            }`}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
                                        {activeTournament.resultsRevealed ? <Unlock className="w-4 h-4 text-purple-500" /> : <Lock className="w-4 h-4 text-amber-500" />}
                                        {activeTournament.resultsRevealed ? 'Results are Publicly Revealed' : 'Results are Locked & Hidden from Students'}
                                    </div>
                                    <p className={`text-xs font-medium max-w-xl ${isBento ? 'text-gray-700' : 'opacity-80'}`}>
                                        {activeTournament.resultsRevealed
                                            ? 'Students can view the leaderboard and inspect their exam reviews.'
                                            : 'Students who completed the quiz are on the waiting holding screen. Click reveal when all students have finished.'}
                                    </p>
                                </div>

                                <button
                                    onClick={handleToggleResultsReveal}
                                    disabled={isTogglingReveal}
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md ${
                                        isBento
                                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000]'
                                            : activeTournament.resultsRevealed
                                                ? 'bg-gray-800 hover:bg-black text-white'
                                                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-amber-500/25'
                                    }`}
                                >
                                    {activeTournament.resultsRevealed ? 'Lock Results Again' : '📢 Reveal Results to Students'}
                                </button>
                            </div>

                            {/* Podium Top 3 */}
                            {leaderboardData.length >= 3 && (
                                <div className="grid grid-cols-3 gap-4 pt-4 max-w-2xl mx-auto items-end">
                                    {/* 2nd Place */}
                                    <div className={`p-5 rounded-3xl text-center space-y-2 ${
                                        isBento
                                            ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                            : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200 dark:border-white/10'
                                    }`}>
                                        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-300 text-black font-black flex items-center justify-center text-lg shadow-sm border border-black">
                                            🥈 2
                                        </div>
                                        <div className={`text-xs font-black uppercase truncate ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>{leaderboardData[1].userName}</div>
                                        <div className={`text-sm font-black ${isBento ? 'text-black font-mono font-black' : 'text-amber-500'}`}>{leaderboardData[1].score} Pts</div>
                                    </div>

                                    {/* 1st Place */}
                                    <div className={`p-6 rounded-3xl text-center space-y-2 transform -translate-y-2 ${
                                        isBento
                                            ? 'bg-[#fef08a] text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                                            : 'bg-gradient-to-b from-amber-500/20 to-white/70 dark:to-[#1a1b26]/70 backdrop-blur-xl border-2 border-amber-500 shadow-lg'
                                    }`}>
                                        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400 text-black font-black flex items-center justify-center text-2xl shadow-md border-2 border-black">
                                            👑 1
                                        </div>
                                        <div className={`text-sm font-black uppercase truncate ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>{leaderboardData[0].userName}</div>
                                        <div className={`text-base font-black ${isBento ? 'text-black font-mono font-black' : 'text-amber-500'}`}>{leaderboardData[0].score} Pts</div>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black text-[#bef264] border border-black">
                                            Champion
                                        </span>
                                    </div>

                                    {/* 3rd Place */}
                                    <div className={`p-5 rounded-3xl text-center space-y-2 ${
                                        isBento
                                            ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                            : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200 dark:border-white/10'
                                    }`}>
                                        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-700 text-white font-black flex items-center justify-center text-lg shadow-sm border border-black">
                                            🥉 3
                                        </div>
                                        <div className={`text-xs font-black uppercase truncate ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>{leaderboardData[2].userName}</div>
                                        <div className={`text-sm font-black ${isBento ? 'text-black font-mono font-black' : 'text-amber-500'}`}>{leaderboardData[2].score} Pts</div>
                                    </div>
                                </div>
                            )}

                            {/* Full Leaderboard Table */}
                            <div className={`rounded-3xl overflow-hidden transition-all ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                            }`}>
                                <div className={`p-4 border-b flex justify-between items-center ${isBento ? 'border-black bg-slate-50' : 'border-gray-100 dark:border-white/5'}`}>
                                    <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                        <FileSpreadsheet className={`w-4 h-4 ${isBento ? 'text-black' : 'text-purple-500'}`} />
                                        Complete Tournament Rankings ({leaderboardData.length} Submissions)
                                    </h4>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs font-bold">
                                        <thead className="bg-gray-50/50 dark:bg-black/20 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-white/5">
                                            <tr>
                                                <th className="py-3 px-4">Rank</th>
                                                <th className="py-3 px-4">Student</th>
                                                <th className="py-3 px-4">Score</th>
                                                <th className="py-3 px-4">Percentage</th>
                                                <th className="py-3 px-4">Time Taken</th>
                                                <th className="py-3 px-4">Submitted At</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {leaderboardData.map(entry => (
                                                <tr key={entry.userId} className="hover:bg-gray-50/40 dark:hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-4 font-black">
                                                        {entry.rank === 1 && '🥇 1st'}
                                                        {entry.rank === 2 && '🥈 2nd'}
                                                        {entry.rank === 3 && '🥉 3rd'}
                                                        {entry.rank > 3 && `#${entry.rank}`}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-black text-gray-900 dark:text-white uppercase">{entry.userName}</div>
                                                        <div className="text-[10px] text-gray-400 font-normal">{entry.userEmail || entry.userId}</div>
                                                    </td>
                                                    <td className="py-3 px-4 font-tabular text-amber-500 font-black">{entry.score}</td>
                                                    <td className="py-3 px-4 font-tabular">{entry.percentage}%</td>
                                                    <td className="py-3 px-4 font-tabular">{Math.floor(entry.timeTaken / 60)}m {entry.timeTaken % 60}s</td>
                                                    <td className="py-3 px-4 font-tabular text-gray-400 text-[10px]">
                                                        {new Date(entry.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            onClick={() => {
                                                                setReviewAttemptId(entry.attemptId || entry.userId);
                                                                setControlTab('review');
                                                            }}
                                                            className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                                        >
                                                            👨‍🏫 Teacher Review
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {leaderboardData.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                                                        No submissions recorded yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* -------------------------------------------------------- */}
                    {/* SUB-TAB D: TEACHER REVIEW & CLASSROOM EXPLANATION VIEW   */}
                    {/* -------------------------------------------------------- */}
                    {controlTab === 'review' && (
                        <div className="space-y-6">
                            {/* Student Attempt Selector */}
                            <div className={`p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                                isBento
                                    ? 'bg-white text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                                    : 'bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 shadow-sm'
                            }`}>
                                <div className="space-y-1">
                                    <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black font-mono' : 'text-gray-900 dark:text-white'}`}>
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-[#67e8f9] text-black border-2 border-black' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                            <Presentation className="w-4 h-4" />
                                        </div>
                                        Teacher Review & Live Student Session Mode
                                    </h3>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isBento ? 'text-gray-600 font-mono' : 'text-gray-400'}`}>
                                        Review answered exam question-by-question to explain concepts and correct answers to students
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <select
                                        value={reviewAttemptId}
                                        onChange={e => setReviewAttemptId(e.target.value)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase outline-none cursor-pointer ${
                                            isBento
                                                ? 'bg-slate-50 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                : 'bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white'
                                        }`}
                                    >
                                        <option value="">-- Choose Student Submission --</option>
                                        {((activeTournament.participants as TournamentParticipant[]) || [])
                                            .filter(p => typeof p === 'object' && p.submittedAt)
                                            .map((p, pIdx) => (
                                                <option key={`${p.userId || p.attemptId}-${pIdx}`} value={p.attemptId || p.userId}>
                                                    {p.userName} — Score: {p.score} ({p.percentage}%)
                                                </option>
                                            ))}
                                    </select>

                                    <div className={`flex items-center gap-1 p-1 rounded-xl ${
                                        isBento ? 'bg-slate-200 border-2 border-black' : 'bg-gray-100 dark:bg-white/10'
                                    }`}>
                                        <button
                                            type="button"
                                            onClick={() => setTeacherViewMode('slideshow')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                                                teacherViewMode === 'slideshow'
                                                    ? isBento
                                                        ? 'bg-[#67e8f9] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                        : 'bg-indigo-600 text-white shadow-sm'
                                                    : isBento
                                                        ? 'text-black hover:bg-white/50'
                                                        : 'text-gray-400'
                                            }`}
                                        >
                                            Slideshow Mode
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTeacherViewMode('sheet')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                                                teacherViewMode === 'sheet'
                                                    ? isBento
                                                        ? 'bg-[#67e8f9] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                                                        : 'bg-indigo-600 text-white shadow-sm'
                                                    : isBento
                                                        ? 'text-black hover:bg-white/50'
                                                        : 'text-gray-400'
                                            }`}
                                        >
                                            Full Sheet
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Teacher Review Content */}
                            {isLoadingReview && (
                                <div className="py-16 text-center bg-white/40 dark:bg-white/5 rounded-3xl border border-gray-200/80 dark:border-white/10">
                                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
                                    <h4 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">
                                        Loading Student Submission...
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-1">Retrieving questions, student answers, and teacher explanations.</p>
                                </div>
                            )}

                            {!isLoadingReview && teacherReviewData && (
                                <div className="space-y-6">
                                    {/* Student Info Card */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl p-5 rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-sm">
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Student Name</div>
                                            <div className="text-sm font-black text-gray-900 dark:text-white uppercase">{teacherReviewData.studentName}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Final Score</div>
                                            <div className="text-sm font-black text-amber-500 font-tabular">{teacherReviewData.score} Pts ({teacherReviewData.percentage}%)</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Time Taken</div>
                                            <div className="text-sm font-black text-gray-900 dark:text-white font-tabular">{Math.floor(teacherReviewData.timeTaken / 60)}m {teacherReviewData.timeTaken % 60}s</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Submitted Date</div>
                                            <div className="text-sm font-black text-gray-900 dark:text-white font-tabular">{new Date(teacherReviewData.completedAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    {/* Slideshow Presentation Mode */}
                                    {teacherViewMode === 'slideshow' && teacherReviewData.questions?.length > 0 && (() => {
                                        const currentQ = teacherReviewData.questions[teacherQuestionIndex];
                                        return (
                                            <div className="bg-white/80 dark:bg-[#1a1b26]/80 backdrop-blur-xl p-8 rounded-3xl border border-indigo-500/20 shadow-xl space-y-6">
                                                {/* Navigation header */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-500 px-3 py-1 bg-indigo-500/10 rounded-full">
                                                        Question {teacherQuestionIndex + 1} of {teacherReviewData.questions.length}
                                                    </span>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setTeacherQuestionIndex(prev => Math.max(0, prev - 1))}
                                                            disabled={teacherQuestionIndex === 0}
                                                            className="px-3.5 py-1.5 bg-gray-100 dark:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-30 cursor-pointer flex items-center gap-1"
                                                        >
                                                            <ChevronLeft className="w-4 h-4" /> Previous
                                                        </button>
                                                        <button
                                                            onClick={() => setTeacherQuestionIndex(prev => Math.min(teacherReviewData.questions.length - 1, prev + 1))}
                                                            disabled={teacherQuestionIndex === teacherReviewData.questions.length - 1}
                                                            className="px-3.5 py-1.5 bg-gray-100 dark:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-30 cursor-pointer flex items-center gap-1"
                                                        >
                                                            Next <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Big Question Prompt */}
                                                <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-relaxed">
                                                    <MathRenderer text={currentQ.text} />
                                                </div>

                                                {/* Options list with color codes */}
                                                <div className="space-y-3">
                                                    {currentQ.options.map((opt, optIdx) => {
                                                        const isCorrectAnswer = Number(currentQ.correctAnswer) === optIdx || String(currentQ.correctAnswer) === opt;
                                                        const isStudentAnswer = Number(currentQ.studentAnswer) === optIdx || String(currentQ.studentAnswer) === opt;

                                                        let optionClass = 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/5 text-gray-800 dark:text-gray-300';
                                                        if (isCorrectAnswer) {
                                                            optionClass = 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-black shadow-sm';
                                                        } else if (isStudentAnswer && !isCorrectAnswer) {
                                                            optionClass = 'bg-red-500/15 border-red-500 text-red-900 dark:text-red-200 font-black';
                                                        }

                                                        return (
                                                            <div
                                                                key={optIdx}
                                                                className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${optionClass}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                                                                        isCorrectAnswer
                                                                            ? 'bg-emerald-600 text-white'
                                                                            : isStudentAnswer
                                                                                ? 'bg-red-600 text-white'
                                                                                : 'bg-gray-200 dark:bg-white/10'
                                                                    }`}>
                                                                        {String.fromCharCode(65 + optIdx)}
                                                                    </div>
                                                                    <span className="text-sm font-bold"><MathRenderer text={opt} /></span>
                                                                </div>

                                                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                                                                    {isStudentAnswer && (
                                                                        <span className={`px-2.5 py-0.5 rounded-full ${
                                                                            isCorrectAnswer ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                                                        }`}>
                                                                            Student Answer
                                                                        </span>
                                                                    )}
                                                                    {isCorrectAnswer && (
                                                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                                                                            <Check className="w-3.5 h-3.5" /> Correct Answer
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Teacher Concept & Explanation Card */}
                                                <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl border border-indigo-500/20 space-y-2">
                                                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                                                        <Presentation className="w-4 h-4" />
                                                        Instructor Explanation & Key Takeaway
                                                    </div>
                                                    <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">
                                                        <MathRenderer text={currentQ.explanation} />
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Full Exam Sheet Mode */}
                                    {teacherViewMode === 'sheet' && (
                                        <div className="space-y-4">
                                            {teacherReviewData.questions.map((q, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-5 bg-white/70 dark:bg-[#1a1b26]/70 rounded-2xl border border-gray-200/80 dark:border-white/5 space-y-3"
                                                >
                                                    <div className="flex justify-between items-center text-xs font-black uppercase text-gray-400">
                                                        <span>Question {idx + 1}</span>
                                                        <span className={q.isCorrect ? 'text-emerald-500' : 'text-red-500'}>
                                                            {q.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-black text-gray-900 dark:text-white">
                                                        <MathRenderer text={q.text} />
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-medium">
                                                        Student answered: <span className="font-bold">{String(q.studentAnswer)}</span> | Correct: <span className="font-bold text-emerald-500">{String(q.correctAnswer)}</span>
                                                    </div>
                                                    <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-xl text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                        Explanation: <MathRenderer text={q.explanation} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!reviewAttemptId && (
                                <div className="text-center py-16 bg-white/40 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                                    <Presentation className="w-12 h-12 text-gray-400 mx-auto mb-2 opacity-50" />
                                    <h4 className="text-sm font-black uppercase tracking-tight text-gray-700 dark:text-gray-300">
                                        Select a Student Submission Above
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Pick any completed attempt from the dropdown to start the teacher review and live explanation session.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                isOpen={!!deleteConfirmation}
                onCancel={() => setDeleteConfirmation(null)}
                onConfirm={confirmDelete}
                title="Delete Tournament"
                message="Are you sure you want to permanently delete this tournament? All participant records and results will be removed."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default TournamentManagement;
