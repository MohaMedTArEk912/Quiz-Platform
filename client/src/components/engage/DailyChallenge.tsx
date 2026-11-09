import React, { useEffect, useState, useRef } from 'react';
import type {
  UserData,
  DailyCompilerChallenge,
  CompilerSubmissionResult,
  DailyChallengeCalendarDay,
  DailyChallengeCalendarResponse
} from '../../types';
import { api } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import {
  Flame,
  Calendar,
  Trophy,
  CheckCircle2,
  Sparkles,
  Target,
  Zap,
  Swords,
  Gift,
  Send,
  AlertCircle,
  Code2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
  XCircle,
  Play,
  Terminal,
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CalendarDays,
  History,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyChallengeProps {
  user: UserData;
  onUserUpdate: (updates: Partial<UserData>) => void;
}

interface RunOutput {
  output: string;
  isError: boolean;
  executionTime?: string;
  memory?: number;
}

type TierKey = 'easy' | 'medium' | 'hard';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getTodayDateString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (dateStr: string) => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const DailyChallenge: React.FC<DailyChallengeProps> = ({ user, onUserUpdate }) => {
  const { isBento } = useTheme();

  // Challenge and active tier state
  const [challenge, setChallenge] = useState<DailyCompilerChallenge | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<TierKey>('easy');
  const [codeByTier, setCodeByTier] = useState<Record<TierKey, string>>({
    easy: '',
    medium: '',
    hard: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [runOutputByTier, setRunOutputByTier] = useState<Record<TierKey, RunOutput | null>>({
    easy: null,
    medium: null,
    hard: null
  });
  const [resultByTier, setResultByTier] = useState<Record<TierKey, CompilerSubmissionResult | null>>({
    easy: null,
    medium: null,
    hard: null
  });
  const [showHints, setShowHints] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarData, setCalendarData] = useState<DailyChallengeCalendarDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const todayDateString = getTodayDateString();

  /**
   * Load challenge for today or a specific date
   */
  const loadChallenge = async (dateStr?: string | null) => {
    try {
      setLoadingChallenge(true);
      setError(null);
      const res = await api.getDailyChallenge(user.userId, dateStr || undefined) as DailyCompilerChallenge;
      setChallenge(res);
      setSelectedDate(dateStr || null);

      // Select first incomplete tier or first available tier
      if (res.tiers) {
        const tierKeys: TierKey[] = ['easy', 'medium', 'hard'];
        const firstIncomplete = tierKeys.find(k => res.tiers?.[k] && !res.tiers[k]?.completed);
        const firstAvailable = tierKeys.find(k => res.tiers?.[k]);
        setActiveTier(firstIncomplete || firstAvailable || 'easy');
      }

      // Reset code and runner outputs for the new challenge
      setCodeByTier({ easy: '', medium: '', hard: '' });
      setRunOutputByTier({ easy: null, medium: null, hard: null });
      setResultByTier({ easy: null, medium: null, hard: null });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load challenge';
      if (errorMessage.includes('No compiler questions') || errorMessage.includes('not found')) {
        setError(dateStr ? `No coding challenge scheduled for ${formatDisplayDate(dateStr)}.` : 'No daily challenge available today. Check back tomorrow!');
      } else {
        setError(errorMessage);
      }
      console.error('Daily challenge error:', err);
    } finally {
      setLoadingChallenge(false);
      setInitialLoading(false);
    }
  };

  /**
   * Fetch calendar data for the active month and year
   */
  const fetchCalendar = async (month: number, year: number) => {
    try {
      setCalendarLoading(true);
      const res = await api.getDailyChallengeCalendar(user.userId, month, year) as DailyChallengeCalendarResponse;
      setCalendarData(res.days || []);
    } catch (err) {
      console.error('Failed to load challenge calendar:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  // Initial load: today's challenge
  useEffect(() => {
    loadChallenge(null);
  }, [user.userId]);

  // Load calendar whenever month/year changes
  useEffect(() => {
    fetchCalendar(calendarMonth, calendarYear);
  }, [user.userId, calendarMonth, calendarYear]);

  // Derived properties
  const isArchived = Boolean(challenge?.isArchived || (selectedDate && selectedDate !== todayDateString));
  const currentTierData = challenge?.tiers?.[activeTier] || null;
  const currentQuestion = currentTierData?.question || challenge?.question;
  const currentRewards = currentTierData?.rewards || challenge?.rewards;
  const isCurrentTierCompleted = currentTierData ? currentTierData.completed : challenge?.completed;

  const currentCode = codeByTier[activeTier] || '';
  const currentRunOutput = runOutputByTier[activeTier];
  const currentResult = resultByTier[activeTier];

  const streak = user.dailyChallengeStreak || 0;
  const isAllCompleted = challenge?.allCompleted;
  const completedCount = challenge?.completedCount || (challenge?.completed ? 1 : 0);
  const totalTiers = challenge?.totalTiers || (challenge?.tiers ? Object.keys(challenge.tiers).length : 1);

  // Calendar calculations
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
  const solvedThisMonthCount = calendarData.filter(d => d.allCompleted).length;

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCalendarMonth(now.getMonth());
    setCalendarYear(now.getFullYear());
    handleSelectDate(null);
  };

  const handleSelectDate = (dateStr: string | null) => {
    if (dateStr === selectedDate) return;
    loadChallenge(dateStr);
  };

  /**
   * Run code without submitting (test/debug mode)
   */
  const handleRunCode = async () => {
    if (!currentCode.trim()) {
      setError('Please write some code before running');
      return;
    }

    setError(null);
    setRunning(true);
    setRunOutputByTier(prev => ({ ...prev, [activeTier]: null }));

    try {
      const language = currentQuestion?.language || 'javascript';
      const res = await api.runCode(currentCode, language);
      const out: RunOutput = {
        output: res.output || '(No output)',
        isError: res.isError || false,
        executionTime: res.executionTime,
        memory: res.memory
      };
      setRunOutputByTier(prev => ({ ...prev, [activeTier]: out }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to run code';
      setRunOutputByTier(prev => ({
        ...prev,
        [activeTier]: { output: message, isError: true }
      }));
    } finally {
      setRunning(false);
    }
  };

  /**
   * Submit code for AI evaluation
   */
  const handleSubmit = async () => {
    if (!currentCode.trim()) {
      setError('Please write some code before submitting');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const questionId = currentTierData?.questionId || challenge?.question?.questionId;
      const res = await api.submitCompilerAnswer(
        currentCode,
        user.userId,
        questionId,
        activeTier,
        selectedDate || undefined
      ) as CompilerSubmissionResult;

      setResultByTier(prev => ({ ...prev, [activeTier]: res }));

      if (res.passed) {
        // Trigger celebratory confetti
        confetti({
          particleCount: res.allTiersCompleted ? 300 : 200,
          spread: 120,
          origin: { y: 0.6 },
          colors: activeTier === 'hard' ? ['#F59E0B', '#EF4444', '#8B5CF6'] : ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']
        });

        // Update user balances (only update streak if today's challenge)
        if (res.rewards) {
          const userUpdates: Partial<UserData> = {
            coins: (user.coins || 0) + res.rewards.coins,
            xp: user.xp + res.rewards.xp
          };
          if (!isArchived && res.rewards.streak !== undefined) {
            userUpdates.dailyChallengeStreak = res.rewards.streak;
          }
          onUserUpdate(userUpdates);
        }

        // Update local challenge state
        setChallenge(prev => {
          if (!prev) return null;
          const updatedTiers = prev.tiers ? {
            ...prev.tiers,
            [activeTier]: prev.tiers[activeTier] ? {
              ...prev.tiers[activeTier]!,
              completed: true
            } : null
          } : undefined;

          const updatedCompletedCount = (prev.completedCount || 0) + 1;
          const allDone = Boolean(res.allTiersCompleted || (prev.totalTiers && updatedCompletedCount >= prev.totalTiers));

          return {
            ...prev,
            tiers: updatedTiers,
            completedCount: updatedCompletedCount,
            allCompleted: allDone,
            completed: true
          };
        });

        // Update calendar tile status in real-time
        const targetDateStr = selectedDate || todayDateString;
        setCalendarData(prev => prev.map(day => {
          if (day.dateString === targetDateStr) {
            const updatedTiers = { ...day.tiers };
            if (updatedTiers[activeTier]) {
              updatedTiers[activeTier] = { ...updatedTiers[activeTier]!, completed: true };
            }
            const completedTiers = Object.values(updatedTiers).filter(t => t?.completed).length;
            const total = day.totalTiers || 3;
            return {
              ...day,
              completedTiers,
              allCompleted: completedTiers >= total,
              isPartiallyCompleted: completedTiers > 0 && completedTiers < total,
              tiers: updatedTiers
            };
          }
          return day;
        }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit code';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStreakLevel = (streakCount: number) => {
    if (streakCount >= 30) return { level: 'LEGENDARY', color: 'from-purple-500 to-pink-500', icon: '👑' };
    if (streakCount >= 14) return { level: 'MASTER', color: 'from-red-500 to-orange-600', icon: '🔥' };
    if (streakCount >= 7) return { level: 'ON FIRE', color: 'from-orange-400 to-yellow-500', icon: '⚡' };
    return { level: 'RISING', color: 'from-blue-400 to-cyan-500', icon: '🌟' };
  };

  const streakInfo = getStreakLevel(streak);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'hard': return 'bg-red-500/10 border-red-500/20 text-red-400';
      default: return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading challenge arena...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/25 p-4 md:p-6 relative overflow-hidden">
      {/* Error Banner */}
      {error && (
        <div className="max-w-5xl mx-auto mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-4 rounded-2xl flex items-center gap-2 backdrop-blur-md relative z-10 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6 relative z-10">
        <div className={`rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all ${
          isBento
            ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
            : 'glass-panel border border-slate-200/80 dark:border-white/10'
        }`}>
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
              isBento
                ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25'
            }`}>
              <Swords className="w-8 h-8" />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isBento ? 'text-black uppercase' : 'text-slate-900 dark:text-white'}`}>
                  Daily Code Challenge
                </h1>
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> 3 Tiers Daily
                </span>
                {isArchived && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3.5 h-3.5" /> Archive Mode
                  </span>
                )}
              </div>
              <p className={`text-sm ${isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                Solve Easy, Medium, and Hard challenges to earn coins, XP, and distinct loot gifts for each tier!
              </p>
            </div>

            {/* Actions & Status */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Calendar Toggle Button */}
              <button
                onClick={() => setShowCalendar(prev => !prev)}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  isBento
                    ? showCalendar
                      ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                      : 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-yellow-50'
                    : showCalendar
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                      : 'glass-card border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="View past challenge calendar"
              >
                <CalendarDays className="w-4 h-4" />
                <span>{showCalendar ? 'Close Calendar' : 'Calendar'}</span>
                {solvedThisMonthCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isBento ? 'bg-black text-[#bef264]' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {solvedThisMonthCount} Solved
                  </span>
                )}
              </button>

              {/* Status Badge */}
              <div className={`px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[130px] transition-all ${
                isBento
                  ? isAllCompleted
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                    : 'bg-[#93c5fd] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                  : isAllCompleted
                    ? 'glass-card border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'glass-card border border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
              }`}>
                <span className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isBento ? 'text-black/70' : 'opacity-60'}`}>
                  {isArchived ? 'Archive Progress' : 'Daily Progress'}
                </span>
                <span className="text-sm font-black flex items-center gap-1.5">
                  {isAllCompleted ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> ALL SOLVED</>
                  ) : (
                    <><Target className="w-4 h-4" /> {completedCount} / {totalTiers} TIERS</>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Monthly Calendar Section */}
      {showCalendar && (
        <div className="max-w-5xl mx-auto mb-6 relative z-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`rounded-3xl p-5 md:p-7 relative overflow-hidden transition-all ${
            isBento
              ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
              : 'glass-panel border border-slate-200/80 dark:border-white/10 backdrop-blur-xl'
          }`}>
            {/* Calendar Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isBento
                    ? 'bg-[#c4b5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                }`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-lg sm:text-xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </h2>
                  <p className={`text-xs ${isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                    Click any day with a challenge to solve and collect all XP, Coins, and Gifts
                  </p>
                </div>
              </div>

              {/* Month Navigation & Today Shortcut */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isBento
                      ? 'bg-white hover:bg-yellow-100 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                      : 'glass-card hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                  }`}
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleJumpToday}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isBento
                      ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                      : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  Jump to Today
                </button>

                <button
                  onClick={handleNextMonth}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isBento
                      ? 'bg-white hover:bg-yellow-100 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                      : 'glass-card hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                  }`}
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
              {WEEKDAY_NAMES.map(dayName => (
                <div
                  key={dayName}
                  className={`text-[10px] sm:text-xs font-black uppercase tracking-wider py-1 ${
                    isBento ? 'text-black/60' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Days Matrix */}
            {calendarLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold">Loading month challenges...</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {/* Padding cells from previous month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div
                    key={`pad-${i}`}
                    className="min-h-[56px] sm:min-h-[72px] rounded-xl sm:rounded-2xl opacity-20 border border-dashed border-slate-300 dark:border-white/5 bg-transparent"
                  />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayData = calendarData.find(d => d.dateString === dateStr);
                  const hasChallenge = Boolean(dayData);
                  const isToday = dateStr === todayDateString;
                  const isSelected = selectedDate ? selectedDate === dateStr : isToday;
                  const isAllDone = dayData?.allCompleted;
                  const isPartial = dayData?.isPartiallyCompleted;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        if (hasChallenge) {
                          handleSelectDate(isToday && !selectedDate ? null : dateStr);
                        }
                      }}
                      disabled={!hasChallenge}
                      className={`relative min-h-[56px] sm:min-h-[72px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl flex flex-col justify-between text-left transition-all ${
                        hasChallenge ? 'cursor-pointer' : 'cursor-default opacity-40'
                      } ${
                        isBento
                          ? isSelected
                            ? 'bg-[#fde047] text-black border-3 border-black shadow-[4px_4px_0px_#000] -translate-y-0.5 z-10'
                            : hasChallenge
                              ? isAllDone
                                ? 'bg-[#dcfce7] text-black border-2 border-black hover:bg-[#bbf7d0]'
                                : isPartial
                                  ? 'bg-[#fef9c3] text-black border-2 border-black hover:bg-[#fef08a]'
                                  : 'bg-white text-black border-2 border-black hover:bg-slate-50'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          : isSelected
                            ? 'bg-indigo-600/15 border-2 border-indigo-500 shadow-md shadow-indigo-500/20 z-10'
                            : hasChallenge
                              ? isAllDone
                                ? 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20'
                                : isPartial
                                  ? 'bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                                  : 'glass-card border border-slate-200 dark:border-white/10 hover:border-indigo-500/40'
                              : 'bg-slate-100/50 dark:bg-white/[0.02] border border-transparent text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {/* Day Number and Today Pill */}
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs sm:text-sm font-black ${
                          isBento ? 'text-black' : isToday ? 'text-indigo-500' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {dayNum}
                        </span>
                        {isToday && (
                          <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full ${
                            isBento
                              ? 'bg-black text-[#bef264]'
                              : 'bg-indigo-500 text-white'
                          }`}>
                            Today
                          </span>
                        )}
                      </div>

                      {/* Status Indicator */}
                      {hasChallenge && (
                        <div className="mt-auto pt-1 flex items-center justify-between">
                          {isAllDone ? (
                            <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span className="hidden sm:inline">3/3</span>
                            </span>
                          ) : isPartial ? (
                            <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-amber-600 dark:text-amber-400">
                              <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span className="hidden sm:inline">{dayData?.completedTiers}/{dayData?.totalTiers}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-black text-purple-600 dark:text-purple-400">
                              <Code2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span className="hidden sm:inline">Solve</span>
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend & Summary */}
            <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className={isBento ? 'text-black/80' : 'text-slate-600 dark:text-slate-300'}>All Tiers Solved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span className={isBento ? 'text-black/80' : 'text-slate-600 dark:text-slate-300'}>In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                  <span className={isBento ? 'text-black/80' : 'text-slate-600 dark:text-slate-300'}>Available to Solve</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-50">
                  <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
                  <span className={isBento ? 'text-black/80' : 'text-slate-600 dark:text-slate-300'}>No Challenge</span>
                </div>
              </div>

              <div className={`font-black text-xs ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>
                {calendarData.filter(d => d.allCompleted).length} / {calendarData.length} Completed this month
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Notification Banner (shown when viewing any past challenge) */}
      {isArchived && (
        <div className="max-w-5xl mx-auto mb-6 relative z-10 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isBento
              ? 'bg-[#c4b5fd] text-black border-3 border-black shadow-[4px_4px_0px_#000]'
              : 'bg-indigo-500/10 border-2 border-indigo-500/30 backdrop-blur-xl'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isBento
                  ? 'bg-white text-black border-2 border-black'
                  : 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400'
              }`}>
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`font-black text-sm sm:text-base ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                    Viewing Archived Challenge: {formatDisplayDate(selectedDate || '')}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-black text-[#bef264]">
                    Archive Mode
                  </span>
                </div>
                <p className={`text-xs ${isBento ? 'text-black/80 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
                  You can solve this challenge for full Coins, XP, and Tier Gifts! (Streak is unaffected).
                </p>
              </div>
            </div>

            <button
              onClick={() => handleSelectDate(null)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                isBento
                  ? 'bg-white hover:bg-yellow-50 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Return to Today
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
        {/* Streak Card */}
        <div className={`md:col-span-2 rounded-3xl p-6 flex items-center justify-between overflow-hidden relative transition-all ${
          isBento
            ? 'bg-[#fde047] text-black border-3 border-black shadow-[6px_6px_0px_#000]'
            : 'glass-card border border-slate-200/80 dark:border-white/10'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className={`w-5 h-5 ${isBento ? 'text-black fill-black' : 'text-amber-500 fill-amber-500'}`} />
              <span className={`uppercase tracking-wider text-xs font-black ${isBento ? 'text-black/70' : 'text-slate-500 dark:text-slate-400'}`}>Current Streak</span>
            </div>
            <div className={`font-tabular text-4xl sm:text-5xl font-black tracking-tight mb-2 ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
              {streak} <span className={`text-lg font-black ${isBento ? 'text-black/60' : 'text-slate-400'}`}>DAYS</span>
            </div>
            <div className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
              isBento
                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}>
              {streakInfo.icon} {streakInfo.level}
            </div>
          </div>
          <div className={`transform translate-x-4 ${isBento ? 'opacity-20 text-black' : 'opacity-10 dark:opacity-5'}`}>
            <Flame className="w-32 h-32" />
          </div>
        </div>

        {/* Rewards Card */}
        <div className={`rounded-3xl p-6 flex flex-col justify-center items-center text-center transition-all ${
          isBento
            ? 'bg-[#bef264] text-black border-3 border-black shadow-[6px_6px_0px_#000]'
            : 'glass-card border border-slate-200/80 dark:border-white/10'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
            isBento
              ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
              : 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/20'
          }`}>
            <Trophy className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className={`font-tabular text-xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
              {(currentRewards?.coins || 100).toLocaleString()} <span className={`text-xs font-black ${isBento ? 'text-black/70' : 'text-amber-500'}`}>COINS</span>
            </div>
            <div className={`font-tabular text-xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
              {(currentRewards?.xp || 150).toLocaleString()} <span className={`text-xs font-black ${isBento ? 'text-black/70' : 'text-indigo-500'}`}>XP</span>
            </div>
            {currentRewards?.giftLabel && (
              <div className={`mt-1.5 text-xs font-black flex items-center justify-center gap-1.5 ${isBento ? 'text-black' : 'text-emerald-500'}`}>
                <Gift className="w-3.5 h-3.5" /> {currentRewards.giftLabel}
              </div>
            )}
          </div>
          <div className={`text-[10px] font-black uppercase tracking-wider mt-2.5 ${isBento ? 'text-black/70' : 'text-slate-400'}`}>
            {activeTier.toUpperCase()} Tier Gift
          </div>
        </div>
      </div>

      {/* Triple Crown Banner if all 3 tiers completed */}
      {isAllCompleted && (
        <div className="max-w-5xl mx-auto mb-6 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className={`p-5 rounded-3xl flex items-center justify-between gap-4 ${
            isBento
              ? 'bg-[#bef264] text-black border-3 border-black shadow-[6px_6px_0px_#000]'
              : 'bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-purple-500/20 border-2 border-emerald-500/40 backdrop-blur-xl'
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/30 flex items-center justify-center text-2xl shrink-0">
                🏆
              </div>
              <div>
                <h3 className={`font-black text-base sm:text-lg flex items-center gap-2 ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                  Triple Crown Mastery! <span className="text-amber-500">✨ All 3 Tiers Completed</span>
                </h3>
                <p className={`text-xs font-medium ${isBento ? 'text-black/80' : 'text-gray-600 dark:text-gray-300'}`}>
                  You solved Easy, Medium, and Hard puzzles for this challenge and claimed all 3 rewards!
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-amber-500 text-black font-black text-xs uppercase tracking-wider shrink-0 shadow-sm">
              All Gifts Claimed
            </span>
          </div>
        </div>
      )}

      {/* Loading indicator when switching challenges */}
      {loadingChallenge ? (
        <div className="max-w-5xl mx-auto py-20 text-center relative z-10">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            Loading challenge for {selectedDate ? formatDisplayDate(selectedDate) : 'today'}...
          </p>
        </div>
      ) : (
        <>
          {/* 3 Difficulty Tier Selector Tabs */}
          {challenge?.tiers && (
            <div className="max-w-5xl mx-auto mb-6 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black' : 'text-gray-700 dark:text-gray-300'}`}>
                  <Layers className="w-4 h-4 text-purple-500" />
                  Select Difficulty Tier:
                </h3>
                <span className="text-xs font-bold text-gray-400">
                  {completedCount} of {totalTiers} Solved
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['easy', 'medium', 'hard'] as const).map(tierKey => {
                  const tierData = challenge.tiers?.[tierKey];
                  if (!tierData) return null;
                  const isSelected = activeTier === tierKey;
                  const isDone = tierData.completed;

                  return (
                    <button
                      key={tierKey}
                      onClick={() => {
                        setActiveTier(tierKey);
                        setError(null);
                      }}
                      className={`p-4 rounded-2xl transition-all text-left flex flex-col justify-between cursor-pointer ${
                        isBento
                          ? isSelected
                            ? 'bg-[#fde047] text-black border-3 border-black shadow-[4px_4px_0px_#000] -translate-y-0.5'
                            : 'bg-white text-black border-3 border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-50'
                          : isSelected
                            ? tierKey === 'easy'
                              ? 'bg-emerald-500/10 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 -translate-y-0.5'
                              : tierKey === 'hard'
                                ? 'bg-rose-500/10 border-2 border-rose-500 shadow-lg shadow-rose-500/10 -translate-y-0.5'
                                : 'bg-amber-500/10 border-2 border-amber-500 shadow-lg shadow-amber-500/10 -translate-y-0.5'
                            : 'glass-card border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            tierKey === 'easy' ? 'bg-emerald-500' : tierKey === 'hard' ? 'bg-rose-500' : 'bg-amber-500'
                          }`} />
                          <span className="font-black text-xs uppercase tracking-wider">
                            {tierKey} Tier
                          </span>
                        </div>
                        {isDone ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Solved
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Available
                          </span>
                        )}
                      </div>

                      <div className={`font-black text-sm truncate mb-2 ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                        {tierData.question?.title || 'Coding Challenge'}
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-black/10 dark:border-white/10">
                        <span className="text-amber-500 flex items-center gap-1 text-xs">
                          <Gift className="w-3.5 h-3.5" /> {tierData.rewards?.giftLabel || 'Loot Gift'}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          🪙 {tierData.rewards?.coins} • ⚡ {tierData.rewards?.xp}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Challenge Content */}
          {currentQuestion ? (
            <div className="max-w-5xl mx-auto relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
                <h2 className={`text-lg sm:text-xl font-black flex items-center gap-2.5 sm:gap-3 ${isBento ? 'text-black uppercase tracking-tight' : 'text-gray-900 dark:text-white'}`}>
                  <Code2 className={`w-5 h-5 shrink-0 ${isBento ? 'text-black' : 'text-orange-500'}`} />
                  <span className="truncate">{activeTier.toUpperCase()} Challenge: {currentQuestion.title}</span>
                </h2>
                {isCurrentTierCompleted && (
                  <span className="self-start sm:self-auto px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4" /> Solved & Gift Claimed
                  </span>
                )}
              </div>

              <div className={`rounded-3xl overflow-hidden transition-all ${
                isBento
                  ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                  : 'glass-card border border-slate-200/80 dark:border-white/10'
              }`}>
                {/* Question Header */}
                <div className={`p-4 sm:p-6 ${isBento ? 'border-b-3 border-black bg-white' : 'border-b border-slate-200/80 dark:border-white/10'}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      isBento
                        ? 'bg-[#ddd6fe] text-black border-2 border-black'
                        : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                    }`}>
                      {currentQuestion.category}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      isBento
                        ? 'bg-[#fdba74] text-black border-2 border-black'
                        : `border ${getDifficultyColor(currentQuestion.difficulty || activeTier)}`
                    }`}>
                      {currentQuestion.difficulty || activeTier}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      isBento
                        ? 'bg-[#93c5fd] text-black border-2 border-black'
                        : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400'
                    }`}>
                      {currentQuestion.language}
                    </span>
                    {currentRewards?.giftLabel && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Gift className="w-3 h-3" /> {currentRewards.giftLabel}
                      </span>
                    )}
                  </div>

                  <h3 className={`text-xl font-black mb-2 ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                    {currentQuestion.title}
                  </h3>

                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isBento ? 'text-black/80 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                    {currentQuestion.description}
                  </p>

                  {/* Hints Section */}
                  {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowHints(!showHints)}
                        className={`flex items-center gap-1.5 font-black text-xs transition-colors cursor-pointer ${
                          isBento ? 'text-black underline' : 'text-amber-600 dark:text-amber-400 hover:text-amber-500 font-semibold'
                        }`}
                      >
                        <Lightbulb className="w-4 h-4" />
                        {showHints ? 'Hide Hints' : `Show Hints (${currentQuestion.hints.length})`}
                        {showHints ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      {showHints && (
                        <ul className={`mt-2.5 space-y-1.5 pl-5 list-disc text-xs leading-relaxed ${isBento ? 'text-black/80 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                          {currentQuestion.hints.map((hint, idx) => (
                            <li key={idx}>{hint}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Code Editor */}
                <div className={`p-4 sm:p-6 ${isBento ? 'bg-[#fef9c3]/30 border-t-3 border-black' : 'bg-slate-50/50 dark:bg-black/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : 'text-slate-500 dark:text-slate-400'}`}>
                      Your Solution ({activeTier.toUpperCase()} TIER)
                    </label>
                    {isCurrentTierCompleted && (
                      <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tier Solved
                      </span>
                    )}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={currentCode}
                    onChange={(e) => setCodeByTier(prev => ({ ...prev, [activeTier]: e.target.value }))}
                    disabled={isCurrentTierCompleted || submitting || running}
                    placeholder={`// Write your ${currentQuestion.language} code here for ${currentQuestion.title}...`}
                    className={`w-full h-64 rounded-2xl p-4 font-mono text-xs sm:text-sm resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                      isBento
                        ? 'bg-black text-[#bef264] border-3 border-black shadow-[4px_4px_0px_#000] focus:ring-3 focus:ring-black'
                        : 'bg-slate-900 text-emerald-400 dark:bg-[#070b14] border border-slate-700/60 dark:border-white/10 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 shadow-inner'
                    }`}
                    spellCheck={false}
                  />

                  {/* Run Output Panel */}
                  {currentRunOutput && (
                    <div className={`mt-5 rounded-2xl border-2 border-black overflow-hidden ${
                      isBento
                        ? 'shadow-[4px_4px_0px_#000] bg-[#0b0f19]'
                        : 'border-slate-800 bg-[#090d16] shadow-xl'
                    }`}>
                      {/* Terminal macOS / Neo-brutalist Header Bar */}
                      <div className="px-4 py-2.5 flex items-center justify-between border-b-2 border-black bg-[#161f30]">
                        <div className="flex items-center gap-3">
                          {/* Console Dots */}
                          <div className="flex items-center gap-1.5 select-none">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-black/40 inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-black/40 inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-black/40 inline-block" />
                          </div>

                          {/* Status Pill */}
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-black ${
                              currentRunOutput.isError
                                ? 'bg-rose-500 text-white shadow-[1.5px_1.5px_0px_#000]'
                                : 'bg-[#bef264] text-black shadow-[1.5px_1.5px_0px_#000]'
                            }`}>
                              {currentRunOutput.isError ? (
                                <><AlertCircle className="w-3 h-3 shrink-0" /> Execution Error</>
                              ) : (
                                <><CheckCircle2 className="w-3 h-3 shrink-0" /> Run Output</>
                              )}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 font-bold hidden sm:inline">
                              {currentRunOutput.isError ? 'exit status 1' : 'exit status 0'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {currentRunOutput.executionTime && (
                            <span className="text-[10px] font-mono font-bold text-slate-300 bg-black/40 border border-white/10 px-2 py-0.5 rounded-md">
                              {currentRunOutput.executionTime}s {currentRunOutput.memory ? `• ${(currentRunOutput.memory / 1024).toFixed(1)} KB` : ''}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setRunOutputByTier(prev => ({ ...prev, [activeTier]: null }))}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Dismiss console"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Console Stream Body */}
                      <div className="p-4 bg-[#090d16] font-mono text-xs leading-relaxed max-h-56 overflow-y-auto overflow-x-auto text-slate-200">
                        <div className="flex items-center gap-2 text-slate-500 text-[11px] pb-2 mb-2 border-b border-white/5 select-none font-bold">
                          <span>$</span>
                          <span className="text-slate-400">
                            {currentQuestion?.language === 'python' ? 'python3 main.py' :
                             currentQuestion?.language === 'cpp' ? 'g++ solution.cpp && ./a.out' :
                             currentQuestion?.language === 'java' ? 'javac Solution.java && java Solution' :
                             'node solution.js'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className={`select-none font-bold text-sm leading-none pt-0.5 ${currentRunOutput.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {currentRunOutput.isError ? '✕' : '›'}
                          </span>
                          <pre className={`whitespace-pre-wrap font-mono flex-1 text-xs ${
                            currentRunOutput.isError ? 'text-rose-300 font-medium' : 'text-emerald-300 font-normal'
                          }`}>
                            {currentRunOutput.output || '(Execution finished with no output)'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Bar */}
                  <div className="mt-5 pt-4 border-t-2 border-black/10 dark:border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div className="w-full sm:w-auto">
                      {isCurrentTierCompleted && !isAllCompleted ? (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black ${
                          isBento
                            ? 'bg-[#fef9c3] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                          <span>Tier Solved! Switch tier above to complete all 3.</span>
                        </div>
                      ) : (
                        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <Terminal className="w-3.5 h-3.5 text-slate-400" />
                          <span>Zero-wait sandbox compiler runner</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      {/* Run Only Button */}
                      <button
                        onClick={handleRunCode}
                        disabled={running || submitting || !currentCode.trim()}
                        className={`h-11 px-5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.985] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                          isBento
                            ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000]'
                            : 'glass-card hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {running ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
                        ) : (
                          <><Play className={`w-3.5 h-3.5 ${isBento ? 'text-black' : 'text-indigo-500'}`} /> Run Code</>
                        )}
                      </button>

                      {/* Submit Button */}
                      <button
                        onClick={handleSubmit}
                        disabled={submitting || isCurrentTierCompleted || !currentCode.trim() || running}
                        className={`h-11 px-6 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                          isBento
                            ? isCurrentTierCompleted
                              ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] cursor-default'
                              : 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000]'
                            : isCurrentTierCompleted
                              ? 'bg-emerald-600 text-white cursor-default'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25'
                        }`}
                      >
                        {submitting ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating Tier...</>
                        ) : isCurrentTierCompleted ? (
                          <><CheckCircle2 className="w-4 h-4" /> Tier Completed</>
                        ) : (
                          <><Send className="w-4 h-4" /> Submit {activeTier.toUpperCase()} Solution</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Evaluation Result for Active Tier */}
                {currentResult && (
                  <div className={`p-6 sm:p-7 border-t-3 border-black ${
                    isBento
                      ? currentResult.passed ? 'bg-[#f0fdf4]' : 'bg-[#fff1f2]'
                      : currentResult.passed ? 'border-slate-200/80 dark:border-white/10 bg-emerald-500/[0.04]' : 'border-slate-200/80 dark:border-white/10 bg-rose-500/[0.04]'
                  }`}>
                    {/* Header with Score Badge */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${
                        isBento
                          ? currentResult.passed
                            ? 'bg-[#bef264] text-black border-2 border-black shadow-[3.5px_3.5px_0px_#000]'
                            : 'bg-[#fda4af] text-black border-2 border-black shadow-[3.5px_3.5px_0px_#000]'
                          : currentResult.passed
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                            : 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                      }`}>
                        <span className="text-xl font-tabular leading-none">{currentResult.score}%</span>
                        <span className="text-[9px] uppercase tracking-wider font-mono opacity-80 mt-0.5">Score</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isBento
                              ? currentResult.passed ? 'bg-black text-white border-black' : 'bg-rose-600 text-white border-black'
                              : currentResult.passed ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/20 text-rose-600 border-rose-500/30'
                          }`}>
                            {currentResult.passed ? 'Challenge Passed' : 'Needs Work'}
                          </span>
                          <span className={`text-xs font-bold ${isBento ? 'text-black/60' : 'text-slate-400'}`}>
                            Required: <span className="font-tabular">{currentResult.passThreshold}%</span>
                          </span>
                        </div>
                        <h4 className={`font-black text-lg sm:text-xl tracking-tight ${
                          isBento
                            ? 'text-black'
                            : currentResult.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {currentResult.passed ? `🎉 ${activeTier.toUpperCase()} Challenge Passed!` : '❌ Needs Improvement'}
                        </h4>
                      </div>
                    </div>

                    {/* AI Feedback Card */}
                    <div className={`rounded-2xl p-4 sm:p-5 transition-all mb-4 ${
                      isBento
                        ? 'bg-white text-black border-2 border-black shadow-[3.5px_3.5px_0px_#000]'
                        : 'glass-panel border border-slate-200/80 dark:border-white/10'
                    }`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <h5 className={`font-black text-xs uppercase tracking-wider flex items-center gap-2 ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center ${
                            isBento ? 'bg-[#c084fc] text-black border border-black shadow-[1px_1px_0px_#000]' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            <Sparkles className="w-3 h-3" />
                          </span>
                          AI Code Analysis & Feedback
                        </h5>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isBento ? 'bg-slate-200 text-black border border-black' : 'bg-white/10 text-slate-300'
                        }`}>
                          Groq AI Evaluator
                        </span>
                      </div>
                      <p className={`text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${isBento ? 'text-black font-sans' : 'text-slate-600 dark:text-slate-300'}`}>
                        {currentResult.feedback}
                      </p>
                    </div>

                    {/* Reward Badges */}
                    {currentResult.passed && currentResult.rewards && (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 ${
                          isBento
                            ? 'bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          <Zap className="w-4 h-4 fill-amber-500" />
                          <span>+{currentResult.rewards.coins.toLocaleString()} Coins</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 ${
                          isBento
                            ? 'bg-[#e0e7ff] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          <Target className="w-4 h-4" />
                          <span>+{currentResult.rewards.xp.toLocaleString()} XP</span>
                        </div>
                        {currentResult.rewards.giftLabel && (
                          <div className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 ${
                            isBento
                              ? 'bg-[#fbcfe8] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            <Gift className="w-4 h-4" />
                            <span>Gift: {currentResult.rewards.giftLabel}</span>
                          </div>
                        )}
                        {!isArchived && (
                          <div className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 ${
                            isBento
                              ? 'bg-[#fed7aa] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          }`}>
                            <Flame className="w-4 h-4 fill-orange-500" />
                            <span>{currentResult.rewards.streak} Day Streak</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto relative z-10">
              <div className={`rounded-3xl p-12 text-center transition-all ${
                isBento
                  ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                  : 'glass-card border border-dashed border-slate-300 dark:border-white/10'
              }`}>
                <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-3 opacity-50" />
                <h3 className={`text-lg font-black mb-1 ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>
                  {selectedDate ? `No Challenge Scheduled for ${formatDisplayDate(selectedDate)}` : 'No Challenge Available'}
                </h3>
                <p className={`text-xs ${isBento ? 'text-black/70' : 'text-slate-500'}`}>
                  {selectedDate ? 'Use the calendar above to pick another date.' : 'Check back tomorrow for a new coding challenge.'}
                </p>
                {selectedDate && (
                  <button
                    onClick={() => handleSelectDate(null)}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-black text-[#bef264] hover:bg-neutral-800 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Return to Today
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyChallenge;
