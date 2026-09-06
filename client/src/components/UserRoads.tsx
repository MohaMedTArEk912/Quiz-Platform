import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AmbientBackground } from './AmbientBackground';
import type { Quiz, UserData, AttemptData, Subject, SkillTrack, StudyCard, SkillModule, TrackRequest } from '../types/index.ts';
import { DIFFICULTY_COLORS } from '../constants/quizDefaults.ts';
import {
    Search,
    RefreshCw,
    Play,
    CheckCircle,
    BarChart3,
    Clock,
    Award,
    Zap,
    Target,
    Bell,
    ChevronRight,
    ArrowLeft,
    BookOpen,
    LayoutGrid,
    Flame,
    Monitor,
    Cpu,
    Database,
    Globe,
    Atom,
    FlaskConical,
    Calculator,
    Languages,
    FileText,
    Brain,
    Code,
    Terminal,
    Lock,
    Clipboard,
    Send,
    Layers,
    Compass,
    Sparkles,
    Quote
} from 'lucide-react';
import Navbar from './Navbar.tsx';
import UserRoadmapView from './UserRoadmapView';
import InitialTrackSelectionModal from './tracks/InitialTrackSelectionModal';
import RequestTrackAccessModal from './tracks/RequestTrackAccessModal';
import StreakRewardModal from './gamification/StreakRewardModal';
import LiveHostMode from './multiplayer/LiveHostMode';
import LivePlayerController from './multiplayer/LivePlayerController';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { getQuizIconOption } from '../utils/quizIcons';
import { getQuizPoolStatus, calculateSubjectProgress } from '../utils/poolUtils';
import { exportQuizToPDF } from '../lib/exportUtils';

const ICON_MAP: Record<string, React.ReactNode> = {
    'BookOpen': <BookOpen className="w-8 h-8" />,
    'Monitor': <Monitor className="w-8 h-8" />,
    'Cpu': <Cpu className="w-8 h-8" />,
    'Database': <Database className="w-8 h-8" />,
    'Globe': <Globe className="w-8 h-8" />,
    'Atom': <Atom className="w-8 h-8" />,
    'FlaskConical': <FlaskConical className="w-8 h-8" />,
    'Calculator': <Calculator className="w-8 h-8" />,
    'Languages': <Languages className="w-8 h-8" />,
    'FileText': <FileText className="w-8 h-8" />,
    'Brain': <Brain className="w-8 h-8" />,
    'Code': <Code className="w-8 h-8" />,
    'Terminal': <Terminal className="w-8 h-8" />,
    'Zap': <Zap className="w-8 h-8" />,
    'Layers': <Layers className="w-8 h-8" />,
    'LayoutGrid': <LayoutGrid className="w-8 h-8" />,
    'Award': <Award className="w-8 h-8" />,
};

const SubjectIcon: React.FC<{ icon: string }> = ({ icon }) => {
    const { isBento } = useTheme();
    if (ICON_MAP[icon]) {
        return <div className={isBento ? "text-black" : "text-indigo-500"}>{ICON_MAP[icon]}</div>;
    }
    // Return as emoji if not in map
    return <>{icon || '📚'}</>;
};

interface UserRoadsProps {
    quizzes: Quiz[];
    subjects: Subject[];
    user: UserData;
    attempts: AttemptData[];
    skillTracks: SkillTrack[];
    studyCards: StudyCard[];
    onSelectQuiz: (quiz: Quiz) => void;
    onViewProfile: () => void;
    onViewLeaderboard: () => void;
    onLogout: () => void;
    onRefreshData?: () => Promise<void>;
}

type SubjectTab = 'overview' | 'roadmap' | 'quizzes' | 'exams' | 'study-cards';

/**
 * Represents a progress milestone in a learning road.
 * @property {string} title - The display name of the milestone/module.
 * @property {'done' | 'current' | 'locked'} status - Current completion status.
 * @property {number} index - Zero-based index of this milestone in the road.
 */
interface Milestone {
    title: string;
    status: 'done' | 'current' | 'locked';
    index: number;
}

