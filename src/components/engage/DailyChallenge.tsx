import React, { useEffect, useState } from 'react';
import type { UserData, Quiz } from '../../types';
import { api } from '../../lib/api';
import { Flame, Calendar, Trophy, Play, CheckCircle2, Sparkles, Target, Zap, Swords, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyChallengeProps {
  user: UserData;
  quizzes: Quiz[];
  onStart: (quiz: Quiz) => void;
  onUserUpdate: (updates: Partial<UserData>) => void;
}

interface DailyChallengeData {
  quizId?: string;
  streak?: number;
  completed?: boolean;
  rewardCoins?: number;
  rewardXP?: number;
  rewardBadgeId?: string;
  rewardItemId?: string;
  title?: string;
  description?: string;
}

const DailyChallenge: React.FC<DailyChallengeProps> = ({ user, quizzes, onStart, onUserUpdate }) => {
  const [data, setData] = useState<DailyChallengeData>({});
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [badgeReward, setBadgeReward] = useState<any>(null); // Badge definition can be 'any' or proper type if available

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getDailyChallenge(user.userId);

        setData(res);

        if (res.rewardBadgeId) {
          try {
            const badge = await api.getBadgeNode(res.rewardBadgeId);
            setBadgeReward(badge);
          } catch (e) {
            console.error("Failed to load reward badge", e);
          }
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };
    load();
  }, [user.userId]);

  const complete = async () => {
    try {
      setCompleting(true);
      const res = await api.completeDailyChallenge(user.userId);
      onUserUpdate({
        dailyChallengeStreak: res.streak,
        coins: res.coins,
        streak: res.streak
      });
      setData(prev => ({ ...prev, completed: true, streak: res.streak }));

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FF6B35', '#F7931E', '#FDC830']
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCompleting(false);
    }
  };

  const quiz = quizzes.find(q => q.id === data.quizId || q._id === data.quizId);
  const streak = data.streak || 0;
  const isCompleted = data.completed;

  const getStreakLevel = (streak: number) => {
    if (streak >= 30) return { level: 'LEGENDARY', color: 'from-purple-500 to-pink-500', icon: '👑', border: 'border-purple-500/50', shadow: 'shadow-purple-500/50' };
    if (streak >= 14) return { level: 'MASTER', color: 'from-red-500 to-orange-600', icon: '🔥', border: 'border-red-500/50', shadow: 'shadow-red-500/50' };
    if (streak >= 7) return { level: 'ON FIRE', color: 'from-orange-400 to-yellow-500', icon: '⚡', border: 'border-orange-500/50', shadow: 'shadow-orange-500/50' };
    return { level: 'RISING', color: 'from-blue-400 to-cyan-500', icon: '🌟', border: 'border-blue-500/50', shadow: 'shadow-blue-500/50' };
  };

  const streakInfo = getStreakLevel(streak);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] text-gray-900 dark:text-white p-6 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse delay-700" />
      </div>

      {error && (
        <div className="max-w-4xl mx-auto mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-2 backdrop-blur-md">
          <Zap className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-12 relative z-10">
        <div className="bg-white dark:bg-[#13141f] rounded-[2.5rem] p-8 border border-gray-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
          {/* Top Shine */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gray-100/50 dark:from-white/5 to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform duration-500">
                <Swords className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-2 tracking-tight uppercase italic">
                Daily Challenge
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium max-w-lg">
                Conquer today's quest to earn bonus XP, Coins, and keep your streak alive!
              </p>
            </div>

            {/* Status Badge */}
            <div className={`px-6 py-3 rounded-2xl border ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'} backdrop-blur-md flex flex-col items-center min-w-[120px]`}>
              <span className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Status</span>
              <span className="text-xl font-black flex items-center gap-2">
                {isCompleted ? <><CheckCircle2 className="w-5 h-5" /> DONE</> : <><Target className="w-5 h-5" /> ACTIVE</>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak & Stats Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
        {/* Streak Card */}
        <div className="group relative col-span-1 md:col-span-2">
          <div className={`absolute inset-0 bg-gradient-to-r ${streakInfo.color} rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition-opacity`}></div>
          <div className="relative h-full bg-white dark:bg-[#13141f] rounded-[2.5rem] border border-gray-200 dark:border-white/5 p-8 flex items-center justify-between overflow-hidden">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Flame className={`w-6 h-6 ${streakInfo.shadow} text-orange-500 fill-orange-500 animate-pulse`} />
                <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-sm">Current Streak</span>
              </div>
              <div className="text-6xl font-black text-gray-900 dark:text-white tracking-tighter mb-1">
                {streak} <span className="text-2xl text-gray-400 dark:text-gray-500">DAYS</span>
              </div>
              <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 ${streakInfo.shadow} text-gray-900 dark:text-white`}>
                {streakInfo.icon} {streakInfo.level}
              </div>
            </div>
            <div className="opacity-10 scale-150 transform translate-x-4">
              <Flame className="w-40 h-40" />
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative h-full bg-white dark:bg-[#13141f] rounded-[2.5rem] border border-gray-200 dark:border-white/5 p-8 flex flex-col justify-center items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
              <Trophy className="w-7 h-7 text-white" />
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {data.rewardCoins || 50} <span className="text-sm font-bold text-yellow-600 dark:text-yellow-500">COINS</span>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {data.rewardXP || 100} <span className="text-sm font-bold text-blue-600 dark:text-blue-500">XP</span>
              </div>

              {badgeReward && (
                <div className="mt-2 text-sm font-bold text-purple-500 flex items-center justify-center gap-1">
                  <span className="text-xl">{badgeReward.icon}</span> Badge
                </div>
              )}
              {data.rewardItemId && (
                <div className="mt-1 text-sm font-bold text-pink-500 flex items-center justify-center gap-1">
                  <Gift className="w-4 h-4" /> Item
                </div>
              )}
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4">Completion Rewards</div>
          </div>
        </div>
      </div>

      {/* Quiz Card */}
      <div className="max-w-5xl mx-auto relative z-10">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          Today's Mission
        </h2>

        {quiz ? (
          <div className="group relative cursor-pointer" onClick={() => !isCompleted && !completing && onStart(quiz)}>
            {/* Hover Glow */}
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-[3rem] opacity-0 group-hover:opacity-50 blur-xl transition-all duration-500`}></div>

            <div className="relative bg-white dark:bg-[#13141f] rounded-[3rem] border border-gray-200 dark:border-white/5 p-10 overflow-hidden group-hover:-translate-y-1 transition-transform duration-300">
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-100/50 dark:from-white/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
                <div className="w-24 h-24 rounded-3xl bg-gray-50 dark:bg-[#0a0a0b] border border-gray-200 dark:border-white/10 flex items-center justify-center text-5xl shadow-lg dark:shadow-2xl group-hover:scale-105 transition-transform duration-500">
                  {quiz.icon || '🎯'}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      {quiz.category || 'General'}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                      {quiz.difficulty || 'Medium'}
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-red-500 transition-all">
                    {quiz.title}
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-2xl">
                    {quiz.description}
                  </p>

                  <div className="flex flex-wrap gap-6 mb-8">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                      <Target className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      {quiz.questions?.length || 0} Questions
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      {quiz.questions?.length * 10} Potential XP
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart(quiz);
                      complete();
                    }}
                    disabled={completing || isCompleted}
                    className={`w-full md:w-auto px-10 py-4 rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all transform active:scale-95 ${isCompleted
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white hover:shadow-orange-500/30'
                      }`}
                  >
                    {completing ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> LOADING...</>
                    ) : isCompleted ? (
                      <><CheckCircle2 className="w-6 h-6" /> COMPLETED</>
                    ) : (
                      <><Play className="w-6 h-6 fill-white" /> START CHALLENGE</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#13141f] rounded-[3rem] p-16 border border-gray-200 dark:border-white/5 text-center border-dashed">
            <Calendar className="w-24 h-24 text-gray-400 dark:text-gray-700 mx-auto mb-6" />
            <h3 className="text-3xl font-black text-gray-400 dark:text-gray-500 mb-2">No Challenges Active</h3>
            <p className="text-gray-500 dark:text-gray-600 text-lg">Check back tomorrow for a new mission.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyChallenge;
