import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Quiz, UserData, AttemptData, Subject } from '../types/index.ts';
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
    Lock
} from 'lucide-react';
import Navbar from './Navbar.tsx';
import UserRoadmapView from './UserRoadmapView';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

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
};

const SubjectIcon: React.FC<{ icon: string }> = ({ icon }) => {
    if (ICON_MAP[icon]) {
        return <div className="text-indigo-500">{ICON_MAP[icon]}</div>;
    }
    // Return as emoji if not in map
    return <>{icon || '📚'}</>;
};

interface UserRoadsProps {
    quizzes: Quiz[];
    subjects: Subject[];
    user: UserData;
    attempts: AttemptData[];
    skillTracks: any[];
    studyCards: any[];
    onSelectQuiz: (quiz: Quiz) => void;
    onViewProfile: () => void;
    onViewLeaderboard: () => void;
    onLogout: () => void;
    onRefreshData?: () => Promise<void>;
}

type SubjectTab = 'overview' | 'roadmap' | 'quizzes' | 'study-cards';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<SubjectTab>('quizzes');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Defensive normalization to avoid crashes if API returns unexpected shapes
    const quizzes = Array.isArray(quizzesProp) ? quizzesProp : [];
    const subjects = Array.isArray(subjectsProp) ? subjectsProp : [];
    const attempts = Array.isArray(attemptsProp) ? attemptsProp : [];
    const skillTracks = Array.isArray(skillTracksProp) ? skillTracksProp : [];
    const studyCards = Array.isArray(studyCardsProp) ? studyCardsProp : [];

    const activeSubject = subjects.find(s => s._id === selectedSubjectId);
    const searchValue = searchTerm.toLowerCase();

    const filteredQuizzes = quizzes.filter(quiz => {
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

    const getDifficultyBadgeBg = (difficulty: string | undefined) => {
        const key = typeof difficulty === 'string' ? difficulty.toLowerCase() : 'default';
        return DIFFICULTY_COLORS[key] || DIFFICULTY_COLORS.default;
    };

    const getQuizId = (quiz: Quiz) => quiz.id || quiz._id || '';
    const getQuizAttempts = (quizId: string) => attempts.filter(a => a.quizId === quizId);
    const getBestScore = (quizId: string) => {
        const qa = getQuizAttempts(quizId);
        return qa.length === 0 ? null : Math.max(...qa.map(a => a.percentage));
    };
    const hasAttempted = (quizId: string) => getQuizAttempts(quizId).length > 0;

    // Check if quiz is locked based on roadmap progress
    const isQuizLocked = (quiz: Quiz) => {
        const quizId = getQuizId(quiz);

        // Find the skill track for this subject (check subjectId first, then trackId)
        const skillTrack = skillTracks.find((track: any) =>
            track.subjectId === selectedSubjectId ||
            track.trackId === selectedSubjectId
        );

        if (!skillTrack || !skillTrack.modules) {
            // No skill track data - only first quiz is unlocked
            const firstQuiz = filteredQuizzes[0];
            return firstQuiz ? getQuizId(firstQuiz) !== quizId : false;
        }

        // Get user's progress for this specific track
        const userProgress = user.skillTracks?.find((t: any) => t.trackId === skillTrack.trackId);

        if (!userProgress) {
            // No progress data - only first quiz is unlocked
            const firstQuiz = filteredQuizzes[0];
            return firstQuiz ? getQuizId(firstQuiz) !== quizId : false;
        }

        // Check if this quiz is in any completed or unlocked modules
        const completedModules = userProgress.completedModules || [];
        const unlockedModules = userProgress.unlockedModules || [];

        // Find which module this quiz belongs to by matching quiz ID
        const moduleWithThisQuiz = skillTrack.modules.find((module: any) => {
            if (!module.quizIds || module.quizIds.length === 0) return false;
            // Check multiple ID formats to be safe
            return module.quizIds.some((qId: string) =>
                qId === quizId ||
                qId === quiz.id ||
                qId === quiz._id ||
                quiz.id?.includes(qId) ||
                qId?.includes(quiz.id || '')
            );
        });

        if (!moduleWithThisQuiz) {
            // Quiz doesn't belong to any module - it's available
            return false;
        }

        // Check if the module is completed or unlocked
        const isUnlockedOrCompleted =
            completedModules.includes(moduleWithThisQuiz.moduleId) ||
            unlockedModules.includes(moduleWithThisQuiz.moduleId);

        // Return true if locked (NOT unlocked or completed)
        return !isUnlockedOrCompleted;
    };

    const getSubjectProgress = (subjectId: string) => {
        const subjectQuizzes = quizzes.filter(q => q.subjectId === subjectId);
        if (subjectQuizzes.length === 0) return 0;
        const completedCount = subjectQuizzes.filter(q => hasAttempted(getQuizId(q))).length;
        return Math.round((completedCount / subjectQuizzes.length) * 100);
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

    const subjectProgress = selectedSubjectId ? getSubjectProgress(selectedSubjectId) : 0;
    const subjectQuizIds = new Set(filteredQuizzes.map(q => getQuizId(q)));
    const subjectAttempts = attempts.filter(a => subjectQuizIds.has(a.quizId));
    const completedQuizzesCount = filteredQuizzes.filter(q => hasAttempted(getQuizId(q))).length;
    const bestOverallScore = filteredQuizzes.reduce((max, quiz) => {
        const score = getBestScore(getQuizId(quiz));
        return score !== null && score > max ? score : max;
    }, 0);
    const nextQuiz = filteredQuizzes.find(q => !hasAttempted(getQuizId(q)) && !isQuizLocked(q)) ||
        filteredQuizzes.find(q => !isQuizLocked(q)) ||
        filteredQuizzes[0];

    const activeTrackDefinition = selectedSubjectId
        ? skillTracks.find((track: any) => track.subjectId === selectedSubjectId || track.trackId === selectedSubjectId)
        : null;
    const userTrackProgress = activeTrackDefinition
        ? user.skillTracks?.find((p: any) => p.trackId === activeTrackDefinition.trackId)
        : undefined;
    const completedModules = new Set(userTrackProgress?.completedModules || []);
    const moduleMilestones: Milestone[] = (activeTrackDefinition?.modules || []).map((module: any, index: number) => {
        const title = module.title || module.name || `Module ${index + 1}`;
        const moduleId = module.moduleId || module.id || title;
        const isDone = completedModules.has(moduleId);
        const prevModule = activeTrackDefinition?.modules?.[index - 1] as any;
        const prevModuleId = prevModule?.moduleId || prevModule?.id || null;
        const prevDone = index === 0 ? true : (prevModuleId ? completedModules.has(prevModuleId) : true);
        const status: 'done' | 'current' | 'locked' = isDone ? 'done' : prevDone ? 'current' : 'locked';
        return { title, status, index };
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] text-gray-900 dark:text-white selection:bg-indigo-500/30">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse delay-1000" />
            </div>

            <Navbar
                user={user}
                onViewProfile={onViewProfile}
                onViewLeaderboard={onViewLeaderboard}
                onLogout={onLogout}
                title="Learning Roads"
                showActions={true}
            />

            <main className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    {[
                        {
                            label: "Total XP",
                            value: user.xp || 0,
                            icon: <Flame className="w-5 h-5 text-orange-500" />,
                            color: "orange"
                        },
                        {
                            label: "Total Score",
                            value: user.totalScore || 0,
                            icon: <BarChart3 className="w-5 h-5 text-blue-500" />,
                            color: "blue"
                        },
                        {
                            label: "Quizzes",
                            value: user.totalAttempts || 0,
                            icon: <Clock className="w-5 h-5 text-emerald-500" />,
                            color: "emerald"
                        },
                        {
                            label: "Global Rank",
                            value: `#${user.rank || '-'}`,
                            icon: <Award className="w-5 h-5 text-purple-500" />,
                            color: "purple"
                        }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/5 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                                {stat.icon}
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</div>
                                <div className="text-xl font-black text-gray-900 dark:text-white">{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Clan Invites Banner */}
                {user.clanInvites && user.clanInvites.length > 0 && (
                    <div onClick={() => navigate('/clans')} className="mb-12 cursor-pointer relative overflow-hidden bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-6 shadow-xl group">
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                    <Bell className="w-6 h-6 text-white animate-pulse" />
                                </div>
                                <div className="text-white">
                                    <h3 className="text-lg font-black">Clan Invitation</h3>
                                    <p className="text-white/80 text-sm font-medium">
                                        You have been invited to join <span className="text-white font-bold">{user.clanInvites[0].clanName}</span>.
                                    </p>
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white rounded-xl font-bold text-sm">View</div>
                        </div>
                    </div>
                )}

                {/* Refresh Data Button */}
                {onRefreshData && (
                    <div className="mb-12 flex justify-end">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-500 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                        </button>
                    </div>
                )}

                {!selectedSubjectId ? (
                    <>
                        {/* Subjects/Roads Selection */}
                        <div className="mb-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Your Learning Roads</h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">Pick a subject to explore its quizzes</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.isArray(subjects) && subjects.map((subject) => {
                                    const progress = getSubjectProgress(subject._id);
                                    const subjectQuizzes = quizzes.filter(q => q.subjectId === subject._id);

                                    return (
                                        <div
                                            key={subject._id}
                                            onClick={() => setSelectedSubjectId(subject._id)}
                                            className="group relative bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-white/5 p-8 cursor-pointer hover:border-indigo-500/30 transition-all shadow-sm hover:shadow-2xl overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full group-hover:bg-indigo-500/10 transition-colors" />

                                            <div className="relative flex justify-between items-start mb-6">
                                                <div className="w-16 h-16 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center text-4xl shadow-md group-hover:scale-110 transition-transform">
                                                    <SubjectIcon icon={subject.icon} />
                                                </div>
                                                {progress === 100 && (
                                                    <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
                                                        <CheckCircle className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 group-hover:text-indigo-500 transition-colors">
                                                {subject.title}
                                            </h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium line-clamp-2 mb-8">
                                                {subject.description || 'Master this subject with a collection of curated quizzes and materials.'}
                                            </p>

                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <LayoutGrid className="w-4 h-4 text-indigo-500" />
                                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{subjectQuizzes.length} Quizzes</span>
                                                </div>
                                                <span className="text-xs font-black text-indigo-500">{progress}% Done</span>
                                            </div>

                                            <div className="w-full h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-8">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 text-xs font-black text-indigo-500 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                                Enter Road <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    );
                                })}

                                {(!Array.isArray(subjects) || subjects.length === 0) && (
                                    <div className="col-span-full py-20 text-center bg-white/40 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-white/10">
                                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <h3 className="text-xl font-black text-gray-400 uppercase">No roads discovered yet</h3>
                                        <p className="text-gray-500 font-medium">Wait for an admin to curate subjects for you.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Road Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => setSelectedSubjectId(null)}
                                    className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-white/20 dark:border-white/5 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/10 transition-all group"
                                >
                                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                                </button>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-lg">Road Active</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">/ {activeSubject?.title}</span>
                                    </div>
                                    <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{activeSubject?.title}</h2>
                                </div>
                            </div>

                            {activeTab === 'quizzes' && (
                                <div className="relative group min-w-[300px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search this road..."
                                        className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-bold text-sm"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Road Navigation Tabs */}
                        <div className="flex items-center gap-1 p-1 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl mb-12 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'overview', label: 'Overview', icon: <BookOpen className="w-4 h-4" /> },
                                { id: 'roadmap', label: 'Roadmap', icon: <Brain className="w-4 h-4" /> },
                                { id: 'quizzes', label: 'Quizzes', icon: <Award className="w-4 h-4" /> },
                                { id: 'study-cards', label: 'Study Cards', icon: <FileText className="w-4 h-4" /> },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as SubjectTab)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 shadow-indigo-500/30'
                                        : 'text-gray-500 hover:bg-white/50 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
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
                                                <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${subjectProgress}%` }} />
                                                </div>
                                            </div>
                                            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5">
                                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Completed</div>
                                                <div className="text-4xl font-black text-emerald-500 mb-1">{completedQuizzesCount}</div>
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-tight">Finished quizzes in this road</div>
                                            </div>
                                            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5">
                                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Quizzes</div>
                                                <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{filteredQuizzes.length}</div>
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-tight">Available in this road</div>
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
                                            <div className="flex items-center justify-between mb-4">
                                                <Zap className="w-10 h-10 bg-white/20 p-2 rounded-xl" />
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">Next step</span>
                                            </div>
                                            <h4 className="text-lg font-black mb-2 uppercase">{nextQuiz ? nextQuiz.title : 'No quiz available'}</h4>
                                            <p className="text-white/80 text-sm font-medium mb-6 line-clamp-3">{nextQuiz?.description || 'Pick any quiz to keep moving forward and build your streak.'}</p>
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={() => nextQuiz && !isQuizLocked(nextQuiz) ? onSelectQuiz(nextQuiz) : setActiveTab('quizzes')}
                                                    className="w-full py-4 bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform"
                                                    disabled={!nextQuiz}
                                                >
                                                    {nextQuiz && !isQuizLocked(nextQuiz) ? 'Start Next Quiz' : 'View Quizzes'}
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('roadmap')}
                                                    className="w-full py-3 bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/20 hover:bg-white/15 transition-colors"
                                                >
                                                    View Roadmap
                                                </button>
                                            </div>
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
                                            const def = skillTracks.find((t: any) => t.subjectId === selectedSubjectId || t.trackId === selectedSubjectId);
                                            return def ? user.skillTracks?.find((p: any) => p.trackId === def.trackId) : undefined;
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
                                    {filteredQuizzes.map((quiz) => {
                                        const quizId = getQuizId(quiz);
                                        const bestScore = getBestScore(quizId);
                                        const attempted = hasAttempted(quizId);
                                        const locked = isQuizLocked(quiz);

                                        return (
                                            <div
                                                key={quizId}
                                                onClick={() => !locked && onSelectQuiz(quiz)}
                                                className={`group relative min-h-[380px] ${!locked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                            >
                                                <div className={`absolute -inset-0.5 bg-gradient-to-br ${attempted ? 'from-emerald-500 to-teal-500' : 'from-indigo-500 to-purple-500'} rounded-[2.5rem] ${locked ? 'opacity-0' : 'opacity-0 group-hover:opacity-20'} blur-xl transition-all duration-500`} />

                                                <div className={`relative h-full bg-white dark:bg-[#11111a] rounded-[2.5rem] border border-gray-200 dark:border-white/5 p-8 flex flex-col ${locked ? 'opacity-50 blur-sm' : 'group-hover:-translate-y-2'} transition-all duration-300`}>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className={`text-5xl ${locked ? '' : 'group-hover:scale-110'} transition-transform duration-500`}>
                                                            {quiz.icon || '🎯'}
                                                        </div>
                                                        {locked ? (
                                                            <div className="bg-red-500/10 text-red-500 p-2 rounded-xl">
                                                                <Lock className="w-5 h-5" />
                                                            </div>
                                                        ) : attempted ? (
                                                            <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
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

                                                        <div className="flex flex-wrap gap-2 mb-8">
                                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getDifficultyBadgeBg(quiz.difficulty)}`}>
                                                                {quiz.difficulty}
                                                            </span>
                                                            <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/10">
                                                                {quiz.questions?.length || 0} Qs
                                                            </span>
                                                        </div>

                                                        {!locked && attempted && (
                                                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between mb-4">
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

                                                    <button
                                                        disabled={locked}
                                                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${locked
                                                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                                                            : attempted
                                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                                            }`}>
                                                        {locked ? (
                                                            <><Lock className="w-4 h-4" /> Locked</>
                                                        ) : attempted ? (
                                                            <><RefreshCw className="w-4 h-4" /> Retake</>
                                                        ) : (
                                                            <><Play className="w-4 h-4 fill-white" /> Start</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {filteredQuizzes.length === 0 && (
                                        <div className="col-span-full py-20 text-center">
                                            <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No quizzes found for this road</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'study-cards' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {studyCards.filter(c => c.subjectId === selectedSubjectId).map((card) => (
                                        <div key={card.id} className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5 group">
                                            <h4 className="text-xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight">{card.title}</h4>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6 line-clamp-4">{card.content}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="px-3 py-1 bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                                    {card.category}
                                                </div>
                                                <button className="text-xs font-black text-indigo-500 uppercase tracking-widest hover:underline">
                                                    Open Card
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {studyCards.filter(c => c.subjectId === selectedSubjectId).length === 0 && (
                                        <div className="col-span-full py-20 text-center bg-white/40 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-white/10">
                                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <h3 className="text-xl font-black text-gray-400 uppercase">No study cards</h3>
                                            <p className="text-gray-500 font-medium">Coming soon! Quick-review cards for this subject.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default UserRoads;
