import React, { useEffect, useState } from 'react';
import type { Tournament } from '../../types';
import { api } from '../../lib/api';
import { Trophy, Users, Calendar, Clock, Crown, Medal, CheckCircle2, Siren } from 'lucide-react';
import confetti from 'canvas-confetti';

const Tournaments: React.FC<{ userId?: string }> = ({ userId }) => {
  const [items, setItems] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setItems(await api.getTournaments());
      } catch (err) {
        setError((err as Error).message);
      }
    };
    load();
  }, []);

  const join = async (id: string, name: string) => {
    if (!userId) return;
    try {
      setJoiningId(id);
      const res = await api.joinTournament(id, userId);
      setMessage(res.message || `Joined ${name}! 🎉`);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError((err as Error).message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setJoiningId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'live':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          text: 'LIVE NOW',
          icon: <Siren className="w-4 h-4 animate-pulse" />,
          pulse: true
        };
      case 'upcoming':
        return {
          bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          text: 'UPCOMING',
          icon: <Clock className="w-4 h-4" />,
          pulse: false
        };
      case 'completed':
        return {
          bg: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
          text: 'COMPLETED',
          icon: <CheckCircle2 className="w-4 h-4" />,
          pulse: false
        };
      default:
        return {
          bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
          text: status.toUpperCase(),
          icon: <Trophy className="w-4 h-4" />,
          pulse: false
        };
    }
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

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6 relative overflow-hidden selection:bg-purple-500/30">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-yellow-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse delay-700" />
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12 relative z-10">
        <div className="bg-[#13141f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Top Shine */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-500">
                <Trophy className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
                TOURNAMENTS
              </h1>
              <p className="text-lg text-gray-400 font-medium">Compete in scheduled events and win massive prizes!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {message && (
        <div className="max-w-6xl mx-auto mb-8 relative z-10">
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 backdrop-blur-md animate-in slide-in-from-top-4 fade-in">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-black text-lg uppercase tracking-wide">{message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-6xl mx-auto mb-8 relative z-10">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 backdrop-blur-md">
            <span className="font-bold">{error}</span>
          </div>
        </div>
      )}

      {/* Tournaments Grid */}
      <div className="max-w-7xl mx-auto relative z-10">
        {items.length === 0 && !error && (
          <div className="bg-[#13141f] border-dashed border border-white/10 rounded-[2.5rem] p-16 text-center">
            <Trophy className="w-24 h-24 text-gray-700 mx-auto mb-6" />
            <h3 className="text-3xl font-black text-gray-500 mb-2">ARENA EMPTY</h3>
            <p className="text-gray-600 text-lg">Check back later for strictly competitive events.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {items.map((tournament) => {
            const statusInfo = getStatusBadge(tournament.status);
            const isJoining = joiningId === tournament.tournamentId;
            const isLive = tournament.status.toLowerCase() === 'active' || tournament.status.toLowerCase() === 'live';
            const isCompleted = tournament.status.toLowerCase() === 'completed';

            return (
              <div
                key={tournament.tournamentId}
                className={`group relative bg-[#13141f] rounded-[2.5rem] p-8 border hover:border-white/10 shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden ${isLive ? 'border-emerald-500/30 shadow-emerald-500/10' : 'border-white/5'
                  }`}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${isLive ? 'from-emerald-900/10 to-transparent' : 'from-purple-900/10 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                {/* Top Shine */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                  {/* Header / Status */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${isLive
                        ? 'bg-gradient-to-br from-emerald-400 to-green-600'
                        : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                        }`}>
                        <Crown className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                          {tournament.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`px-3 py-1 rounded-lg border flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${statusInfo.bg}`}>
                            {statusInfo.icon} {statusInfo.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <Calendar className="w-3 h-3" /> Start
                      </div>
                      <div className="text-white font-bold text-sm">{formatDate(tournament.startsAt)}</div>
                    </div>

                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <Clock className="w-3 h-3" /> End
                      </div>
                      <div className="text-white font-bold text-sm">{formatDate(tournament.endsAt)}</div>
                    </div>

                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <Users className="w-3 h-3" /> Players
                      </div>
                      <div className="text-white font-bold text-sm">{Math.floor(Math.random() * 500) + 50} Entered</div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl p-4 border border-yellow-500/20 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase tracking-wider mb-1">
                        <Medal className="w-3 h-3" /> Prize
                      </div>
                      <div className="text-yellow-400 font-black text-lg">{Math.floor(Math.random() * 5000) + 1000}</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {userId && (
                    <button
                      onClick={() => join(tournament.tournamentId, tournament.name)}
                      disabled={isJoining || isCompleted}
                      className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-lg ${isCompleted
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : isLive
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white hover:shadow-emerald-500/40'
                          : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white hover:shadow-indigo-500/40'
                        } active:scale-95`}
                    >
                      {isJoining ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                          ENTERING ARENA...
                        </span>
                      ) : isCompleted ? (
                        'TOURNAMENT ENDED'
                      ) : isLive ? (
                        'JOIN LIVE EVENT'
                      ) : (
                        'REGISTER NOW'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Tournaments;
