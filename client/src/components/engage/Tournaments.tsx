import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type {
  Tournament,
  TournamentLeaderboardEntry,
  TournamentHistoryItem
} from '../../types';
import { api } from '../../lib/api';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  Crown, 
  Medal, 
  CheckCircle2, 
  Siren, 
  Sparkles, 
  Shield, 
  Zap, 
  Bell, 
  Flame,
  Swords,
  Lock,
  Unlock,
  Radio,
  FileSpreadsheet,
  History,
  ArrowRight,
  X,
  Timer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';

type TournamentTab = 'arenas' | 'leaderboards' | 'history';

const Tournaments: React.FC<{ userId?: string }> = ({ userId }) => {
  const { isBento } = useTheme();
  const { showNotification } = useNotification();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<TournamentTab>('arenas');

  // Tournaments list
  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [alertSubscribed, setAlertSubscribed] = useState(false);

  // Results Gating Holding Screen state
  const awaitingParamId = searchParams.get('awaiting');
  const [awaitingTournament, setAwaitingTournament] = useState<Tournament | null>(null);
  const [isRevealedUnlock, setIsRevealedUnlock] = useState(false);

  // Leaderboards tab state
  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState<string>('');
  const [leaderboardEntries, setLeaderboardEntries] = useState<TournamentLeaderboardEntry[]>([]);
  const [leaderboardStatusMessage, setLeaderboardStatusMessage] = useState<string>('');
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // History tab state
  const [historyItems, setHistoryItems] = useState<TournamentHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- Load Tournaments ---
  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTournaments(userId);
      setItems(Array.isArray(data) ? data : []);

      // If awaitingParamId is present in URL, select that tournament for the holding screen
      if (awaitingParamId) {
        const found = data.find(t => t.tournamentId === awaitingParamId);
        if (found) {
          setAwaitingTournament(found);
          if (found.resultsRevealed) {
            setIsRevealedUnlock(true);
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId, awaitingParamId]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  // --- Socket Listener for Live Results Reveal & Approvals ---
  useEffect(() => {
    if (!socket) return;

    // Listen for global tournament result reveal event
    const handleResultsRevealed = (payload: { tournamentId: string; resultsRevealed: boolean }) => {
      // Refresh tournaments list
      loadTournaments();

      // If user is currently waiting on this tournament's holding screen
      if (awaitingTournament?.tournamentId === payload.tournamentId && payload.resultsRevealed) {
        setIsRevealedUnlock(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#10B981', '#6366F1']
        });
        showNotification('success', 'The Tournament Master has revealed the official results!');
      }
    };

    // Listen for join request approval status update
    const handleRequestStatus = (payload: { tournamentId: string; status: string }) => {
      loadTournaments();
      if (payload.status === 'approved') {
        showNotification('success', 'Congratulations! Your tournament join request was approved!');
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
      } else if (payload.status === 'rejected') {
        showNotification('info', 'Your request to join the tournament was declined.');
      }
    };

    socket.on('tournament_results_revealed', handleResultsRevealed);
    socket.on('tournament_request_status', handleRequestStatus);

    return () => {
      socket.off('tournament_results_revealed', handleResultsRevealed);
      socket.off('tournament_request_status', handleRequestStatus);
    };
  }, [socket, awaitingTournament, loadTournaments, showNotification]);

  // Periodic polling for awaiting holding screen (fallback if sockets are off)
  useEffect(() => {
    if (!awaitingTournament || isRevealedUnlock) return;
    const interval = setInterval(async () => {
      try {
        const tourn = await api.getTournament(awaitingTournament.tournamentId, userId);
        if (tourn && tourn.resultsRevealed) {
          setIsRevealedUnlock(true);
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#10B981', '#3B82F6']
          });
          showNotification('success', 'Official tournament results revealed!');
        }
      } catch {
        // Ignore polling errors
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [awaitingTournament, isRevealedUnlock, userId, showNotification]);

  // --- Load Leaderboard Tab Data ---
  const loadLeaderboardData = useCallback(async (tournId: string) => {
    if (!tournId) return;
    setIsLoadingLeaderboard(true);
    try {
      const data = await api.getTournamentLeaderboard(tournId, userId);
      if (data.resultsRevealed && data.leaderboard) {
        setLeaderboardEntries(data.leaderboard);
        setLeaderboardStatusMessage('');
      } else {
        setLeaderboardEntries([]);
        setLeaderboardStatusMessage(data.message || 'Results have not been revealed yet.');
      }
    } catch (err) {
      console.error('Failed to load tournament leaderboard:', err);
      setLeaderboardEntries([]);
      setLeaderboardStatusMessage('Could not retrieve leaderboard data.');
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'leaderboards') {
      const targetId = selectedLeaderboardId || (items[0]?.tournamentId);
      if (targetId && targetId !== selectedLeaderboardId) {
        setSelectedLeaderboardId(targetId);
      }
      if (targetId) {
        loadLeaderboardData(targetId);
      }
    }
  }, [activeTab, selectedLeaderboardId, items, loadLeaderboardData]);

  // --- Load History Tab Data ---
  useEffect(() => {
    if (activeTab === 'history') {
      const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const data = await api.getTournamentHistory();
          setHistoryItems(data);
        } catch (err) {
          console.error('Failed to load history:', err);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab]);

  // --- Request to Join Handler ---
  const handleRequestJoin = async (tournament: Tournament) => {
    if (!userId) {
      showNotification('warning', 'Please sign in to join tournaments');
      navigate('/login');
      return;
    }

    try {
      setJoiningId(tournament.tournamentId);
      const res = await api.requestJoinTournament(tournament.tournamentId, userId);
      setMessage(res.message);

      if (res.status === 'approved') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }

      await loadTournaments();
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError((err as Error).message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setJoiningId(null);
    }
  };

  // --- Start Quiz Action ---
  const handleStartTournamentQuiz = (tournament: Tournament) => {
    const targetQuizId = tournament.quizMode === 'custom'
      ? `tournament-${tournament.tournamentId}`
      : (tournament.quizIds?.[0] || `tournament-${tournament.tournamentId}`);

    navigate(`/quiz/${targetQuizId}?tournamentId=${tournament.tournamentId}`);
  };

  const handleSubscribeAlerts = () => {
    setAlertSubscribed(prev => !prev);
    if (!alertSubscribed) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      showNotification('success', 'Subscribed! You will be alerted when the next arena opens.');
    } else {
      showNotification('info', 'Unsubscribed from tournament alerts.');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'live') {
      return {
        bentoClass: 'bg-[#ff6b6b] text-white border-2 border-black shadow-[2px_2px_0px_#000]',
        regularClass: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
        text: 'LIVE NOW',
        icon: <Siren className="w-3.5 h-3.5 animate-pulse" />
      };
    }
    if (s === 'scheduled' || s === 'upcoming') {
      return {
        bentoClass: 'bg-[#93c5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]',
        regularClass: 'bg-blue-500/10 border border-blue-500/20 text-blue-400',
        text: 'UPCOMING',
        icon: <Clock className="w-3.5 h-3.5" />
      };
    }
    return {
      bentoClass: 'bg-slate-200 text-black border-2 border-black',
      regularClass: 'bg-gray-500/10 border border-gray-500/20 text-gray-400',
      text: 'COMPLETED',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTournamentTimingInfo = (startsAt: string, endsAt: string) => {
    const now = Date.now();
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();

    if (now < start) {
      const diffMins = Math.max(1, Math.round((start - now) / 60000));
      if (diffMins < 60) return { label: `Starts in ${diffMins}m`, state: 'upcoming' as const };
      const diffHours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      return {
        label: `Starts in ${diffHours}h${remMins > 0 ? ` ${remMins}m` : ''}`,
        state: 'upcoming' as const
      };
    } else if (now >= start && now <= end) {
      const remMins = Math.max(1, Math.round((end - now) / 60000));
      if (remMins < 60) return { label: `Live • ${remMins}m left in window`, state: 'live' as const };
      const diffHours = Math.floor(remMins / 60);
      const subMins = remMins % 60;
      return {
        label: `Live • ${diffHours}h${subMins > 0 ? ` ${subMins}m` : ''} left`,
        state: 'live' as const
      };
    } else {
      return { label: 'Arena Concluded', state: 'ended' as const };
    }
  };

  const filteredItems = items.filter(t => {
    const s = t.status?.toLowerCase();
    if (filter === 'live') return s === 'active' || s === 'live';
    if (filter === 'upcoming') return s === 'scheduled' || s === 'upcoming';
    if (filter === 'completed') return s === 'completed';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 relative z-10">
      {/* Header Card */}
      <div className={`rounded-[2.5rem] p-6 sm:p-8 md:p-10 relative overflow-hidden transition-all ${
        isBento
          ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
          : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-xl backdrop-blur-xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:rotate-3 ${
              isBento
                ? 'bg-[#fde047] text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30'
            }`}>
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3.5 py-1 rounded-full text-[11px] uppercase tracking-wider select-none inline-flex items-center gap-1.5 ${
                  isBento
                    ? 'font-black bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] -rotate-1'
                    : 'font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  SEASON 1 ARENA
                </span>
                <span className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-wider select-none inline-flex items-center gap-1 ${
                  isBento
                    ? 'font-black bg-[#bef264] text-black border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]'
                    : 'font-semibold text-gray-500 dark:text-gray-400'
                }`}>
                  <Zap className="w-3 h-3" />
                  LIVE COMPETITIVE BRACKETS
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                Tournaments
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base font-semibold max-w-xl">
                Compete in live scheduled events, earn instructor approvals, and climb the seasonal bracket!
              </p>
            </div>
          </div>

          {/* Quick Badges / Stat Highlights */}
          <div className="flex flex-wrap lg:flex-col gap-2.5 self-start lg:self-center">
            <div className={`px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 ${
              isBento
                ? 'bg-[#ddd6fe] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-bold'
            }`}>
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Gated Results Arena</span>
            </div>
            <div className={`px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 ${
              isBento
                ? 'bg-[#bef264] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
            }`}>
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Real-Time Leaderboard</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Arenas / Leaderboards / History) */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-gray-100 dark:border-white/5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('arenas')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'arenas'
                ? (isBento
                  ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-amber-500 text-white shadow-md shadow-amber-500/30')
                : (isBento
                  ? 'text-gray-700 hover:text-black font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold')
            }`}
          >
            <Swords className="w-4 h-4" />
            Competitive Arenas
          </button>

          <button
            onClick={() => setActiveTab('leaderboards')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'leaderboards'
                ? (isBento
                  ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-amber-500 text-white shadow-md shadow-amber-500/30')
                : (isBento
                  ? 'text-gray-700 hover:text-black font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold')
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Tournament Leaderboards
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? (isBento
                  ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-amber-500 text-white shadow-md shadow-amber-500/30')
                : (isBento
                  ? 'text-gray-700 hover:text-black font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold')
            }`}
          >
            <History className="w-4 h-4" />
            Past Archives & History
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center justify-center gap-3 transition-all animate-in slide-in-from-top-3 ${
          isBento
            ? 'bg-[#bef264] text-black border-2.5 border-black shadow-[4px_4px_0px_#000] font-black'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold shadow-lg'
        }`}>
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wide">{message}</span>
        </div>
      )}

      {error && (
        <div className={`p-4 rounded-2xl flex items-center justify-center gap-3 transition-all animate-in slide-in-from-top-3 ${
          isBento
            ? 'bg-[#fee2e2] text-red-900 border-2.5 border-black shadow-[4px_4px_0px_#000] font-black'
            : 'bg-red-500/10 border border-red-500/20 text-red-400 font-bold shadow-lg'
        }`}>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: COMPETITIVE ARENAS                                      */}
      {/* ============================================================== */}
      {activeTab === 'arenas' && (
        <div className="space-y-8">
          {/* Filter Sub-nav */}
          {items.length > 0 && (
            <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl max-w-xl mx-auto ${
              isBento
                ? 'bg-slate-100 dark:bg-white/5 border-2 border-black shadow-[3px_3px_0px_#000]'
                : 'bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm'
            }`}>
              {([
                { id: 'all', label: `All (${items.length})` },
                { id: 'live', label: `Live (${items.filter(i => ['active', 'live'].includes(i.status?.toLowerCase())).length})` },
                { id: 'upcoming', label: `Upcoming (${items.filter(i => ['scheduled', 'upcoming'].includes(i.status?.toLowerCase())).length})` },
                { id: 'completed', label: `Completed (${items.filter(i => i.status?.toLowerCase() === 'completed').length})` }
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id as typeof filter)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer text-center ${
                    filter === id
                      ? (isBento
                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                        : 'bg-amber-500 text-white shadow-md shadow-amber-500/30')
                      : (isBento
                        ? 'text-gray-700 hover:text-black hover:bg-black/5 font-bold'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold')
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Tournaments Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredItems.map(tournament => {
              const statusInfo = getStatusBadge(tournament.status);
              const isLive = ['active', 'live'].includes(tournament.status?.toLowerCase());
              const isCompleted = tournament.status?.toLowerCase() === 'completed';
              const isJoining = joiningId === tournament.tournamentId;

              const myStatus = tournament.myStatus || 'none';
              const hasSubmitted = tournament.hasSubmitted;
              const isRevealed = Boolean(tournament.resultsRevealed);

              return (
                <div
                  key={tournament.tournamentId}
                  className={`group relative rounded-[2.5rem] p-8 transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col justify-between ${
                    isBento
                      ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000] hover:shadow-[7px_7px_0px_#000]'
                      : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-xl'
                  }`}
                >
                  <div className="relative z-10 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          isBento
                            ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : isLive
                              ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white'
                              : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                        }`}>
                          <Crown className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                            {tournament.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                              isBento ? statusInfo.bentoClass : statusInfo.regularClass
                            }`}>
                              {statusInfo.icon} {statusInfo.text}
                            </span>

                            {/* Dynamic Live Timing Badge */}
                            {(() => {
                              const timing = getTournamentTimingInfo(tournament.startsAt, tournament.endsAt);
                              return (
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                  timing.state === 'live'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse'
                                    : timing.state === 'upcoming'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/5'
                                }`}>
                                  <Clock className="w-3 h-3 flex-shrink-0" />
                                  <span>{timing.label}</span>
                                </span>
                              );
                            })()}

                            {tournament.requiresApproval && (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                Approval Gated
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-semibold leading-relaxed line-clamp-2">
                      {tournament.description || 'Global competitive arena. Complete against participants under timer.'}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className={`rounded-xl p-3 flex flex-col justify-center ${
                        isBento ? 'bg-slate-100 text-black border border-black' : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5'
                      }`}>
                        <div className="text-gray-500 text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Kickoff
                        </div>
                        <div className="font-bold text-xs truncate">{formatDate(tournament.startsAt)}</div>
                      </div>

                      <div className={`rounded-xl p-3 flex flex-col justify-center ${
                        isBento ? 'bg-slate-100 text-black border border-black' : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5'
                      }`}>
                        <div className="text-gray-500 text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Timer className="w-3 h-3" /> Attempt Timer
                        </div>
                        <div className="font-bold text-xs truncate">
                          {tournament.durationMinutes ? `${tournament.durationMinutes} Mins` : 'Open Window'}
                        </div>
                      </div>

                      <div className={`rounded-xl p-3 flex flex-col justify-center ${
                        isBento ? 'bg-slate-100 text-black border border-black' : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5'
                      }`}>
                        <div className="text-gray-500 text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Roster
                        </div>
                        <div className="font-bold text-xs">{tournament.participants?.length || 0} Registered</div>
                      </div>

                      <div className={`rounded-xl p-3 flex flex-col justify-center ${
                        isBento ? 'bg-[#fde047] text-black border-2 border-black' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        <div className="text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Medal className="w-3 h-3" /> Prize
                        </div>
                        <div className="font-black text-xs">{tournament.rewardCoins || 1000} Coins</div>
                      </div>
                    </div>

                    {/* Arena Window & Attempt Rule Explainer Banner */}
                    <div className={`p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                      isBento
                        ? 'bg-slate-100 text-black border-2 border-black'
                        : 'bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 border border-blue-500/15'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          Window: <strong>{formatDate(tournament.startsAt)}</strong> → <strong>{formatTimeOnly(tournament.endsAt)}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black uppercase text-[10px] tracking-wider">
                        <Timer className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          {tournament.durationMinutes && tournament.durationMinutes > 0
                            ? `${tournament.durationMinutes} Mins Per Attempt Once Started`
                            : 'Open Untimed Window'}
                        </span>
                      </div>
                    </div>

                    {/* Participant Status Badges */}
                    {myStatus === 'pending' && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                        <Clock className="w-4 h-4 flex-shrink-0 animate-pulse" />
                        <span>Join Request Submitted! Awaiting instructor approval.</span>
                      </div>
                    )}

                    {myStatus === 'approved' && !hasSubmitted && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span>Approved to Compete! {isLive ? 'Arena is open now!' : 'Waiting for event kickoff.'}</span>
                      </div>
                    )}

                    {hasSubmitted && (
                      <div className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold ${
                        isRevealed
                          ? 'bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 flex-shrink-0" />
                          <span>{isRevealed ? 'Exam Completed & Results Revealed!' : 'Exam Submitted! Scores locked until instructor reveal.'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Action Button */}
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5">
                    {/* State 1: Submitted and Results Gated */}
                    {hasSubmitted && !isRevealed && (
                      <button
                        onClick={() => {
                          setAwaitingTournament(tournament);
                          setSearchParams({ awaiting: tournament.tournamentId });
                        }}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer hover:scale-[1.01] transition-all"
                      >
                        <Radio className="w-4 h-4 animate-pulse" /> View Submission & Awaiting Holding Screen
                      </button>
                    )}

                    {/* State 2: Submitted and Results Revealed */}
                    {hasSubmitted && isRevealed && (
                      <button
                        onClick={() => {
                          setSelectedLeaderboardId(tournament.tournamentId);
                          setActiveTab('leaderboards');
                        }}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 cursor-pointer hover:scale-[1.01] transition-all"
                      >
                        <Trophy className="w-4 h-4" /> View My Rank & Official Leaderboard
                      </button>
                    )}

                    {/* State 3: Approved and Live -> START QUIZ */}
                    {!hasSubmitted && myStatus === 'approved' && isLive && (
                      <button
                        onClick={() => handleStartTournamentQuiz(tournament)}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer animate-pulse transition-all"
                      >
                        <Swords className="w-5 h-5" /> 🔥 ENTER ARENA / START QUIZ NOW
                      </button>
                    )}

                    {/* State 4: Approved but Upcoming */}
                    {!hasSubmitted && myStatus === 'approved' && !isLive && !isCompleted && (
                      <button
                        disabled
                        className="w-full py-4 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                      >
                        <Clock className="w-4 h-4" /> APPROVED — WAITING FOR ARENA KICKOFF
                      </button>
                    )}

                    {/* State 5: Pending Approval */}
                    {!hasSubmitted && myStatus === 'pending' && (
                      <button
                        disabled
                        className="w-full py-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                      >
                        <Clock className="w-4 h-4 animate-spin" /> REQUEST PENDING INSTRUCTOR APPROVAL
                      </button>
                    )}

                    {/* State 6: Not Registered Yet */}
                    {!hasSubmitted && myStatus === 'none' && !isCompleted && (
                      <button
                        onClick={() => handleRequestJoin(tournament)}
                        disabled={isJoining}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          isBento
                            ? 'bg-[#bef264] text-black border-2.5 border-black shadow-[3.5px_3.5px_0px_#000] hover:bg-[#a3e635]'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                        }`}
                      >
                        {isJoining ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            SUBMITTING REQUEST...
                          </>
                        ) : tournament.requiresApproval ? (
                          <>
                            <Shield className="w-4 h-4" /> REQUEST TO JOIN TOURNAMENT
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" /> INSTANT REGISTER FOR ARENA
                          </>
                        )}
                      </button>
                    )}

                    {/* State 7: Event Completed & Not Participated */}
                    {!hasSubmitted && isCompleted && (
                      <button
                        onClick={() => {
                          setSelectedLeaderboardId(tournament.tournamentId);
                          setActiveTab('leaderboards');
                        }}
                        className="w-full py-3.5 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-200"
                      >
                        <Trophy className="w-4 h-4" /> VIEW FINAL LEADERBOARD
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center bg-white/40 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">
                  No Tournaments in this Category
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Switch the filter above or click notify below to be alerted for seasonal events.
                </p>
                <button
                  onClick={handleSubscribeAlerts}
                  className="mt-4 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 inline mr-1" /> Notify Next Event
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TOURNAMENT LEADERBOARDS                                 */}
      {/* ============================================================== */}
      {activeTab === 'leaderboards' && (
        <div className="space-y-6">
          {/* Tournament Picker Bar */}
          <div className="bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl p-5 rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-500" />
                Tournament Standings & Rankings
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Official competitive scores revealed by tournament masters
              </p>
            </div>

            <select
              value={selectedLeaderboardId}
              onChange={e => {
                setSelectedLeaderboardId(e.target.value);
                loadLeaderboardData(e.target.value);
              }}
              className="w-full sm:w-72 px-4 py-2.5 bg-gray-50 dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-black uppercase text-gray-900 dark:text-white outline-none cursor-pointer"
            >
              {items.map(t => (
                <option key={t.tournamentId} value={t.tournamentId}>
                  {t.name} {t.resultsRevealed ? '✓ (Revealed)' : '🔒 (Locked)'}
                </option>
              ))}
            </select>
          </div>

          {/* Results Gated Message */}
          {leaderboardStatusMessage && !isLoadingLeaderboard && (
            <div className="p-8 text-center bg-white/50 dark:bg-white/5 rounded-3xl border border-amber-500/20 space-y-3">
              <Lock className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="text-base font-black uppercase text-gray-900 dark:text-white">
                Results Not Revealed Yet
              </h4>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {leaderboardStatusMessage}
              </p>
            </div>
          )}

          {/* Podium Top 3 */}
          {leaderboardEntries.length >= 3 && !isLoadingLeaderboard && (
            <div className="grid grid-cols-3 gap-4 pt-4 max-w-2xl mx-auto items-end">
              <div className="bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl p-5 rounded-3xl border border-gray-200 dark:border-white/10 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-300 text-black font-black flex items-center justify-center text-lg shadow-sm">
                  🥈 2
                </div>
                <div className="text-xs font-black text-gray-900 dark:text-white uppercase truncate">{leaderboardEntries[1].userName}</div>
                <div className="text-sm font-black text-amber-500">{leaderboardEntries[1].score} Pts</div>
              </div>

              <div className="bg-gradient-to-b from-amber-500/20 to-white/70 dark:to-[#1a1b26]/70 backdrop-blur-xl p-6 rounded-3xl border-2 border-amber-500 text-center space-y-2 transform -translate-y-2 shadow-lg">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400 text-black font-black flex items-center justify-center text-2xl shadow-md shadow-amber-400/30">
                  👑 1
                </div>
                <div className="text-sm font-black text-gray-900 dark:text-white uppercase truncate">{leaderboardEntries[0].userName}</div>
                <div className="text-base font-black text-amber-500">{leaderboardEntries[0].score} Pts</div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white">
                  Champion
                </span>
              </div>

              <div className="bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl p-5 rounded-3xl border border-gray-200 dark:border-white/10 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-700/60 text-white font-black flex items-center justify-center text-lg shadow-sm">
                  🥉 3
                </div>
                <div className="text-xs font-black text-gray-900 dark:text-white uppercase truncate">{leaderboardEntries[2].userName}</div>
                <div className="text-sm font-black text-amber-500">{leaderboardEntries[2].score} Pts</div>
              </div>
            </div>
          )}

          {/* Full Table */}
          {leaderboardEntries.length > 0 && !isLoadingLeaderboard && (
            <div className="bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl rounded-3xl border border-gray-200/80 dark:border-white/10 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead className="bg-gray-50/50 dark:bg-black/20 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100 dark:border-white/5">
                    <tr>
                      <th className="py-3.5 px-4">Rank</th>
                      <th className="py-3.5 px-4">Participant</th>
                      <th className="py-3.5 px-4">Score</th>
                      <th className="py-3.5 px-4">Accuracy</th>
                      <th className="py-3.5 px-4">Time Taken</th>
                      <th className="py-3.5 px-4">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {leaderboardEntries.map(entry => {
                      const isMe = entry.userId === userId;
                      return (
                        <tr
                          key={entry.userId}
                          className={`transition-colors ${isMe ? 'bg-amber-500/10 font-black' : 'hover:bg-gray-50/40 dark:hover:bg-white/5'}`}
                        >
                          <td className="py-3 px-4 font-black">
                            {entry.rank === 1 && '🥇 1st'}
                            {entry.rank === 2 && '🥈 2nd'}
                            {entry.rank === 3 && '🥉 3rd'}
                            {entry.rank > 3 && `#${entry.rank}`}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-black text-gray-900 dark:text-white uppercase flex items-center gap-2">
                              {entry.userName}
                              {isMe && <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px]">YOU</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-tabular text-amber-500 font-black">{entry.score}</td>
                          <td className="py-3 px-4 font-tabular">{entry.percentage}%</td>
                          <td className="py-3 px-4 font-tabular">{Math.floor(entry.timeTaken / 60)}m {entry.timeTaken % 60}s</td>
                          <td className="py-3 px-4 font-tabular text-gray-400 text-[10px]">
                            {new Date(entry.submittedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PAST ARCHIVES & HISTORY                                 */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyItems.map(item => (
              <div
                key={item.tournamentId}
                className="bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-xl p-6 rounded-3xl border border-gray-200/80 dark:border-white/10 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-400">
                      Concluded Event
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {new Date(item.endsAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {item.description || 'Concluded seasonal arena event.'}
                  </p>

                  {/* Podium Preview */}
                  {item.podium?.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-2xl space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Top Champions</span>
                      {item.podium.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-bold">
                          <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {p.userName}</span>
                          <span className="text-amber-500 font-tabular font-black">{p.score} Pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedLeaderboardId(item.tournamentId);
                    setActiveTab('leaderboards');
                  }}
                  className="w-full py-3 bg-gray-100 dark:bg-white/5 hover:bg-amber-500 hover:text-white text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Inspect Leaderboard <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {historyItems.length === 0 && !isLoadingHistory && (
              <div className="col-span-full py-16 text-center bg-white/40 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-black uppercase text-gray-700 dark:text-gray-300">
                  No Past Concluded Tournaments Yet
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Completed tournaments will be archived here with winner podiums and rankings.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RESULTS GATING AWAITING REVEAL HOLDING MODAL                   */}
      {/* ============================================================== */}
      {awaitingTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1a1b26] rounded-3xl border border-gray-200 dark:border-white/10 max-w-lg w-full p-8 shadow-2xl relative space-y-6 text-center">
            <button
              onClick={() => {
                setAwaitingTournament(null);
                setSearchParams({});
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Radar / Celebration Graphic */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
                isRevealedUnlock ? 'bg-purple-500' : 'bg-amber-500'
              }`} />
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-xl relative z-10 ${
                isRevealedUnlock
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30'
                  : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30'
              }`}>
                {isRevealedUnlock ? <Unlock className="w-10 h-10" /> : <Trophy className="w-10 h-10" />}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                {isRevealedUnlock ? '🎉 Results are Revealed!' : 'Submission Received!'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-semibold max-w-sm mx-auto leading-relaxed">
                {isRevealedUnlock
                  ? 'The tournament master has published all scores and rankings. You can now see where you stand on the podium!'
                  : 'Your answers have been securely recorded. To maintain competitive integrity, scores are locked until the tournament master officially reveals results.'}
              </p>
            </div>

            {/* Live Status Pulse */}
            <div className={`p-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-wider ${
              isRevealedUnlock
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              <Radio className={`w-4 h-4 ${isRevealedUnlock ? '' : 'animate-spin'}`} />
              <span>{isRevealedUnlock ? 'Official Bracket Unlocked' : 'Listening for Teacher Reveal...'}</span>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              {isRevealedUnlock ? (
                <button
                  onClick={() => {
                    setSelectedLeaderboardId(awaitingTournament.tournamentId);
                    setActiveTab('leaderboards');
                    setAwaitingTournament(null);
                    setSearchParams({});
                  }}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" /> View My Official Rank on Leaderboard
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAwaitingTournament(null);
                    setSearchParams({});
                  }}
                  className="w-full py-3.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer transition-all"
                >
                  Back to Tournaments Arena
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tournaments;