const UserRoads: React.FC<UserRoadsProps> = ({ quizzes: quizzesProp, subjects: subjectsProp, user, attempts: attemptsProp, skillTracks: skillTracksProp, studyCards: studyCardsProp, onSelectQuiz, onViewProfile, onViewLeaderboard, onLogout, onRefreshData }) => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const { updateUser } = useAuth();
    const { isBento } = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();

    // Track requests and access states
    const [myRequests, setMyRequests] = useState<TrackRequest[]>([]);
    const [requestingAccessSubject, setRequestingAccessSubject] = useState<Subject | null>(null);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [isLivePlayerOpen, setIsLivePlayerOpen] = useState(false);
    const [liveHostQuiz, setLiveHostQuiz] = useState<Quiz | null>(null);
    const [activeExportQuizId, setActiveExportQuizId] = useState<string | null>(null);
    const [roadFilter, setRoadFilter] = useState<'all' | 'unlocked' | 'restricted'>('all');

    // Daily AI Motivational Quote State
    const [quoteData, setQuoteData] = useState<{
        quote: string;
        author: string;
        topic?: string;
        date?: string;
        isAI?: boolean;
    }>({
        quote: "Simplicity is prerequisite for reliability.",
        author: "Edsger W. Dijkstra",
        topic: "Architecture",
        isAI: false
    });
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);

    const loadDailyQuote = useCallback(async (force = false) => {
        const todayKey = new Date().toISOString().slice(0, 10);
        const cacheKey = `daily_ai_quote_${todayKey}`;

        if (!force) {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed?.quote && parsed?.author) {
                        setQuoteData(parsed);
                        return;
                    }
                }
            } catch {
                // ignore localStorage error
            }
        }

        setIsLoadingQuote(true);
        try {
            const res = await api.getDailyQuote(force);
            if (res.success && res.data) {
                setQuoteData(res.data);
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(res.data));
                } catch {
                    // ignore storage quota error
                }
            }
        } catch (err) {
            console.warn('[UserRoads] Failed to fetch daily quote:', err);
        } finally {
            setIsLoadingQuote(false);
        }
    }, []);

    useEffect(() => {
        loadDailyQuote(false);
    }, [loadDailyQuote]);

    const handleRefreshQuote = useCallback(() => {
        loadDailyQuote(true);
    }, [loadDailyQuote]);

    useEffect(() => {
        const handleClickOutside = () => setActiveExportQuizId(null);
        if (activeExportQuizId) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [activeExportQuizId]);

    // Derive selected state from URL so refresh / back button work correctly
    const selectedSubjectId = searchParams.get('subject');
    const activeTab = (searchParams.get('tab') as SubjectTab) || 'quizzes';

    const isGuest = user.userId === 'guest' || !user.email;

    const isRoadUnlocked = useCallback((subjectId: string) => {
        if (!subjectId) return false;
        if (isGuest || user.role === 'admin' || user.isAdmin) return true;
        const unlocked = (user.unlockedTracks || []).map(id => id.toString());
        const primary = user.primaryTrackId?.toString();
        const idStr = subjectId.toString();
        return unlocked.includes(idStr) || primary === idStr;
    }, [isGuest, user.role, user.isAdmin, user.unlockedTracks, user.primaryTrackId]);

    const isInitialTrackSelectionNeeded =
        !isGuest &&
        user.role !== 'admin' &&
        !user.isAdmin &&
        subjectsProp.length > 0 &&
        !user.primaryTrackId &&
        (!user.unlockedTracks || user.unlockedTracks.length === 0);

    const loadMyRequests = useCallback(async () => {
        if (isGuest || user.role === 'admin' || user.isAdmin || !user.userId) return;
        try {
            const res = await api.getMyTrackRequests();
            setMyRequests(Array.isArray(res.requests) ? res.requests : []);
        } catch (err) {
            console.error('Failed to load my track requests:', err);
        }
    }, [isGuest, user.role, user.isAdmin, user.userId]);


    useEffect(() => {
        loadMyRequests();
    }, [loadMyRequests]);

    const setSelectedSubjectId = useCallback((id: string | null) => {
        if (id === null) {
            setSearchParams({});
        } else {
            if (!isRoadUnlocked(id)) {
                const targetSub = subjectsProp.find(s => s._id === id);
                if (targetSub) {
                    setRequestingAccessSubject(targetSub);
                }
                return;
            }
            setSearchParams({ subject: id, tab: searchParams.get('tab') || 'quizzes' });
        }
    }, [isRoadUnlocked, searchParams, setSearchParams, subjectsProp]);

    // Guard against direct URL selection of locked roads
    useEffect(() => {
        if (selectedSubjectId && !isRoadUnlocked(selectedSubjectId)) {
            showNotification('info', 'This learning road is locked. Please request access from an administrator.');
            setSelectedSubjectId(null);
        }
    }, [selectedSubjectId, isRoadUnlocked, showNotification, setSelectedSubjectId]);

    const setActiveTab = (tab: SubjectTab) => {
        if (selectedSubjectId) {
            setSearchParams({ subject: selectedSubjectId, tab });
        }
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Defensive normalization to avoid crashes if API returns unexpected shapes
    const quizzes = Array.isArray(quizzesProp) ? quizzesProp : [];
    const subjects = Array.isArray(subjectsProp) ? subjectsProp : [];
    const attempts = Array.isArray(attemptsProp) ? attemptsProp : [];
    const skillTracks = Array.isArray(skillTracksProp) ? skillTracksProp : [];
    const studyCards = Array.isArray(studyCardsProp) ? studyCardsProp : [];

    const activeSubject = subjects.find(s => s._id === selectedSubjectId);
    const filteredQuizzes = useMemo(() => {
        const searchValue = (searchTerm || '').toLowerCase();
        return quizzes.filter(quiz => {
            const title = typeof quiz.title === 'string' ? quiz.title : '';
            const description = typeof quiz.description === 'string' ? quiz.description : '';
            const matchesSearch = title.toLowerCase().includes(searchValue) ||
                description.toLowerCase().includes(searchValue);
            const matchesSubject = !selectedSubjectId || quiz.subjectId === selectedSubjectId;
            return matchesSearch && matchesSubject;
        }).sort((a, b) => {
            const getNum = (value: unknown) => {
                const str = typeof value === 'string' ? value : '';
                const match = str.match(/(\d+)/);
                return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
            };
            const numA = getNum(a.title);
            const numB = getNum(b.title);
            if (numA !== numB) return numA - numB;
            const titleA = typeof a.title === 'string' ? a.title : '';
            const titleB = typeof b.title === 'string' ? b.title : '';
            return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [quizzes, searchTerm, selectedSubjectId]);

    // Filter quizzes by type
    const regularQuizzes = useMemo(() => filteredQuizzes.filter(q => q.quizType !== 'exam'), [filteredQuizzes]);
    const examQuizzes = useMemo(() => filteredQuizzes.filter(q => q.quizType === 'exam'), [filteredQuizzes]);

    const getDifficultyBadgeBg = (difficulty: string | undefined) => {
        const key = typeof difficulty === 'string' ? difficulty.toLowerCase() : 'default';
        return DIFFICULTY_COLORS[key] || DIFFICULTY_COLORS.default;
    };

    const getQuizId = (quiz: Quiz) => quiz.id || quiz._id || '';
    const getQuizAttempts = (quizId: string) => attempts.filter(a => a.quizId === quizId);
    const getBestScore = (quizId: string) => {
        const qa = getQuizAttempts(quizId);
        return qa.length === 0 ? null : Math.max(...qa.map(a => a?.percentage ?? 0));
    };
    const hasAttempted = (quizId: string) => getQuizAttempts(quizId).length > 0;

    // Check if quiz is locked based on roadmap progress
    const isQuizLocked = (quiz: Quiz) => {
        // Guests and admins have unrestricted preview access to browse quizzes
        if (isGuest || user?.role === 'admin' || user?.isAdmin) return false;

        const quizId = getQuizId(quiz);


        // Find the skill track for this subject (check subjectId first, then trackId)
        const skillTrack = skillTracks.find(track =>
            track.subjectId === selectedSubjectId ||
            track.trackId === selectedSubjectId
        );

        // Find which module this quiz belongs to by matching quiz ID
        if (!skillTrack || !Array.isArray(skillTrack.modules) || skillTrack.modules.length === 0) {
            // No roadmap defined, nothing should be locked
            return false;
        }

        const moduleWithThisQuiz = skillTrack.modules.find(module => {
            if (!module.quizIds || module.quizIds.length === 0) return false;
            // Check multiple ID formats to be safe
            return module.quizIds.some(qId =>
                qId === quizId ||
                qId === quiz.id ||
                qId === quiz._id ||
                (quiz.id && quiz.id.includes(qId)) ||
                (quiz.id && qId.includes(quiz.id))
            );
        });

        if (!moduleWithThisQuiz) {
            // Quiz doesn't belong to any module - it's available
            return false;
        }

        const moduleId = moduleWithThisQuiz.moduleId || moduleWithThisQuiz.title;

        if (!moduleId) {
            // Module is missing an identifier; avoid locking the quiz
            return false;
        }

        // Get user's progress for this specific track
        const userProgress = user?.skillTracks?.find(t => t.trackId === skillTrack.trackId);

        if (!userProgress) {
            // If no progress yet, only lock quizzes in later modules; module-less quizzes already returned above
            const firstModule = skillTrack.modules[0];
            const firstModuleId = firstModule?.moduleId || firstModule?.title;
            return moduleId !== firstModuleId;
        }

        // Check if this quiz is in any completed or unlocked modules
        const completedModules = userProgress.completedModules || [];
        const unlockedModules = userProgress.unlockedModules || [];

        // Check if the module is completed or unlocked
        const isUnlockedOrCompleted =
            completedModules.includes(moduleId) ||
            unlockedModules.includes(moduleId);

        // Return true if locked (NOT unlocked or completed)
        return !isUnlockedOrCompleted;
    };

    const handleRefresh = async () => {
        if (!onRefreshData) return;
        setIsRefreshing(true);
        try {
            await onRefreshData();
            showNotification('success', 'Data refreshed successfully!');
        } catch (error) {
            showNotification('error', 'Failed to refresh data');
            console.error('Refresh error:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const subjectProgress = useMemo(() => {
        if (!selectedSubjectId) return 0;
        const subjectQuizzes = quizzes.filter(q => q.subjectId === selectedSubjectId);
        return calculateSubjectProgress(subjectQuizzes, attempts);
    }, [selectedSubjectId, quizzes, attempts]);

    const subjectQuizIds = useMemo(() => new Set(filteredQuizzes.map(q => getQuizId(q))), [filteredQuizzes]);
    const subjectAttempts = useMemo(() => attempts.filter(a => subjectQuizIds.has(a.quizId)), [attempts, subjectQuizIds]);

    const roadStats = useMemo(() => {
        let totalQuestions = 0;
        let answeredQuestions = 0;
        let completedCount = 0;
        let inProgressCount = 0;
        let bestScore = 0;

        filteredQuizzes.forEach(q => {
            const qId = getQuizId(q);
            totalQuestions += q.questions?.length || 0;
            const poolStatus = getQuizPoolStatus(q, attempts);
            answeredQuestions += poolStatus.seenCount;
            if (poolStatus.isFullyCompleted) {
                completedCount++;
            } else if (poolStatus.hasStarted) {
                inProgressCount++;
            }
            const qa = attempts.filter(a => a.quizId === qId);
            if (qa.length > 0) {
                const maxScore = Math.max(...qa.map(a => a?.percentage ?? 0));
                if (maxScore > bestScore) bestScore = maxScore;
            }
        });

        return {
            totalQuestionsInRoad: totalQuestions,
            totalAnsweredQuestions: answeredQuestions,
            totalRemainingQuestions: Math.max(0, totalQuestions - answeredQuestions),
            completedQuizzesCount: completedCount,
            inProgressQuizzesCount: inProgressCount,
            bestOverallScore: bestScore
        };
    }, [filteredQuizzes, attempts]);

    const {
        totalQuestionsInRoad,
        totalAnsweredQuestions,
        totalRemainingQuestions,
        completedQuizzesCount,
        inProgressQuizzesCount,
        bestOverallScore
    } = roadStats;

    const nextQuiz =
        // 1. Quizzes currently in progress (e.g. pool quizzes with remaining questions)
        filteredQuizzes.find(q => {
            const st = getQuizPoolStatus(q, attempts);
            return st.hasStarted && !st.isFullyCompleted && !isQuizLocked(q);
        }) ||
        // 2. Unattempted quizzes
        filteredQuizzes.find(q => !hasAttempted(getQuizId(q)) && !isQuizLocked(q)) ||
        // 3. Any unlocked quiz
        filteredQuizzes.find(q => !isQuizLocked(q)) ||
        filteredQuizzes[0];

    const activeTrackDefinition = selectedSubjectId
        ? skillTracks.find(track => track.subjectId === selectedSubjectId || track.trackId === selectedSubjectId)
        : null;
    const userTrackProgress = activeTrackDefinition
        ? user.skillTracks?.find(p => p.trackId === activeTrackDefinition.trackId)
        : undefined;
    const completedModules = new Set(userTrackProgress?.completedModules || []);
    const moduleMilestones: Milestone[] = (activeTrackDefinition?.modules || []).map((module: SkillModule, index: number) => {
        const title = module.title || `Module ${index + 1}`;
        const moduleId = module.moduleId || title;
        const isDone = completedModules.has(moduleId);
        const prevModule = activeTrackDefinition?.modules?.[index - 1];
        const prevModuleId = prevModule?.moduleId || null;
        const prevDone = index === 0 ? true : (prevModuleId ? completedModules.has(prevModuleId) : true);
        const status: 'done' | 'current' | 'locked' = isDone ? 'done' : prevDone ? 'current' : 'locked';
        return { title, status, index };
    });

    // Check if daily streak reward has been claimed today
    const isStreakClaimedToday = Boolean((() => {
        const todayStr = new Date().toDateString();
        if (user.lastStreakClaimDate && new Date(user.lastStreakClaimDate).toDateString() === todayStr) {
            return true;
        }
        const lastClaimedLocal = localStorage.getItem(`streak_claimed_${user.userId}`);
        if (lastClaimedLocal && new Date(lastClaimedLocal).toDateString() === todayStr) {
            return true;
        }
        return false;
    })());

    const subjectProgressMap = useMemo(() => {
        const map = new Map<string, { progress: number; subjectQuizzes: Quiz[] }>();
        subjects.forEach(subject => {
            const subjectQuizzes = quizzes.filter(q => q.subjectId === subject._id);
            const progress = calculateSubjectProgress(subjectQuizzes, attempts);
            map.set(subject._id, { progress, subjectQuizzes });
        });
        return map;
    }, [subjects, quizzes, attempts]);

    const unlockedCount = useMemo(() => {
        if (!Array.isArray(subjects)) return 0;
        return subjects.filter(s => isRoadUnlocked(s._id)).length;
    }, [subjects, isRoadUnlocked]);

    const restrictedCount = useMemo(() => {
        if (!Array.isArray(subjects)) return 0;
        return subjects.filter(s => !isRoadUnlocked(s._id)).length;
    }, [subjects, isRoadUnlocked]);

    const displayedSubjects = useMemo(() => {
        if (!Array.isArray(subjects)) return [];
        if (roadFilter === 'unlocked') {
            return subjects.filter(s => isRoadUnlocked(s._id));
        }
        if (roadFilter === 'restricted') {
            return subjects.filter(s => !isRoadUnlocked(s._id));
        }
        return subjects;
    }, [subjects, roadFilter, isRoadUnlocked]);

    const getSubjectTheme = (subject: Subject, index: number) => {
        const titleLower = (subject.title || '').toLowerCase();
        if (titleLower.includes('python')) {
            return {
                accentColor: '#fde047',
                badgeText: 'PYTHON 3 • JUNIOR',
                category: 'CORE CODING',
                iconBg: 'bg-[#fef08a] dark:bg-yellow-500/20 text-black dark:text-yellow-400',
                borderAccent: 'border-yellow-400 dark:border-yellow-500/30',
                tag: 'MOST POPULAR ⭐',
                progressFill: 'bg-[#eab308]',
                highlights: ['30 Modules', 'Interactive Compiler', 'Certificate'],
            };
        }
        if (titleLower.includes('scratch')) {
            return {
                accentColor: '#bef264',
                badgeText: 'VISUAL LOGIC • JUNIOR',
                category: 'CREATIVE CODING',
                iconBg: 'bg-[#bef264] dark:bg-lime-500/20 text-black dark:text-lime-400',
                borderAccent: 'border-lime-400 dark:border-lime-500/30',
                tag: 'BEGINNER FRIENDLY 🚀',
                progressFill: 'bg-[#84cc16]',
                highlights: ['Visual Blocks', 'Game Logic', 'Quiz Arena'],
            };
        }
        if (titleLower.includes('senior') || titleLower.includes('advanced')) {
            return {
                accentColor: '#ddd6fe',
                badgeText: 'FULLSTACK • SENIOR',
                category: 'ADVANCED PRO',
                iconBg: 'bg-[#ddd6fe] dark:bg-purple-500/20 text-black dark:text-purple-400',
                borderAccent: 'border-purple-400 dark:border-purple-500/30',
                tag: 'CAREER ACCREDITED 🎓',
                progressFill: 'bg-[#9333ea]',
                highlights: ['React & Node', 'System Architecture', 'Portfolio Cert'],
            };
        }
        if (titleLower.includes('web') || titleLower.includes('html') || titleLower.includes('front')) {
            return {
                accentColor: '#bae6fd',
                badgeText: 'WEB DEV • JUNIOR',
                category: 'FRONTEND ESSENTIALS',
                iconBg: 'bg-[#bae6fd] dark:bg-sky-500/20 text-black dark:text-sky-400',
                borderAccent: 'border-sky-400 dark:border-sky-500/30',
                tag: 'ESSENTIAL FOUNDATION 🌐',
                progressFill: 'bg-[#0284c7]',
                highlights: ['HTML5 & CSS3', 'DOM & JavaScript', 'Responsive Design'],
            };
        }
        const palettes = [
            {
                accentColor: '#fde047',
                badgeText: 'FOUNDATIONAL',
                category: 'CORE TRACK',
                iconBg: 'bg-[#fef08a] dark:bg-yellow-500/20 text-black dark:text-yellow-400',
                borderAccent: 'border-yellow-400',
                tag: 'FEATURED ROAD',
                progressFill: 'bg-[#eab308]',
                highlights: ['Curated Lessons', 'Interactive Quizzes', 'Certificate'],
            },
            {
                accentColor: '#bef264',
                badgeText: 'SPECIALIZATION',
                category: 'SKILL PATH',
                iconBg: 'bg-[#bef264] dark:bg-lime-500/20 text-black dark:text-lime-400',
                borderAccent: 'border-lime-400',
                tag: 'RECOMMENDED',
                progressFill: 'bg-[#84cc16]',
                highlights: ['Hands-on Tests', 'Deep Practice', 'Skill Tree'],
            },
            {
                accentColor: '#bae6fd',
                badgeText: 'APPLIED STUDY',
                category: 'PROFESSIONAL',
                iconBg: 'bg-[#bae6fd] dark:bg-sky-500/20 text-black dark:text-sky-400',
                borderAccent: 'border-sky-400',
                tag: 'INDUSTRY ALIGNED',
                progressFill: 'bg-[#0284c7]',
                highlights: ['Real-world Scenarios', 'Milestone Exams', 'Accreditation'],
            },
            {
                accentColor: '#ddd6fe',
                badgeText: 'MASTERY LEVEL',
                category: 'ADVANCED STUDY',
                iconBg: 'bg-[#ddd6fe] dark:bg-purple-500/20 text-black dark:text-purple-400',
                borderAccent: 'border-purple-400',
                tag: 'EXECUTIVE TIER',
                progressFill: 'bg-[#9333ea]',
                highlights: ['Advanced Theory', 'Master Challenges', 'Leaderboard XP'],
            },
        ];
        return palettes[index % palettes.length];
    };

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/25">
            {/* Ambient Background Effects */}
            <AmbientBackground />

            <Navbar
                user={user}
                onViewProfile={onViewProfile}
                onViewLeaderboard={onViewLeaderboard}
                onLogout={onLogout}
                title="Learning Roads"
                showActions={true}
            />

            <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
                {/* Hero Stats - Asymmetric Bento Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
                    {/* Featured Progression Card (7 cols) */}
                    <div className="lg:col-span-7 glass-card p-6 sm:p-7 rounded-3xl relative overflow-hidden flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                        Level {Math.floor((user.xp || 0) / 1000) + 1} Scholar
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                        {(user.xp || 0) % 1000}/1000 XP to next tier
                                    </span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    Welcome back, {user?.name?.split(' ')[0] || 'Learner'}
                                </h3>
                                
                                {/* AI Daily Quote Banner */}
                                <div className={`mt-3 max-w-xl rounded-2xl transition-all duration-300 ${
                                    isBento
                                        ? 'bg-[#fef9c3] border-2 border-black p-3 shadow-[2.5px_2.5px_0px_#000]'
                                        : 'bg-white/65 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-md p-3'
                                }`}>
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex items-start gap-2 min-w-0 flex-1">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                isBento ? 'bg-black text-amber-300' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                            }`}>
                                                <Quote className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-xs sm:text-[13px] leading-snug font-medium italic ${
                                                    isBento ? 'text-black font-mono' : 'text-slate-700 dark:text-slate-200'
                                                }`}>
                                                    “{quoteData.quote}”
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                    <span className={`text-[11px] font-bold ${
                                                        isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-white'
                                                    }`}>
                                                        — {quoteData.author}
                                                    </span>
                                                    {quoteData.topic && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                            isBento 
                                                                ? 'bg-black text-white' 
                                                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                                        }`}>
                                                            #{quoteData.topic}
                                                        </span>
                                                    )}
                                                    {quoteData.isAI && (
                                                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                                                            isBento
                                                                ? 'bg-purple-300 text-black border border-black'
                                                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                                        }`}>
                                                            <Sparkles className="w-2.5 h-2.5" /> AI Daily Spark
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Refresh Daily AI Quote Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRefreshQuote();
                                            }}
                                            disabled={isLoadingQuote}
                                            title="Generate a fresh quote via AI"
                                            className={`p-1.5 rounded-xl shrink-0 transition-all active:scale-90 cursor-pointer ${
                                                isBento
                                                    ? 'bg-white border-2 border-black text-black hover:bg-amber-100 shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuote ? 'animate-spin text-amber-500' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                <Flame className="w-6 h-6 animate-pulse" />
                            </div>
                        </div>

                        {/* XP Progress Bar */}
                        <div className="space-y-2 mt-auto pt-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="text-slate-500 dark:text-slate-400">Total Experience</span>
                                <span className="font-tabular text-slate-900 dark:text-white font-bold">{user.xp || 0} XP</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-200/80 dark:bg-white/[0.06] rounded-full overflow-hidden p-0.5">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-700 shadow-sm shadow-indigo-500/30"
                                    style={{ width: `${Math.min(100, Math.max(5, ((user.xp || 0) % 1000) / 10))}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics Trio (5 cols) */}
                    <div className="lg:col-span-5 grid grid-cols-3 gap-3">
                        <div className="glass-card p-4 sm:p-5 rounded-3xl flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <Award className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-black tracking-wider opacity-60">01</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Global Rank</div>
                                <div className="text-lg sm:text-2xl font-extrabold font-tabular text-slate-900 dark:text-white mt-0.5">
                                    #{user.rank || '-'}
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-4 sm:p-5 rounded-3xl flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <BarChart3 className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-black tracking-wider opacity-60">02</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Score</div>
                                <div className="text-lg sm:text-2xl font-extrabold font-tabular text-slate-900 dark:text-white mt-0.5">
                                    {user.totalScore || 0}
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-4 sm:p-5 rounded-3xl flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-black tracking-wider opacity-60">03</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quizzes</div>
                                <div className="text-lg sm:text-2xl font-extrabold font-tabular text-slate-900 dark:text-white mt-0.5">
                                    {user.totalAttempts || 0}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daily Streak & Live Multiplayer Action Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* Daily Streak Claim Card */}
                    <div
                        onClick={() => setIsStreakModalOpen(true)}
                        className="glass-card p-5 rounded-3xl flex items-center justify-between cursor-pointer group active:scale-[0.99] transition-all"
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 transition-transform group-hover:scale-105 ${
                                isStreakClaimedToday
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}>
                                {isStreakClaimedToday ? '✓' : '🔥'}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                        isStreakClaimedToday
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    }`}>
                                        {user.streak || 1} Day Streak
                                    </span>
                                    {isStreakClaimedToday ? (
                                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Claimed</span>
                                    ) : (
                                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 animate-pulse">Ready</span>
                                    )}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                                    Daily Streak Rewards
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {isStreakClaimedToday
                                        ? 'Reward claimed. Come back tomorrow!'
                                        : 'Claim daily XP bonus & mystery prizes.'}
                                </p>
                            </div>
                        </div>
                        <div className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                            isStreakClaimedToday
                                ? 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5'
                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                        }`}>
                            {isStreakClaimedToday ? 'Claimed' : 'Claim'}
                        </div>
                    </div>

                    {/* Live Classroom / Multiplayer Gamepad Card */}
                    <div
                        onClick={() => setIsLivePlayerOpen(true)}
                        className="glass-card p-5 rounded-3xl flex items-center justify-between cursor-pointer group active:scale-[0.99] transition-all"
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-105 transition-transform">
                                🎮
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                        Live Arena
                                    </span>
                                    <span className="text-[10px] font-medium text-indigo-500">6-Digit PIN</span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                                    Join Classroom Duel
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    Enter host game PIN to duel live in real-time.
                                </p>
                            </div>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-500/20 shrink-0 transition-all">
                            Join
                        </div>
                    </div>
                </div>

                {/* Clan Invites Banner */}
                {user.clanInvites && user.clanInvites.length > 0 && (
                    <div onClick={() => navigate('/clans')} className="mb-8 cursor-pointer relative overflow-hidden glass-card border border-indigo-500/30 rounded-3xl p-5 shadow-lg group">
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-500">
                                    <Bell className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clan Invitation</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                                        You have been invited to join <span className="text-indigo-500 font-semibold">{user.clanInvites[0].clanName}</span>.
                                    </p>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-sm">View</div>
                        </div>
                    </div>
                )}

                {/* Refresh Data Button */}
                {onRefreshData && (
                    <div className="mb-6 flex justify-end">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400 rounded-xl font-medium text-xs transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Syncing...' : 'Sync Data'}
                        </button>
                    </div>
                )}

                {!selectedSubjectId ? (
                    <>
                        {/* Subjects/Roads Selection */}
                        <div className="mb-12">
                            {/* Section Header with Segmented Filter Controls */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider select-none inline-flex items-center gap-1.5 ${
                                            isBento
                                                ? 'font-black bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] -rotate-1'
                                                : 'font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                        }`}>
                                            <Compass className="w-3.5 h-3.5" />
                                            ACADEMY PATHWAYS
                                        </span>
                                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                                            {subjects.length} Available Curriculums
                                        </span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                        Your Learning Roads
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
                                        Select an active curriculum to continue your progress, or submit an access request to unlock restricted tracks.
                                    </p>
                                </div>

                                {/* Tactile Filter Tabs */}
                                <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl self-start md:self-end ${
                                    isBento
                                        ? 'bg-slate-100 dark:bg-white/5 border-2 border-black shadow-[2.5px_2.5px_0px_#000]'
                                        : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => setRoadFilter('all')}
                                        className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                                            roadFilter === 'all'
                                                ? (isBento
                                                    ? 'font-black bg-[#ddd6fe] text-black border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'font-bold bg-purple-600 text-white shadow-sm')
                                                : 'font-bold text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                                        }`}
                                    >
                                        All Tracks ({subjects.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRoadFilter('unlocked')}
                                        className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                                            roadFilter === 'unlocked'
                                                ? (isBento
                                                    ? 'font-black bg-[#bef264] text-black border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'font-bold bg-emerald-600 text-white shadow-sm')
                                                : 'font-bold text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                                        }`}
                                    >
                                        ● Active ({unlockedCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRoadFilter('restricted')}
                                        className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                                            roadFilter === 'restricted'
                                                ? (isBento
                                                    ? 'font-black bg-[#fef08a] text-black border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                    : 'font-bold bg-amber-600 text-white shadow-sm')
                                                : 'font-bold text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                                        }`}
                                    >
                                        🔒 Restricted ({restrictedCount})
                                    </button>
                                </div>
                            </div>

                            {/* Road Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.isArray(displayedSubjects) && displayedSubjects.map((subject, index) => {
                                    const { progress, subjectQuizzes } = subjectProgressMap.get(subject._id) || { progress: 0, subjectQuizzes: [] };
                                    const isUnlocked = isRoadUnlocked(subject._id);
                                    const pendingRequest = myRequests.find(r => r.subjectId === subject._id && r.status === 'pending');
                                    const isPending = !!pendingRequest;
                                    const theme = getSubjectTheme(subject, index);

                                    if (!isUnlocked) {
                                        return (
                                            <div
                                                key={subject._id}
                                                onClick={() => setRequestingAccessSubject(subject)}
                                                className="learning-road-card restricted-road group cursor-pointer"
                                            >
                                                {/* Top Bar: Icon with lock pin + Restricted sticker */}
                                                <div>
                                                    <div className="flex items-start justify-between gap-3 mb-4">
                                                        <div className="relative">
                                                            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ${
                                                                isBento
                                                                    ? 'border-2 border-black shadow-[2.5px_2.5px_0px_#000]'
                                                                    : 'border border-slate-200 dark:border-white/10 shadow-sm'
                                                            }`}>
                                                                <SubjectIcon icon={subject.icon} />
                                                            </div>
                                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-xs ${
                                                                isBento
                                                                    ? 'bg-amber-400 text-black border-1.5 border-black'
                                                                    : 'bg-amber-500 text-white border border-white dark:border-[#13141f]'
                                                            }`}>
                                                                <Lock className="w-2.5 h-2.5" />
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                                                                isBento
                                                                    ? 'font-black bg-[#fef08a] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] -rotate-1'
                                                                    : 'font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                            }`}>
                                                                <Lock className="w-2.5 h-2.5" />
                                                                Restricted Track
                                                            </span>
                                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                                {theme.badgeText}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Title & Description — 100% Readable */}
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5 line-clamp-1">
                                                        {subject.title}
                                                    </h3>
                                                    <p className="text-slate-600 dark:text-slate-400 text-xs font-normal line-clamp-2 mb-4 leading-relaxed">
                                                        {subject.description || 'Specialized curriculum featuring progressive assessments, practice pools, and final certification.'}
                                                    </p>

                                                    {/* Highlights Pills */}
                                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                                                            🔒 {subjectQuizzes.length} Quizzes
                                                        </span>
                                                        {theme.highlights.slice(1).map((h, i) => (
                                                            <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                                                {h}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {/* Access Notice Callout */}
                                                    <div className="bg-amber-50/80 dark:bg-amber-950/20 border-2 border-dashed border-amber-300 dark:border-amber-600/40 rounded-xl p-3 mb-4">
                                                        <p className="text-[11px] font-medium text-amber-900 dark:text-amber-300 leading-snug">
                                                            Enrolled cohort track. Submit a request to your mentor to unlock this road.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Action Button */}
                                                <div className="pt-3 border-t border-slate-200/80 dark:border-white/10">
                                                    {isPending ? (
                                                        <div className={`w-full py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 ${
                                                            isBento
                                                                ? 'bg-[#fef08a] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20'
                                                        }`}>
                                                            <Clock className="w-3.5 h-3.5 animate-spin" />
                                                            <span>REQUEST PENDING REVIEW</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setRequestingAccessSubject(subject);
                                                            }}
                                                            className={`w-full py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                                isBento
                                                                    ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000]'
                                                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-purple-500/20 active:scale-95'
                                                            }`}
                                                        >
                                                            <Send className="w-3.5 h-3.5" />
                                                            <span>Request Track Access</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={subject._id}
                                            onClick={() => setSelectedSubjectId(subject._id)}
                                            className="learning-road-card unlocked-road group cursor-pointer"
                                        >
                                            {/* Top Bar: Icon Box + Category Pill & Active Badge */}
                                            <div>
                                                <div className="flex items-start justify-between gap-3 mb-4">
                                                    <div className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${theme.iconBg} group-hover:scale-105 transition-transform ${
                                                        isBento
                                                            ? 'border-2 border-black shadow-[2.5px_2.5px_0px_#000]'
                                                            : 'border border-slate-200 dark:border-white/10 shadow-sm'
                                                    }`}>
                                                        <SubjectIcon icon={subject.icon} />
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            {progress === 100 ? (
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                                                                    isBento
                                                                        ? 'font-black bg-[#fde047] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                                        : 'font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                                }`}>
                                                                    <CheckCircle className={`w-3 h-3 ${isBento ? 'text-black' : 'text-amber-500'}`} />
                                                                    Mastered
                                                                </span>
                                                            ) : (
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                                                                    isBento
                                                                        ? 'font-black bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                                                                        : 'font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                }`}>
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    Active Road
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                            {theme.badgeText}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Title & Description */}
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {subject.title}
                                                </h3>
                                                <p className="text-slate-600 dark:text-slate-400 text-xs font-normal line-clamp-2 mb-4 leading-relaxed">
                                                    {subject.description || 'Master this curriculum with interactive quizzes, practice pools, and accredited exams.'}
                                                </p>

                                                {/* Highlights Pills */}
                                                <div className="flex flex-wrap gap-1.5 mb-6">
                                                    {theme.highlights.map((h, i) => (
                                                        <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                                            {h}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Bottom Section: Progress & CTA */}
                                            <div className="pt-3 border-t border-slate-200/80 dark:border-white/10">
                                                <div className="flex items-center justify-between mb-2 text-xs">
                                                    <span className="font-bold text-slate-600 dark:text-slate-400">
                                                        {subjectQuizzes.length} Quizzes Available
                                                    </span>
                                                    <span className="font-black text-sm text-slate-900 dark:text-white font-tabular">
                                                        {progress}% Complete
                                                    </span>
                                                </div>

                                                {/* Chunky Progress Bar */}
                                                <div className={`w-full h-3 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mb-4 p-0.5 ${
                                                    isBento
                                                        ? 'border-2 border-black'
                                                        : 'border border-slate-200 dark:border-white/10'
                                                }`}>
                                                    <div
                                                        className={`h-full ${theme.progressFill} rounded-full transition-all duration-700`}
                                                        style={{ width: `${Math.max(4, progress)}%` }}
                                                    />
                                                </div>

                                                {/* Interactive Action Button */}
                                                <div className="flex items-center justify-between group-hover:translate-x-1 transition-transform">
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                                                        Continue Curriculum
                                                    </span>
                                                    <div className="w-7 h-7 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center transition-transform group-hover:rotate-45">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {(!Array.isArray(displayedSubjects) || displayedSubjects.length === 0) && (
                                    <div className="col-span-full py-16 text-center bg-white dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/10 p-8">
                                        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
                                        <h3 className="text-base font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">No tracks in this view</h3>
                                        <p className="text-slate-400 text-xs mt-1 mb-4">You have filtered out all current curriculums.</p>
                                        <button
                                            type="button"
                                            onClick={() => setRoadFilter('all')}
                                            className={`px-4 py-2 rounded-xl text-xs cursor-pointer ${
                                                isBento
                                                    ? 'bg-[#fde047] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                    : 'bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-500/20 active:scale-95'
                                            }`}
                                        >
                                            Show All Tracks
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Road Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedSubjectId(null)}
                                    className="w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-slate-700 dark:text-slate-300 active:scale-95 cursor-pointer"
                                    title="Back to Learning Roads"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">Active Road</span>
                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">/ Curriculum</span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{activeSubject?.title}</h2>
                                </div>
                            </div>

                            {activeTab === 'quizzes' && (
                                <div className="relative group min-w-[260px] sm:min-w-[300px]">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search quizzes in this road..."
                                        className="w-full pl-10 pr-4 py-2.5 glass-card rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Road Navigation Tabs */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl mb-8 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'overview', label: 'Overview', icon: <BookOpen className="w-4 h-4" /> },
                                { id: 'roadmap', label: 'Roadmap', icon: <Brain className="w-4 h-4" /> },
                                { id: 'quizzes', label: 'Quizzes', icon: <Award className="w-4 h-4" /> },
                                { id: 'exams', label: 'Exams', icon: <Clipboard className="w-4 h-4" /> },
                                { id: 'study-cards', label: 'Study Cards', icon: <FileText className="w-4 h-4" /> },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as SubjectTab)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer active:scale-95 ${activeTab === tab.id
                                        ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm shadow-indigo-600/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[400px]">
                            {activeTab === 'overview' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                    <div className="xl:col-span-2 space-y-6">
                                        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5">
                                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Target className="w-5 h-5 text-indigo-500" />
                                                    <h3 className="text-xl font-black uppercase">About this Road</h3>
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500">{filteredQuizzes.length} Quizzes</span>
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500">{subjectAttempts.length} Attempts</span>
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500">Best {bestOverallScore || 0}%</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                                {activeSubject?.description || 'This learning road is designed to guide you through mastering the subject with curated materials and assessments.'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5">
                                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Completion</div>
                                                <div className="text-4xl font-black text-indigo-500 mb-4">{subjectProgress}%</div>
                                                <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
                                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${subjectProgress}%` }} />
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                                                    {totalAnsweredQuestions} / {totalQuestionsInRoad} Qs ({totalRemainingQuestions} remaining)
                                                </div>
                                            </div>
                                            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5">
                                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Completed Quizzes</div>
                                                <div className="text-4xl font-black text-emerald-500 mb-1">{completedQuizzesCount} / {filteredQuizzes.length}</div>
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                                                    {inProgressQuizzesCount > 0 ? `${inProgressQuizzesCount} in progress` : 'Mastered in this road'}
                                                </div>
                                            </div>
                                            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5">
                                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Questions</div>
                                                <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{totalQuestionsInRoad}</div>
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                                                    {totalRemainingQuestions > 0 ? `${totalRemainingQuestions} remaining across road` : 'All questions finished!'}
                                                </div>
                                            </div>
                                        </div>

                                        {moduleMilestones.length > 0 && (
                                            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-2">
                                                        <Brain className="w-5 h-5 text-indigo-500" />
                                                        <h4 className="text-lg font-black uppercase">Road Milestones</h4>
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{moduleMilestones.length} modules</span>
                                                </div>
                                                <div className="space-y-4">
                                                    {moduleMilestones.slice(0, 6).map((milestone) => (
                                                        <div key={milestone.index} className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black uppercase shrink-0 ${milestone.status === 'done'
                                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                                : milestone.status === 'current'
                                                                    ? 'bg-indigo-500/10 text-indigo-500'
                                                                    : 'bg-gray-200/60 dark:bg-white/5 text-gray-500'
                                                                }`}>
                                                                {milestone.status === 'done' ? <CheckCircle className="w-5 h-5" /> : milestone.index + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">{milestone.title}</p>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">{milestone.status === 'done' ? 'Done' : milestone.status === 'current' ? 'In Progress' : 'Locked'}</span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mt-2">
                                                                    <div className={`h-full ${milestone.status === 'done'
                                                                        ? 'bg-emerald-500'
                                                                        : milestone.status === 'current'
                                                                            ? 'bg-indigo-500'
                                                                            : 'bg-gray-400/40'
                                                                        }`} style={{ width: `${milestone.status === 'done' ? 100 : milestone.status === 'current' ? 45 : 0}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-500/20">
                                            {(() => {
                                                const nextPoolStatus = nextQuiz ? getQuizPoolStatus(nextQuiz, attempts) : null;
                                                const isNextInProgress = nextPoolStatus?.isPool && nextPoolStatus.hasStarted && !nextPoolStatus.isFullyCompleted;

                                                return (
                                                    <>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <Zap className="w-10 h-10 bg-white/20 p-2 rounded-xl" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                                                                {isNextInProgress ? `In Progress • ${nextPoolStatus.percentage}%` : 'Next step'}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-lg font-black mb-2 uppercase">{nextQuiz ? nextQuiz.title : 'No quiz available'}</h4>
                                                        <p className="text-white/80 text-sm font-medium mb-6 line-clamp-3">{nextQuiz?.description || 'Pick any quiz to keep moving forward and build your streak.'}</p>
                                                        <div className="flex flex-col gap-3">
                                                            <button
                                                                onClick={() => nextQuiz && !isQuizLocked(nextQuiz) ? onSelectQuiz(nextQuiz) : setActiveTab('quizzes')}
                                                                className="w-full py-4 bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform"
                                                                disabled={!nextQuiz}
                                                            >
                                                                {nextQuiz && !isQuizLocked(nextQuiz)
                                                                    ? (isNextInProgress
                                                                        ? `Complete Remaining (${nextPoolStatus?.remainingCount} Left)`
                                                                        : 'Start Next Quiz')
                                                                    : 'View Quizzes'}
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveTab('roadmap')}
                                                                className="w-full py-3 bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/20 hover:bg-white/15 transition-colors"
                                                            >
                                                                View Roadmap
                                                            </button>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/20 dark:border-white/5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Award className="w-5 h-5 text-indigo-500" />
                                                    <h5 className="text-sm font-black uppercase">Road Insights</h5>
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[{
                                                    label: 'Attempts',
                                                    value: subjectAttempts.length,
                                                    accent: 'text-blue-500',
                                                }, {
                                                    label: 'Best Score',
                                                    value: `${bestOverallScore || 0}%`,
                                                    accent: 'text-emerald-500',
                                                }, {
                                                    label: 'Locked',
                                                    value: filteredQuizzes.filter(q => isQuizLocked(q)).length,
                                                    accent: 'text-orange-500',
                                                }].map((item) => (
                                                    <div key={item.label} className="bg-white dark:bg-white/5 rounded-2xl p-3 text-center border border-white/30 dark:border-white/10">
                                                        <div className={`text-xl font-black ${item.accent}`}>{item.value}</div>
                                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/20 dark:border-white/5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <LayoutGrid className="w-5 h-5 text-indigo-500" />
                                                <h5 className="text-sm font-black uppercase">Quick Actions</h5>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => setActiveTab('quizzes')} className="px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-500/15">Quizzes</button>
                                                <button onClick={() => setActiveTab('roadmap')} className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500/15">Roadmap</button>
                                                <button onClick={() => setActiveTab('study-cards')} className="px-4 py-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-widest border border-orange-500/20 hover:bg-orange-500/15">Study Cards</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {activeTab === 'roadmap' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <UserRoadmapView
                                        modules={activeTrackDefinition?.modules || []}
                                        quizzes={quizzes}
                                        attempts={attempts}
                                        onStartQuiz={onSelectQuiz}
                                        userProgress={(() => {
                                            const def = skillTracks.find(t => t.subjectId === selectedSubjectId || t.trackId === selectedSubjectId);
                                            return def ? user.skillTracks?.find(p => p.trackId === def.trackId) : undefined;
                                        })()}
                                        onSubModuleComplete={async (moduleId: string, subModuleId: string) => {
                                            if (!activeTrackDefinition?.trackId) return;
                                            try {
                                                await api.completeSubModule(activeTrackDefinition.trackId, moduleId, subModuleId, user.userId);
                                                showNotification('success', 'Sub-module completed! 🎉');
                                                if (onRefreshData) onRefreshData().catch(console.error);
                                            } catch (error) {
                                                console.error('Failed to complete sub-module:', error);
                                                showNotification('error', 'Failed to save progress');
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {activeTab === 'quizzes' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {regularQuizzes.map((quiz) => {
                                        const quizId = getQuizId(quiz);
                                        const poolStatus = getQuizPoolStatus(quiz, attempts);
                                        const bestScore = getBestScore(quizId);
                                        const attempted = hasAttempted(quizId);
                                        const locked = isQuizLocked(quiz);

                                        const glowGradient = poolStatus.isPool
                                            ? poolStatus.isFullyCompleted
                                                ? 'from-emerald-500 to-teal-500'
                                                : poolStatus.hasStarted
                                                    ? 'from-blue-500 via-indigo-500 to-purple-500'
                                                    : 'from-indigo-500 to-purple-500'
                                            : attempted
                                                ? 'from-emerald-500 to-teal-500'
                                                : 'from-indigo-500 to-purple-500';

                                        return (
                                            <div
                                                key={quizId}
                                                onClick={() => !locked && onSelectQuiz(quiz)}
                                                className={`group relative min-h-[380px] ${!locked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                            >
                                                <div className={`absolute -inset-0.5 bg-gradient-to-br ${glowGradient} rounded-[2.5rem] ${locked ? 'opacity-0' : 'opacity-0 group-hover:opacity-20'} blur-xl transition-all duration-500`} />

                                                <div className={`relative h-full rounded-[2.5rem] p-8 flex flex-col transition-all duration-300 ${
                                                    isBento
                                                        ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000] hover:shadow-[7px_7px_0px_#000]'
                                                        : 'bg-white dark:bg-[#11111a] border border-gray-200 dark:border-white/5'
                                                } ${locked ? 'opacity-50 blur-sm' : 'group-hover:-translate-y-2'}`}>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className={`transition-transform duration-500 ${
                                                            isBento
                                                                ? 'w-14 h-14 rounded-2xl bg-[#bef264] text-black border-2.5 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center shrink-0'
                                                                : 'text-5xl text-indigo-500'
                                                        } ${locked ? '' : 'group-hover:scale-110'}`}>
                                                            {(() => {
                                                                const IconComponent = getQuizIconOption(quiz.icon).Icon;
                                                                return <IconComponent className={isBento ? "w-8 h-8 stroke-[2.5]" : "w-12 h-12"} />;
                                                            })()}
                                                        </div>
                                                        {locked ? (
                                                            <div className={`p-2 rounded-xl ${
                                                                isBento
                                                                    ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                    : 'bg-red-500/10 text-red-500'
                                                            }`}>
                                                                <Lock className="w-5 h-5" />
                                                            </div>
                                                        ) : poolStatus.isPool ? (
                                                            poolStatus.isFullyCompleted ? (
                                                                <div className={`p-2 rounded-xl ${
                                                                    isBento
                                                                        ? 'bg-[#d9f99d] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                        : 'bg-emerald-500/10 text-emerald-500'
                                                                }`} title="Pool Completed">
                                                                    <CheckCircle className="w-5 h-5" />
                                                                </div>
                                                            ) : poolStatus.hasStarted ? (
                                                                <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider flex items-center gap-1.5 ${
                                                                    isBento
                                                                        ? 'bg-[#93c5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm'
                                                                }`}>
                                                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                                    <span>{poolStatus.percentage}%</span>
                                                                </div>
                                                            ) : null
                                                        ) : attempted ? (
                                                            <div className={`p-2 rounded-xl ${
                                                                isBento
                                                                    ? 'bg-[#d9f99d] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                                                                    : 'bg-emerald-500/10 text-emerald-500'
                                                            }`}>
                                                                <CheckCircle className="w-5 h-5" />
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    <div className="flex-grow">
                                                        <h3 className={`text-xl font-black ${locked ? 'text-gray-500 dark:text-gray-600' : 'text-gray-900 dark:text-white'} mb-2 ${locked ? '' : 'group-hover:text-indigo-500'} transition-colors`}>
                                                            {quiz.title}
                                                        </h3>
                                                        <p className={`${locked ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'} text-xs font-medium leading-relaxed line-clamp-2 mb-6`}>
                                                            {quiz.description}
                                                        </p>

                                                        <div className="flex flex-wrap gap-2 mb-6">
                                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getDifficultyBadgeBg(quiz.difficulty)}`}>
                                                                {quiz.difficulty}
                                                            </span>
                                                            {poolStatus.isPool ? (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                                                    <span>📦</span> {poolStatus.totalQuestions} Pool ({poolStatus.questionsPerAttempt}/att)
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/10">
                                                                    {quiz.questions?.length || 0} Qs
                                                                </span>
                                                            )}
                                                            {poolStatus.isPool && poolStatus.cycle > 0 && (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                                                    Cycle {poolStatus.cycle + 1}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Pool Progress Section */}
                                                        {!locked && poolStatus.isPool && (poolStatus.hasStarted || attempted) && (
                                                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 mb-4">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs">📦</span>
                                                                        <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                                                            Pool Progress
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                                                            {poolStatus.seenCount}/{poolStatus.totalQuestions} ({poolStatus.percentage}%)
                                                                        </span>
                                                                        {poolStatus.remainingCount > 0 ? (
                                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                                                                {poolStatus.remainingCount} Remaining
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                                Completed
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Progress Bar Track */}
                                                                <div className="w-full h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-2.5">
                                                                    <div
                                                                        className={`h-full transition-all duration-700 rounded-full ${
                                                                            poolStatus.isFullyCompleted
                                                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                                                                : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'
                                                                        }`}
                                                                        style={{ width: `${poolStatus.percentage}%` }}
                                                                    />
                                                                </div>

                                                                {/* Score & Remaining footnote */}
                                                                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500">
                                                                    <span>
                                                                        {poolStatus.remainingCount > 0
                                                                            ? `${poolStatus.remainingCount} questions left in this cycle`
                                                                            : 'All questions in pool completed!'}
                                                                    </span>
                                                                    {bestScore !== null && (
                                                                        <span className="text-emerald-500 font-black flex items-center gap-1">
                                                                            <Target className="w-3.5 h-3.5" /> Best: {bestScore}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Non-Pool Best Score Box */}
                                                        {!locked && !poolStatus.isPool && attempted && (
                                                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between mb-4 border border-gray-100 dark:border-white/5">
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Best Score</div>
                                                                    <div className="text-xl font-black text-emerald-500">{bestScore}%</div>
                                                                </div>
                                                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                                    <Target className="w-5 h-5 text-emerald-500" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {locked && (
                                                            <div className="p-4 bg-red-500/5 dark:bg-red-500/10 rounded-2xl flex items-center justify-between mb-4 border border-red-500/20">
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Locked</div>
                                                                    <div className="text-sm font-black text-red-600 dark:text-red-400">Complete roadmap</div>
                                                                </div>
                                                                <Lock className="w-5 h-5 text-red-500/50" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-auto">
                                                        <button
                                                            disabled={locked}
                                                            onClick={(e) => {
                                                                if (!locked) {
                                                                    e.stopPropagation();
                                                                    onSelectQuiz(quiz);
                                                                }
                                                            }}
                                                            className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${
                                                                locked
                                                                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                                                                    : poolStatus.isPool
                                                                        ? poolStatus.hasStarted && !poolStatus.isFullyCompleted
                                                                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                                                                            : poolStatus.isFullyCompleted
                                                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500'
                                                                                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500'
                                                                        : attempted
                                                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500'
                                                                            : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500'
                                                            }`}
                                                        >
                                                            {locked ? (
                                                                <><Lock className="w-4 h-4" /> Locked</>
                                                            ) : poolStatus.isPool ? (
                                                                poolStatus.hasStarted && !poolStatus.isFullyCompleted ? (
                                                                    <><Play className="w-4 h-4 fill-white" /> Complete Remaining ({poolStatus.remainingCount} Left)</>
                                                                ) : poolStatus.isFullyCompleted ? (
                                                                    <><RefreshCw className="w-4 h-4" /> Retake (Start Next Cycle)</>
                                                                ) : (
                                                                    <><Play className="w-4 h-4 fill-white" /> Start Pool</>
                                                                )
                                                            ) : attempted ? (
                                                                <><RefreshCw className="w-4 h-4" /> Retake</>
                                                            ) : (
                                                                <><Play className="w-4 h-4 fill-white" /> Start</>
                                                            )}
                                                        </button>

                                                        {!locked && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setLiveHostQuiz(quiz);
                                                                    }}
                                                                    className="px-3.5 py-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0 cursor-pointer"
                                                                    title="Host a Live Classroom Arena game for this quiz"
                                                                >
                                                                    🎮
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        showNotification('info', 'Generating Study PDF...');
                                                                        await exportQuizToPDF(quiz);
                                                                        showNotification('success', 'Study PDF downloaded!');
                                                                    }}
                                                                    className="p-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 rounded-2xl transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                                                                    title="Export PDF Study Sheet"
                                                                >
                                                                    <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {regularQuizzes.length === 0 && (
                                        <div className="col-span-full py-20 text-center">
                                            <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No quizzes found for this road</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'exams' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {examQuizzes.map((quiz) => {
                                        const quizId = getQuizId(quiz);
                                        const poolStatus = getQuizPoolStatus(quiz, attempts);
                                        const bestScore = getBestScore(quizId);
                                        const attempted = hasAttempted(quizId);
                                        const locked = isQuizLocked(quiz);

                                        const glowGradient = poolStatus.isPool
                                            ? poolStatus.isFullyCompleted
                                                ? 'from-emerald-500 to-teal-500'
                                                : poolStatus.hasStarted
                                                    ? 'from-orange-500 via-red-500 to-pink-500'
                                                    : 'from-red-500 to-pink-500'
                                            : attempted
                                                ? 'from-orange-500 to-red-500'
                                                : 'from-red-500 to-pink-500';

                                        return (
                                            <div
                                                key={quizId}
                                                onClick={() => !locked && onSelectQuiz(quiz)}
                                                className={`group relative min-h-[380px] ${!locked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                            >
                                                <div className={`absolute -inset-0.5 bg-gradient-to-br ${glowGradient} rounded-[2.5rem] ${locked ? 'opacity-0' : 'opacity-0 group-hover:opacity-20'} blur-xl transition-all duration-500`} />

                                                <div className={`relative h-full bg-white dark:bg-[#11111a] rounded-[2.5rem] border border-gray-200 dark:border-white/5 p-8 flex flex-col ${locked ? 'opacity-50 blur-sm' : 'group-hover:-translate-y-2'} transition-all duration-300`}>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className={`text-5xl text-orange-500 ${locked ? '' : 'group-hover:scale-110'} transition-transform duration-500`}>
                                                            {(() => {
                                                                const IconComponent = getQuizIconOption(quiz.icon).Icon;
                                                                return <IconComponent className="w-12 h-12" />;
                                                            })()}
                                                        </div>
                                                        {locked ? (
                                                            <div className="bg-red-500/10 text-red-500 p-2 rounded-xl">
                                                                <Lock className="w-5 h-5" />
                                                            </div>
                                                        ) : poolStatus.isPool ? (
                                                            poolStatus.isFullyCompleted ? (
                                                                <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl" title="Exam Pool Completed">
                                                                    <CheckCircle className="w-5 h-5" />
                                                                </div>
                                                            ) : poolStatus.hasStarted ? (
                                                                <div className="bg-orange-500/10 text-orange-500 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider border border-orange-500/20 flex items-center gap-1.5 shadow-sm">
                                                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                                                    <span>{poolStatus.percentage}%</span>
                                                                </div>
                                                            ) : null
                                                        ) : attempted ? (
                                                            <div className="bg-orange-500/10 text-orange-500 p-2 rounded-xl">
                                                                <CheckCircle className="w-5 h-5" />
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    <div className="flex-grow">
                                                        <h3 className={`text-xl font-black ${locked ? 'text-gray-500 dark:text-gray-600' : 'text-gray-900 dark:text-white'} mb-2 ${locked ? '' : 'group-hover:text-red-500'} transition-colors`}>
                                                            {quiz.title}
                                                        </h3>
                                                        <p className={`${locked ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'} text-xs font-medium leading-relaxed line-clamp-2 mb-6`}>
                                                            {quiz.description}
                                                        </p>

                                                        <div className="flex flex-wrap gap-2 mb-6">
                                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getDifficultyBadgeBg(quiz.difficulty)}`}>
                                                                {quiz.difficulty}
                                                            </span>
                                                            {poolStatus.isPool ? (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center gap-1">
                                                                    <span>📦</span> {poolStatus.totalQuestions} Pool ({poolStatus.questionsPerAttempt}/att)
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/10">
                                                                    {quiz.questions?.length || 0} Qs
                                                                </span>
                                                            )}
                                                            {poolStatus.isPool && poolStatus.cycle > 0 && (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                                                    Cycle {poolStatus.cycle + 1}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Pool Progress Section for Exams */}
                                                        {!locked && poolStatus.isPool && (poolStatus.hasStarted || attempted) && (
                                                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 mb-4">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs">📦</span>
                                                                        <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                                                            Pool Progress
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                                                                            {poolStatus.seenCount}/{poolStatus.totalQuestions} ({poolStatus.percentage}%)
                                                                        </span>
                                                                        {poolStatus.remainingCount > 0 ? (
                                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                                                                {poolStatus.remainingCount} Remaining
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                                Completed
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Progress Bar Track */}
                                                                <div className="w-full h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-2.5">
                                                                    <div
                                                                        className={`h-full transition-all duration-700 rounded-full ${
                                                                            poolStatus.isFullyCompleted
                                                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                                                                : 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500'
                                                                        }`}
                                                                        style={{ width: `${poolStatus.percentage}%` }}
                                                                    />
                                                                </div>

                                                                {/* Score & Remaining footnote */}
                                                                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500">
                                                                    <span>
                                                                        {poolStatus.remainingCount > 0
                                                                            ? `${poolStatus.remainingCount} questions left in this cycle`
                                                                            : 'All exam questions completed!'}
                                                                    </span>
                                                                    {bestScore !== null && (
                                                                        <span className="text-orange-500 font-black flex items-center gap-1">
                                                                            <Target className="w-3.5 h-3.5" /> Best: {bestScore}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Non-Pool Exam Best Score */}
                                                        {!locked && !poolStatus.isPool && attempted && (
                                                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between mb-4 border border-gray-100 dark:border-white/5">
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Best Score</div>
                                                                    <div className="text-xl font-black text-orange-500">{bestScore}%</div>
                                                                </div>
                                                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                                                    <Target className="w-5 h-5 text-orange-500" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {locked && (
                                                            <div className="p-4 bg-red-500/5 dark:bg-red-500/10 rounded-2xl flex items-center justify-between mb-4 border border-red-500/20">
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Locked</div>
                                                                    <div className="text-sm font-black text-red-600 dark:text-red-400">Complete roadmap</div>
                                                                </div>
                                                                <Lock className="w-5 h-5 text-red-500/50" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-auto">
                                                        <button
                                                            disabled={locked}
                                                            onClick={(e) => {
                                                                if (!locked) {
                                                                    e.stopPropagation();
                                                                    onSelectQuiz(quiz);
                                                                }
                                                            }}
                                                            className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${
                                                                locked
                                                                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                                                                    : poolStatus.isPool
                                                                        ? poolStatus.hasStarted && !poolStatus.isFullyCompleted
                                                                            ? 'bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 hover:from-orange-500 hover:to-pink-500 text-white shadow-lg shadow-orange-500/25'
                                                                            : poolStatus.isFullyCompleted
                                                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500'
                                                                                : 'bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-500'
                                                                        : attempted
                                                                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-500'
                                                                            : 'bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-500'
                                                            }`}
                                                        >
                                                            {locked ? (
                                                                <><Lock className="w-4 h-4" /> Locked</>
                                                            ) : poolStatus.isPool ? (
                                                                poolStatus.hasStarted && !poolStatus.isFullyCompleted ? (
                                                                    <><Play className="w-4 h-4 fill-white" /> Complete Remaining ({poolStatus.remainingCount} Left)</>
                                                                ) : poolStatus.isFullyCompleted ? (
                                                                    <><RefreshCw className="w-4 h-4" /> Retake (Start Next Cycle)</>
                                                                ) : (
                                                                    <><Play className="w-4 h-4 fill-white" /> Start Exam Pool</>
                                                                )
                                                            ) : attempted ? (
                                                                <><RefreshCw className="w-4 h-4" /> Retake</>
                                                            ) : (
                                                                <><Play className="w-4 h-4 fill-white" /> Start</>
                                                            )}
                                                        </button>

                                                        {!locked && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setLiveHostQuiz(quiz);
                                                                    }}
                                                                    className="px-3.5 py-4 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0 cursor-pointer"
                                                                    title="Host a Live Classroom Arena game for this exam"
                                                                >
                                                                    🎮
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        showNotification('info', 'Generating Study PDF...');
                                                                        await exportQuizToPDF(quiz);
                                                                        showNotification('success', 'Study PDF downloaded!');
                                                                    }}
                                                                    className="p-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 rounded-2xl transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                                                                    title="Export PDF Study Sheet"
                                                                >
                                                                    <FileText className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {examQuizzes.length === 0 && (
                                        <div className="col-span-full py-20 text-center">
                                            <Clipboard className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No exams available for this road</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'study-cards' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                    {(() => {
                                        const cardsForRoad = (studyCards || []).filter(c => c.subjectId === selectedSubjectId);
                                        const moduleMap: Record<string, StudyCard[]> = {};
                                        for (const c of cardsForRoad) {
                                            const key = c.moduleId || 'general';
                                            if (!moduleMap[key]) moduleMap[key] = [];
                                            moduleMap[key].push(c);
                                        }

                                        const renderStacks = (cards: StudyCard[]) => {
                                            const stacks = Array.from(new Set(cards.map(c => c.category || 'Uncategorized')));
                                            return (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {stacks.map(stack => {
                                                        const stackCards = cards.filter(c => (c.category || 'Uncategorized') === stack);
                                                        return (
                                                            <div key={stack} className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/20 dark:border-white/5">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h4 className="text-lg font-black text-gray-900 dark:text-white">{stack}</h4>
                                                                    <span className="text-xs font-black text-gray-500 dark:text-gray-400">{stackCards.length} cards</span>
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {stackCards.map(card => (
                                                                        <div key={card.id} className="p-4 rounded-xl bg-white/60 dark:bg-white/10 border border-white/20 dark:border-white/5">
                                                                            <h5 className="text-base font-bold text-gray-900 dark:text-white">{card.title}</h5>
                                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">{card.content}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        };

                                        const moduleOrder = Object.keys(moduleMap);
                                        return moduleOrder.length === 0 ? (
                                            <div className="py-20 text-center bg-white/40 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-white/10">
                                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                <h3 className="text-xl font-black text-gray-400 uppercase">No study cards</h3>
                                                <p className="text-gray-500 font-medium">Coming soon! Quick-review cards for this subject.</p>
                                            </div>
                                        ) : (
                                            moduleOrder.map(moduleId => {
                                                const isGeneral = moduleId === 'general';
                                                const moduleTitle = isGeneral ? 'General' : (() => {
                                                    const allTracks = (skillTracks || []).filter(t => t.subjectId === selectedSubjectId);
                                                    for (const t of allTracks) {
                                                        const m = (t.modules || []).find(mm => mm.moduleId === moduleId);
                                                        if (m) return m.title;
                                                    }
                                                    return 'Module';
                                                })();
                                                return (
                                                    <div key={moduleId} className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <FileText className="w-4 h-4 text-indigo-500" />
                                                            <h3 className="text-xl font-black text-gray-900 dark:text-white">{moduleTitle}</h3>
                                                        </div>
                                                        {renderStacks(moduleMap[moduleId])}
                                                    </div>
                                                );
                                            })
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Initial Track Selection Onboarding Modal */}
            {isInitialTrackSelectionNeeded && (
                <InitialTrackSelectionModal
                    subjects={subjects}
                    quizzes={quizzes}
                    currentUser={user}
                    onSuccess={(updated) => {
                        updateUser(updated);
                        if (onRefreshData) onRefreshData();
                    }}
                    onNotification={showNotification}
                />
            )}

            {/* Request Track Access Modal */}
            {requestingAccessSubject && (
                <RequestTrackAccessModal
                    subject={requestingAccessSubject}
                    existingRequest={myRequests.find(r => r.subjectId === requestingAccessSubject._id)}
                    onClose={() => setRequestingAccessSubject(null)}
                    onSuccess={(newReq) => {
                        setMyRequests(prev => [newReq, ...prev.filter(r => r.requestId !== newReq.requestId)]);
                    }}
                    onNotification={showNotification}
                />
            )}

            {/* Streak Reward Modal */}
            {isStreakModalOpen && (
                <StreakRewardModal
                    isOpen={isStreakModalOpen}
                    user={user}
                    onClose={() => setIsStreakModalOpen(false)}
                    onClaimStreak={(rewards) => {
                        showNotification('success', `Claimed: ${rewards.coins ? `+${rewards.coins} Coins ` : ''}${rewards.xp ? `+${rewards.xp} XP` : ''}`);
                        if (onRefreshData) onRefreshData();
                    }}
                />
            )}

            {/* Live Player Mobile Controller */}
            {isLivePlayerOpen && (
                <LivePlayerController
                    onClose={() => setIsLivePlayerOpen(false)}
                    onBack={() => setIsLivePlayerOpen(false)}
                />
            )}

            {/* Live Host Mode */}
            {liveHostQuiz && (
                <LiveHostMode
                    quiz={liveHostQuiz}
                    onClose={() => setLiveHostQuiz(null)}
                />
            )}
        </div>
    );
};

export default UserRoads;
