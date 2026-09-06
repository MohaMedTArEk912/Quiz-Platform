import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Tournament } from '../../types';
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
  Swords
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';

const Tournaments: React.FC<{ userId?: string }> = ({ userId }) => {
  const { isBento } = useTheme();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [alertSubscribed, setAlertSubscribed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getTournaments();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const join = async (id: string, name: string) => {
    if (!userId) {
      showNotification('warning', 'Please sign in to join tournaments');
      return;
    }
    try {
      setJoiningId(id);
      const res = await api.joinTournament(id, userId);
      setMessage(res.message || `Joined ${name}! 🎉`);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#bef264', '#ddd6fe']
      });

      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      setError((err as Error).message);
      setTimeout(() => setError(null), 3500);
    } finally {
      setJoiningId(null);
    }
  };

  const handleSubscribeAlerts = () => {
    setAlertSubscribed(prev => !prev);
    if (!alertSubscribed) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
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
    if (s === 'upcoming') {
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

  const filteredItems = items.filter(t => {
    const s = t.status?.toLowerCase();
    if (filter === 'live') return s === 'active' || s === 'live';
    if (filter === 'upcoming') return s === 'upcoming';
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
            {/* Trophy Icon */}
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
                  SEASON 1 COMPETITIVE ARENA
                </span>
                <span className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-wider select-none inline-flex items-center gap-1 ${
                  isBento
                    ? 'font-black bg-[#bef264] text-black border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]'
                    : 'font-semibold text-gray-500 dark:text-gray-400'
                }`}>
                  <Zap className="w-3 h-3" />
                  GLOBAL BRACKETS
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                Tournaments
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base font-semibold max-w-xl">
                Compete in scheduled events, climb the grand bracket, and win massive coin prize pools!
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
              <span>Tier-1 Champion Flair</span>
            </div>
            <div className={`px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 ${
              isBento
                ? 'bg-[#bef264] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
            }`}>
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Double XP Multiplier</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
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

      {/* Error Banner */}
      {error && (
        <div className={`p-4 rounded-2xl flex items-center justify-center gap-3 transition-all animate-in slide-in-from-top-3 ${
          isBento
            ? 'bg-[#fee2e2] text-red-900 border-2.5 border-black shadow-[4px_4px_0px_#000] font-black'
            : 'bg-red-500/10 border border-red-500/20 text-red-400 font-bold shadow-lg'
        }`}>
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Filter Tabs Navigation */}
      {items.length > 0 && (
        <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl max-w-xl mx-auto ${
          isBento
            ? 'bg-slate-100 dark:bg-white/5 border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm'
        }`}>
          {([
            { id: 'all', label: `All (${items.length})` },
            { id: 'live', label: `Live (${items.filter(i => ['active', 'live'].includes(i.status?.toLowerCase())).length})` },
            { id: 'upcoming', label: `Upcoming (${items.filter(i => i.status?.toLowerCase() === 'upcoming').length})` },
            { id: 'completed', label: `Completed (${items.filter(i => i.status?.toLowerCase() === 'completed').length})` }
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id as typeof filter)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer text-center ${
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

      {/* Empty State Card */}
      {!loading && items.length === 0 && !error && (
        <div className="space-y-10">
          <div className={`rounded-[2.5rem] p-8 sm:p-12 md:p-16 text-center relative overflow-hidden transition-all ${
            isBento
              ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
              : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-xl backdrop-blur-xl'
          }`}>
            {/* Trophy Icon Art */}
            <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center transition-transform hover:scale-105 ${
              isBento
                ? 'bg-[#ddd6fe] text-black border-3 border-black shadow-[4px_4px_0px_#000]'
                : 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400'
            }`}>
              <Trophy className="w-12 h-12" />
            </div>

            {/* Intermission Badge */}
            <div className="inline-block mb-3">
              <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider select-none inline-flex items-center gap-1.5 ${
                isBento
                  ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                ARENA IN INTERMISSION
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-gray-900 dark:text-white mb-3">
              No Active Tournaments Right Now
            </h2>

            <p className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base max-w-xl mx-auto mb-8">
              The Grand Arena is currently in cooldown while tournament masters calibrate the next seasonal bracket. Hone your skills in Solo Practice, rally your allies in Clan Wars, or subscribe for kickoff alerts!
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => navigate('/')}
                className={`px-6 py-3.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  isBento
                    ? 'bg-[#bef264] text-black border-2.5 border-black shadow-[3.5px_3.5px_0px_#000] hover:bg-[#a3e635] active:translate-y-0.5'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95'
                }`}
              >
                <Swords className="w-4 h-4" />
                Enter Solo Practice
              </button>

              <button
                onClick={() => navigate('/clans')}
                className={`px-6 py-3.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  isBento
                    ? 'bg-[#ddd6fe] text-black border-2.5 border-black shadow-[3.5px_3.5px_0px_#000] hover:bg-[#c4b5fd] active:translate-y-0.5'
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25 hover:scale-105 active:scale-95'
                }`}
              >
                <Shield className="w-4 h-4" />
                Clan Wars Hub
              </button>

              <button
                onClick={() => navigate('/leaderboard')}
                className={`px-5 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isBento
                    ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-gray-100'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                <Trophy className="w-4 h-4" />
                Leaderboards
              </button>

              <button
                onClick={handleSubscribeAlerts}
                className={`px-5 py-3.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                  alertSubscribed
                    ? (isBento
                      ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                      : 'bg-emerald-600 text-white shadow-md')
                    : (isBento
                      ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fef08a]'
                      : 'bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-300')
                }`}
              >
                <Bell className={`w-4 h-4 ${alertSubscribed ? 'fill-current' : ''}`} />
                {alertSubscribed ? 'Alerts Active ✓' : 'Notify Next Event'}
              </button>
            </div>
          </div>

          {/* Arena Feature Showcase Bento Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isBento
                  ? 'bg-[#fde047] text-black border-1.5 border-black shadow-[1.5px_1.5px_0px_#000]'
                  : 'bg-amber-500/10 text-amber-500 font-bold'
              }`}>
                COMPETITIVE FORMATS
              </span>
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                Upcoming Arena Events
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Showcase Card 1 */}
              <div className={`p-6 rounded-[2rem] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isBento
                  ? 'bg-white text-black border-2.5 border-black shadow-[4px_4px_0px_#000]'
                  : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-lg'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isBento
                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <Crown className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      isBento ? 'bg-[#fde047] text-black border border-black' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      WEEKLY FINALS
                    </span>
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-tight mb-2">
                    5,000 Coin Prize Pool
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium leading-relaxed">
                    Knockout speed quiz rounds every weekend. Top 3 champions take home massive coins and exclusive seasonal profile banners.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Format: Elimination</span>
                  <span className="font-black text-amber-500">Tier 1</span>
                </div>
              </div>

              {/* Showcase Card 2 */}
              <div className={`p-6 rounded-[2rem] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isBento
                  ? 'bg-white text-black border-2.5 border-black shadow-[4px_4px_0px_#000]'
                  : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-lg'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isBento
                        ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                        : 'bg-violet-500/10 text-violet-500'
                    }`}>
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      isBento ? 'bg-[#ddd6fe] text-black border border-black' : 'bg-violet-500/10 text-violet-500'
                    }`}>
                      CLAN WARS
                    </span>
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-tight mb-2">
                    Guild Multiplier XP
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium leading-relaxed">
                    Rally your clan comrades. Every correct streak unlocks bonus multipliers for your entire guild and boosts your clan prestige.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Format: Team Total</span>
                  <span className="font-black text-violet-500">Multipliers</span>
                </div>
              </div>

              {/* Showcase Card 3 */}
              <div className={`p-6 rounded-[2rem] flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                isBento
                  ? 'bg-white text-black border-2.5 border-black shadow-[4px_4px_0px_#000]'
                  : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-lg'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isBento
                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      <Zap className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      isBento ? 'bg-[#bef264] text-black border border-black' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      BLITZ ROUNDS
                    </span>
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-tight mb-2">
                    15-Second Sudden Death
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium leading-relaxed">
                    Lightning speed trivia where hesitation is defeat. Instant correct answers give combo point boosts to separate true quiz savants.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Format: Sudden Death</span>
                  <span className="font-black text-emerald-500">Rapid Fire</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournaments Grid (When tournaments exist) */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredItems.map((tournament) => {
            const statusInfo = getStatusBadge(tournament.status);
            const isJoining = joiningId === tournament.tournamentId;
            const isLive = ['active', 'live'].includes(tournament.status?.toLowerCase());
            const isCompleted = tournament.status?.toLowerCase() === 'completed';

            return (
              <div
                key={tournament.tournamentId}
                className={`group relative rounded-[2.5rem] p-8 transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
                  isBento
                    ? 'bg-white text-black border-3 border-black shadow-[5px_5px_0px_#000] hover:shadow-[7px_7px_0px_#000]'
                    : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-xl'
                }`}
              >
                <div className="relative z-10 space-y-6">
                  {/* Header / Status */}
                  <div className="flex justify-between items-start">
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
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                            isBento ? statusInfo.bentoClass : statusInfo.regularClass
                          }`}>
                            {statusInfo.icon} {statusInfo.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`rounded-xl p-3 flex flex-col justify-center ${
                      isBento
                        ? 'bg-slate-100 text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                        : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5'
                    }`}>
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-black uppercase tracking-wider mb-0.5">
                        <Calendar className="w-3 h-3" /> Start
                      </div>
                      <div className="font-bold text-xs sm:text-sm truncate">{formatDate(tournament.startsAt)}</div>
                    </div>

                    <div className={`rounded-xl p-3 flex flex-col justify-center ${
                      isBento
                        ? 'bg-slate-100 text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                        : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5'
                    }`}>
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-black uppercase tracking-wider mb-0.5">
                        <Clock className="w-3 h-3" /> End
                      </div>
                      <div className="font-bold text-xs sm:text-sm truncate">{formatDate(tournament.endsAt)}</div>
                    </div>

                    <div className={`rounded-xl p-3 flex flex-col justify-center ${
                      isBento
                        ? 'bg-slate-100 text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                        : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5'
                    }`}>
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-black uppercase tracking-wider mb-0.5">
                        <Users className="w-3 h-3" /> Players
                      </div>
                      <div className="font-bold text-xs sm:text-sm">{tournament.participants?.length || 0} Registered</div>
                    </div>

                    <div className={`rounded-xl p-3 flex flex-col justify-center ${
                      isBento
                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                        : 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 text-yellow-500'
                    }`}>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider mb-0.5">
                        <Medal className="w-3 h-3" /> Prize
                      </div>
                      <div className="font-black text-sm sm:text-base">1,000 Coins</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {userId && (
                    <button
                      onClick={() => join(tournament.tournamentId, tournament.name)}
                      disabled={isJoining || isCompleted}
                      className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed'
                          : isBento
                            ? 'bg-[#bef264] text-black border-2.5 border-black shadow-[3.5px_3.5px_0px_#000] hover:bg-[#a3e635] active:translate-y-0.5'
                            : isLive
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                      }`}
                    >
                      {isJoining ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ENTERING ARENA...
                        </span>
                      ) : isCompleted ? (
                        'TOURNAMENT ENDED'
                      ) : isLive ? (
                        'JOIN LIVE EVENT'
                      ) : (
                        'REGISTER FOR TOURNAMENT'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tournaments;
