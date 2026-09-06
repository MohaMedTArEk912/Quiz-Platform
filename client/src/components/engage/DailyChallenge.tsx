import React, { useEffect, useState, useRef } from 'react';
import type { UserData, DailyCompilerChallenge, CompilerSubmissionResult } from '../../types';
import { api } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Flame, Calendar, Trophy, CheckCircle2, Sparkles, Target, Zap, Swords, Gift, Send, AlertCircle, Code2, ChevronDown, ChevronUp, Lightbulb, Loader2, XCircle, Play, Terminal } from 'lucide-react';
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

const DailyChallenge: React.FC<DailyChallengeProps> = ({ user, onUserUpdate }) => {
  const { isBento } = useTheme();
  const [challenge, setChallenge] = useState<DailyCompilerChallenge | null>(null);
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<RunOutput | null>(null);
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
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load daily challenge';
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
   * Run code without submitting (test/debug mode)
   */
  const handleRunCode = async () => {
    if (!code.trim()) {
      setError('Please write some code before running');
      return;
    }

    setError(null);
    setRunning(true);
    setRunOutput(null);

    try {
      const language = challenge?.question?.language || 'javascript';
      const res = await api.runCode(code, language);
      setRunOutput({
        output: res.output || '(No output)',
        isError: res.isError || false,
        executionTime: res.executionTime,
        memory: res.memory
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to run code';
      setRunOutput({
        output: message,
        isError: true
      });
    } finally {
      setRunning(false);
    }
  };

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit code';
      setError(message);
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
              <h1 className={`text-2xl md:text-3xl font-black mb-1 tracking-tight ${isBento ? 'text-black uppercase' : 'text-slate-900 dark:text-white'}`}>
                Daily Code Challenge
              </h1>
              <p className={`text-sm ${isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                Solve today's algorithmic puzzle. Score 70%+ to earn coins, XP, and streak bonuses!
              </p>
            </div>

            {/* Status Badge */}
            <div className={`px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[110px] transition-all ${
              isBento
                ? isCompleted
                  ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'bg-[#93c5fd] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                : isCompleted
                  ? 'glass-card border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'glass-card border border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
            }`}>
              <span className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${isBento ? 'text-black/70' : 'opacity-60'}`}>Status</span>
              <span className="text-sm font-black flex items-center gap-1.5">
                {isCompleted ? <><CheckCircle2 className="w-4 h-4" /> DONE</> : <><Target className="w-4 h-4" /> ACTIVE</>}
              </span>
            </div>
          </div>
        </div>
      </div>

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
              {(challenge?.rewards?.coins || 100).toLocaleString()} <span className={`text-xs font-black ${isBento ? 'text-black/70' : 'text-amber-500'}`}>COINS</span>
            </div>
            <div className={`font-tabular text-xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
              {(challenge?.rewards?.xp || 150).toLocaleString()} <span className={`text-xs font-black ${isBento ? 'text-black/70' : 'text-indigo-500'}`}>XP</span>
            </div>
            {challenge?.rewards?.badgeId && (
              <div className={`mt-1 text-xs font-black flex items-center justify-center gap-1 ${isBento ? 'text-black' : 'text-purple-500'}`}>
                <Gift className="w-3.5 h-3.5" /> Badge Reward
              </div>
            )}
          </div>
          <div className={`text-[10px] font-black uppercase tracking-wider mt-2.5 ${isBento ? 'text-black/70' : 'text-slate-400'}`}>Completion Rewards</div>
        </div>
      </div>

      {/* Challenge Content */}
      {challenge?.question ? (
        <div className="max-w-5xl mx-auto relative z-10">
          <h2 className={`text-xl font-black mb-4 flex items-center gap-3 ${isBento ? 'text-black uppercase tracking-tight' : 'text-gray-900 dark:text-white'}`}>
            <Code2 className={`w-5 h-5 ${isBento ? 'text-black' : 'text-orange-500'}`} />
            Today's Challenge
          </h2>

          <div className={`rounded-3xl overflow-hidden transition-all ${
            isBento
              ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
              : 'glass-card border border-slate-200/80 dark:border-white/10'
          }`}>
            {/* Question Header */}
            <div className={`p-6 ${isBento ? 'border-b-3 border-black bg-white' : 'border-b border-slate-200/80 dark:border-white/10'}`}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                  isBento
                    ? 'bg-[#ddd6fe] text-black border-2 border-black'
                    : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'
                }`}>
                  {challenge.question.category}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                  isBento
                    ? 'bg-[#fdba74] text-black border-2 border-black'
                    : `border ${getDifficultyColor(challenge.question.difficulty)}`
                }`}>
                  {challenge.question.difficulty}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                  isBento
                    ? 'bg-[#93c5fd] text-black border-2 border-black'
                    : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400'
                }`}>
                  {challenge.question.language}
                </span>
              </div>

              <h3 className={`text-xl font-black mb-2 ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                {challenge.question.title}
              </h3>

              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isBento ? 'text-black/80 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                {challenge.question.description}
              </p>

              {/* Hints Section */}
              {challenge.question.hints && challenge.question.hints.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className={`flex items-center gap-1.5 font-black text-xs transition-colors cursor-pointer ${
                      isBento ? 'text-black underline' : 'text-amber-600 dark:text-amber-400 hover:text-amber-500 font-semibold'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    {showHints ? 'Hide Hints' : `Show Hints (${challenge.question.hints.length})`}
                    {showHints ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showHints && (
                    <ul className={`mt-2.5 space-y-1.5 pl-5 list-disc text-xs leading-relaxed ${isBento ? 'text-black/80 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                      {challenge.question.hints.map((hint, idx) => (
                        <li key={idx}>{hint}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Code Editor */}
            <div className={`p-6 ${isBento ? 'bg-[#fef9c3]/30 border-t-3 border-black' : 'bg-slate-50/50 dark:bg-black/20'}`}>
              <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${isBento ? 'text-black' : 'text-slate-500 dark:text-slate-400'}`}>
                Your Solution
              </label>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isCompleted || submitting || running}
                placeholder={`// Write your ${challenge.question.language} code here...`}
                className={`w-full h-64 rounded-2xl p-4 font-mono text-xs sm:text-sm resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  isBento
                    ? 'bg-black text-[#bef264] border-3 border-black shadow-[4px_4px_0px_#000] focus:ring-3 focus:ring-black'
                    : 'bg-slate-900 text-emerald-400 dark:bg-[#070b14] border border-slate-700/60 dark:border-white/10 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 shadow-inner'
                }`}
                spellCheck={false}
              />

              {/* Run Output Panel */}
              {runOutput && (
                <div className={`mt-4 rounded-2xl border-3 border-black overflow-hidden ${
                  isBento
                    ? runOutput.isError ? 'bg-[#fecdd3] text-black shadow-[4px_4px_0px_#000]' : 'bg-[#dcfce7] text-black shadow-[4px_4px_0px_#000]'
                    : runOutput.isError ? 'border-rose-500/30 bg-rose-500/5' : 'border-emerald-500/30 bg-emerald-500/5'
                }`}>
                  <div className={`px-4 py-2 flex items-center justify-between border-b-2 border-black ${
                    isBento
                      ? runOutput.isError ? 'bg-[#fda4af]' : 'bg-[#bbf7d0]'
                      : runOutput.isError ? 'bg-rose-500/10' : 'bg-emerald-500/10'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Terminal className={`w-4 h-4 ${isBento ? 'text-black' : runOutput.isError ? 'text-rose-400' : 'text-emerald-400'}`} />
                      <span className={`text-xs font-black uppercase tracking-wider ${isBento ? 'text-black' : runOutput.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {runOutput.isError ? 'Error' : 'Output'}
                      </span>
                    </div>
                    {runOutput.executionTime && (
                      <span className={`text-[11px] font-tabular font-bold ${isBento ? 'text-black/80' : 'text-slate-400'}`}>
                        {runOutput.executionTime}s {runOutput.memory ? `• ${(runOutput.memory / 1024).toFixed(1)} KB` : ''}
                      </span>
                    )}
                  </div>
                  <pre className={`p-4 font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap ${isBento ? 'text-black font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                    {runOutput.output}
                  </pre>
                </div>
              )}

              {/* Buttons Row */}
              <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-end">
                {/* Run Only Button */}
                <button
                  onClick={handleRunCode}
                  disabled={running || submitting || !code.trim()}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.985] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
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
                  disabled={submitting || isCompleted || !code.trim() || running}
                  className={`px-7 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                    isBento
                      ? isCompleted
                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] cursor-default'
                        : 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000]'
                      : isCompleted
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25'
                  }`}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
                  ) : isCompleted ? (
                    <><CheckCircle2 className="w-4 h-4" /> Completed</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Code</>
                  )}
                </button>
              </div>
            </div>

            {/* AI Evaluation Result */}
            {result && (
              <div className={`p-6 border-t-3 border-black ${
                isBento
                  ? result.passed ? 'bg-[#f0fdf4]' : 'bg-[#fff1f2]'
                  : result.passed ? 'border-slate-200/80 dark:border-white/10 bg-emerald-500/[0.04]' : 'border-slate-200/80 dark:border-white/10 bg-rose-500/[0.04]'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl font-tabular ${
                    isBento
                      ? result.passed
                        ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-[#fda4af] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                      : result.passed
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                  }`}>
                    {result.score}%
                  </div>
                  <div>
                    <h4 className={`font-black text-lg sm:text-xl ${
                      isBento
                        ? 'text-black'
                        : result.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {result.passed ? '🎉 Challenge Passed!' : '❌ Needs Improvement'}
                    </h4>
                    <p className={`text-xs ${isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                      Required: <span className="font-tabular">{result.passThreshold}%</span> • Your Score: <span className="font-tabular font-bold">{result.score}%</span>
                    </p>
                  </div>
                </div>

                <div className={`rounded-2xl p-4 transition-all ${
                  isBento
                    ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                    : 'glass-panel border border-slate-200/80 dark:border-white/10'
                }`}>
                  <h5 className={`font-black text-xs uppercase tracking-wider mb-2 flex items-center gap-2 ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                    <Sparkles className={`w-3.5 h-3.5 ${isBento ? 'text-black' : 'text-amber-500'}`} />
                    AI Code Analysis & Feedback
                  </h5>
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isBento ? 'text-black font-mono' : 'text-slate-600 dark:text-slate-400'}`}>
                    {result.feedback}
                  </p>
                </div>

                {result.passed && result.rewards && (
                  <div className="mt-4 flex flex-wrap items-center gap-5 text-xs font-black">
                    <div className={`flex items-center gap-1.5 font-tabular ${isBento ? 'text-black' : 'text-amber-500'}`}>
                      <Zap className="w-4 h-4" />
                      +{result.rewards.coins.toLocaleString()} Coins
                    </div>
                    <div className={`flex items-center gap-1.5 font-tabular ${isBento ? 'text-black' : 'text-indigo-500'}`}>
                      <Target className="w-4 h-4" />
                      +{result.rewards.xp.toLocaleString()} XP
                    </div>
                    <div className={`flex items-center gap-1.5 font-tabular ${isBento ? 'text-black' : 'text-orange-500'}`}>
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
          <div className={`rounded-3xl p-12 text-center transition-all ${
            isBento
              ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
              : 'glass-card border border-dashed border-slate-300 dark:border-white/10'
          }`}>
            <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-3 opacity-50" />
            <h3 className={`text-lg font-black mb-1 ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>No Challenge Available</h3>
            <p className={`text-xs ${isBento ? 'text-black/70' : 'text-slate-500'}`}>Check back tomorrow for a new coding challenge.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyChallenge;
