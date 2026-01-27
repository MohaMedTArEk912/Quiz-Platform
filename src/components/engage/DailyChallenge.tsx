import React, { useEffect, useState, useRef } from 'react';
import type { UserData, DailyCompilerChallenge, CompilerSubmissionResult } from '../../types';
import { api } from '../../lib/api';
import { Flame, Calendar, Trophy, CheckCircle2, Sparkles, Target, Zap, Swords, Gift, Send, AlertCircle, Code2, ChevronDown, ChevronUp, Lightbulb, Loader2, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyChallengeProps {
  user: UserData;
  onUserUpdate: (updates: Partial<UserData>) => void;
}

const DailyChallenge: React.FC<DailyChallengeProps> = ({ user, onUserUpdate }) => {
  const [challenge, setChallenge] = useState<DailyCompilerChallenge | null>(null);
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CompilerSubmissionResult | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [loading, setLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.getDailyChallenge(user.userId);
        setChallenge(res);
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load daily challenge';
        if (errorMessage.includes('No compiler questions') || errorMessage.includes('not found')) {
          setError('No daily challenge available today. Check back tomorrow!');
        } else {
          setError(errorMessage);
        }
        console.error('Daily challenge error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.userId]);

  /**
   * Submit code for AI evaluation
   */
  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Please write some code before submitting');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await api.submitCompilerAnswer(code, user.userId) as CompilerSubmissionResult;
      setResult(res);

      if (res.passed) {
        // Trigger confetti on success
        confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0']
        });

        // Update user data
        if (res.rewards) {
          onUserUpdate({
            coins: (user.coins || 0) + res.rewards.coins,
            xp: user.xp + res.rewards.xp,
            dailyChallengeStreak: res.rewards.streak
          });
        }

        setChallenge(prev => prev ? { ...prev, completed: true } : null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit code');
    } finally {
      setSubmitting(false);
    }
  };

  const streak = user.dailyChallengeStreak || 0;
  const isCompleted = challenge?.completed || result?.passed;

  /**
   * Get streak level styling based on streak count
   */
  const getStreakLevel = (streakCount: number) => {
    if (streakCount >= 30) return { level: 'LEGENDARY', color: 'from-purple-500 to-pink-500', icon: '👑' };
    if (streakCount >= 14) return { level: 'MASTER', color: 'from-red-500 to-orange-600', icon: '🔥' };
    if (streakCount >= 7) return { level: 'ON FIRE', color: 'from-orange-400 to-yellow-500', icon: '⚡' };
    return { level: 'RISING', color: 'from-blue-400 to-cyan-500', icon: '🌟' };
  };

  const streakInfo = getStreakLevel(streak);

  /**
   * Get difficulty badge color
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'hard': return 'bg-red-500/10 border-red-500/20 text-red-400';
      default: return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading today's challenge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] text-gray-900 dark:text-white p-4 md:p-6 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse delay-700" />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-4xl mx-auto mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-2 backdrop-blur-md relative z-10">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded-lg transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8 relative z-10">
        <div className="bg-white dark:bg-[#13141f] rounded-[2rem] p-6 md:p-8 border border-gray-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gray-100/50 dark:from-white/5 to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform duration-500">
                <Swords className="w-10 h-10 text-white" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1 tracking-tight uppercase">
                Daily Code Challenge
              </h1>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Solve today's coding challenge. Score 70%+ to earn rewards!
              </p>
            </div>

            {/* Status Badge */}
            <div className={`px-5 py-3 rounded-xl border ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'} backdrop-blur-md flex flex-col items-center min-w-[100px]`}>
              <span className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Status</span>
              <span className="text-lg font-black flex items-center gap-2">
                {isCompleted ? <><CheckCircle2 className="w-5 h-5" /> DONE</> : <><Target className="w-5 h-5" /> ACTIVE</>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
        {/* Streak Card */}
        <div className="group relative md:col-span-2">
          <div className={`absolute inset-0 bg-gradient-to-r ${streakInfo.color} rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity`} />
          <div className="relative h-full bg-white dark:bg-[#13141f] rounded-2xl border border-gray-200 dark:border-white/5 p-6 flex items-center justify-between overflow-hidden">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
                <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-sm">Current Streak</span>
              </div>
              <div className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-1">
                {streak} <span className="text-xl text-gray-400 dark:text-gray-500">DAYS</span>
              </div>
              <div className="inline-flex px-2 py-1 rounded-lg text-xs font-black uppercase tracking-widest bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                {streakInfo.icon} {streakInfo.level}
              </div>
            </div>
            <div className="opacity-10 scale-125 transform translate-x-4">
              <Flame className="w-32 h-32" />
            </div>
          </div>
        </div>

        {/* Rewards Card */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
          <div className="relative h-full bg-white dark:bg-[#13141f] rounded-2xl border border-gray-200 dark:border-white/5 p-6 flex flex-col justify-center items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xl font-black text-gray-900 dark:text-white">
                {challenge?.rewards?.coins || 100} <span className="text-sm font-bold text-yellow-600 dark:text-yellow-500">COINS</span>
              </div>
              <div className="text-xl font-black text-gray-900 dark:text-white">
                {challenge?.rewards?.xp || 150} <span className="text-sm font-bold text-blue-600 dark:text-blue-500">XP</span>
              </div>
              {challenge?.rewards?.badgeId && (
                <div className="mt-2 text-sm font-bold text-purple-500 flex items-center justify-center gap-1">
                  <Gift className="w-4 h-4" /> Badge Reward
                </div>
              )}
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-3">Completion Rewards</div>
          </div>
        </div>
      </div>

      {/* Challenge Content */}
      {challenge?.question ? (
        <div className="max-w-5xl mx-auto relative z-10">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-3">
            <Code2 className="w-5 h-5 text-orange-500" />
            Today's Challenge
          </h2>

          <div className="bg-white dark:bg-[#13141f] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
            {/* Question Header */}
            <div className="p-6 border-b border-gray-200 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  {challenge.question.category}
                </span>
                <span className={`px-3 py-1 rounded-lg border text-xs font-black uppercase tracking-widest ${getDifficultyColor(challenge.question.difficulty)}`}>
                  {challenge.question.difficulty}
                </span>
                <span className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-black text-blue-400 uppercase tracking-widest">
                  {challenge.question.language}
                </span>
              </div>

              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
                {challenge.question.title}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {challenge.question.description}
              </p>

              {/* Hints Section */}
              {challenge.question.hints && challenge.question.hints.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 font-medium transition-colors"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {showHints ? 'Hide Hints' : `Show Hints (${challenge.question.hints.length})`}
                    {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showHints && (
                    <ul className="mt-3 space-y-2 pl-6 list-disc text-gray-600 dark:text-gray-400">
                      {challenge.question.hints.map((hint, idx) => (
                        <li key={idx}>{hint}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Code Editor */}
            <div className="p-6 bg-gray-50 dark:bg-[#0a0a0b]">
              <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Your Solution
              </label>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isCompleted || submitting}
                placeholder={`// Write your ${challenge.question.language} code here...`}
                className="w-full h-64 bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 rounded-xl p-4 font-mono text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                spellCheck={false}
              />

              {/* Submit Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || isCompleted || !code.trim()}
                  className={`px-8 py-3 rounded-xl font-black text-base uppercase tracking-widest flex items-center gap-3 shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isCompleted
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white hover:shadow-orange-500/30'
                    }`}
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Evaluating...</>
                  ) : isCompleted ? (
                    <><CheckCircle2 className="w-5 h-5" /> Completed</>
                  ) : (
                    <><Send className="w-5 h-5" /> Submit Code</>
                  )}
                </button>
              </div>
            </div>

            {/* AI Evaluation Result */}
            {result && (
              <div className={`p-6 border-t border-gray-200 dark:border-white/5 ${result.passed ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-2xl ${result.passed ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {result.score}%
                  </div>
                  <div>
                    <h4 className={`font-black text-xl ${result.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {result.passed ? '🎉 Challenge Passed!' : '❌ Not Quite There'}
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Required: {result.passThreshold}% • Your Score: {result.score}%
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#13141f] rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <h5 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    AI Feedback
                  </h5>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {result.feedback}
                  </p>
                </div>

                {result.passed && result.rewards && (
                  <div className="mt-4 flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-bold">
                      <Zap className="w-4 h-4" />
                      +{result.rewards.coins} Coins
                    </div>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                      <Target className="w-4 h-4" />
                      +{result.rewards.xp} XP
                    </div>
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold">
                      <Flame className="w-4 h-4" />
                      {result.rewards.streak} Day Streak
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="bg-white dark:bg-[#13141f] rounded-2xl p-12 border border-gray-200 dark:border-white/5 text-center border-dashed">
            <Calendar className="w-20 h-20 text-gray-400 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-gray-400 dark:text-gray-500 mb-2">No Challenge Available</h3>
            <p className="text-gray-500 dark:text-gray-600">Check back tomorrow for a new coding challenge.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyChallenge;
