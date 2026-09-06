import React, { useEffect, useState } from 'react';
import type { UserData } from '../../types';
import { api } from '../../lib/api';
import { Trophy, Target, Zap, Sparkles, BarChart2, Compass, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

interface AnalyticsPanelProps {
  user: UserData;
}

type CategoryStat = { category: string; average: number };
type AnalyticsSummary = {
  totalAttempts?: number;
  avgScore?: number;
  categoryStats?: CategoryStat[];
  global?: { userCount: number };
};

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ user }) => {
  const [data, setData] = useState<AnalyticsSummary>({});
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isBento } = useTheme();

  useEffect(() => {
    const load = async () => {
      try {
        setData(await api.getAnalyticsSummary(user.userId));
      } catch (err) {
        setError((err as Error).message);
      }
    };
    load();
  }, [user.userId]);

  if (error) return <div className="p-4 text-red-500 font-bold">{error}</div>;

  const totalAttempts = data.totalAttempts ?? user.totalAttempts ?? 0;
  const avgScore = data.avgScore ?? (totalAttempts > 0 ? Math.round(user.totalScore / totalAttempts) : 0);
  const categoryStats = data.categoryStats || [];

  const categoryColors = [
    { bg: 'bg-[#fde047]', border: 'border-amber-400', bar: 'bg-[#eab308]', text: 'text-amber-950' },
    { bg: 'bg-[#bef264]', border: 'border-lime-400', bar: 'bg-[#84cc16]', text: 'text-lime-950' },
    { bg: 'bg-[#bae6fd]', border: 'border-sky-400', bar: 'bg-[#0284c7]', text: 'text-sky-950' },
    { bg: 'bg-[#c4b5fd]', border: 'border-purple-400', bar: 'bg-[#8b5cf6]', text: 'text-purple-950' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-200/80 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Mastery & Performance</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Real-time accuracy, category strength & stats</p>
          </div>
        </div>

        <div className="flex items-center gap-2 select-none">
          <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider ${
            isBento
              ? 'font-black bg-[#bef264] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
              : 'font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          }`}>
            ⚡ Real-time
          </span>
          <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider ${
            isBento
              ? 'font-black bg-[#fde047] text-black border border-black shadow-[1.5px_1.5px_0px_#000]'
              : 'font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
          }`}>
            Level {user.level || 1}
          </span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Quizzes */}
        <div className={`p-4 rounded-2xl flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
          isBento
            ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-white dark:bg-[#13141f] border border-amber-200/80 dark:border-amber-500/20 shadow-sm dark:shadow-none text-gray-900 dark:text-white'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isBento
                ? 'font-black bg-white/70 border border-black text-black'
                : 'font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
            }`}>
              Completed
            </span>
            <Trophy className={`w-5 h-5 ${isBento ? 'text-black' : 'text-amber-500'}`} />
          </div>
          <div className="text-3xl font-black tracking-tight mb-0.5">{totalAttempts}</div>
          <div className={`text-[11px] font-bold ${isBento ? 'opacity-80' : 'text-gray-500 dark:text-gray-400'}`}>Quizzes Solved</div>
        </div>

        {/* Avg Score */}
        <div className={`p-4 rounded-2xl flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
          isBento
            ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-white dark:bg-[#13141f] border border-lime-200/80 dark:border-lime-500/20 shadow-sm dark:shadow-none text-gray-900 dark:text-white'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isBento
                ? 'font-black bg-white/70 border border-black text-black'
                : 'font-bold bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-400 border border-lime-200 dark:border-lime-500/20'
            }`}>
              Accuracy
            </span>
            <Target className={`w-5 h-5 ${isBento ? 'text-black' : 'text-lime-500'}`} />
          </div>
          <div className="text-3xl font-black tracking-tight mb-0.5">{avgScore}%</div>
          <div className={`text-[11px] font-bold ${isBento ? 'opacity-80' : 'text-gray-500 dark:text-gray-400'}`}>
            {avgScore >= 80 ? '🎯 Sharpshooter' : avgScore >= 60 ? '🔥 On Track' : '⚡ Warming Up'}
          </div>
        </div>

        {/* XP Progress */}
        <div className={`p-4 rounded-2xl flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
          isBento
            ? 'bg-[#bae6fd] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-white dark:bg-[#13141f] border border-sky-200/80 dark:border-sky-500/20 shadow-sm dark:shadow-none text-gray-900 dark:text-white'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isBento
                ? 'font-black bg-white/70 border border-black text-black'
                : 'font-bold bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20'
            }`}>
              Experience
            </span>
            <Zap className={`w-5 h-5 ${isBento ? 'text-black' : 'text-sky-500'}`} />
          </div>
          <div className="text-3xl font-black tracking-tight mb-0.5">{user.xp || 0}</div>
          <div className={`text-[11px] font-bold ${isBento ? 'opacity-80' : 'text-gray-500 dark:text-gray-400'}`}>Total XP Earned</div>
        </div>

        {/* Community Standing */}
        <div className={`p-4 rounded-2xl flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
          isBento
            ? 'bg-[#c4b5fd] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-white dark:bg-[#13141f] border border-purple-200/80 dark:border-purple-500/20 shadow-sm dark:shadow-none text-gray-900 dark:text-white'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isBento
                ? 'font-black bg-white/70 border border-black text-black'
                : 'font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
            }`}>
              Community
            </span>
            <Sparkles className={`w-5 h-5 ${isBento ? 'text-black' : 'text-purple-500'}`} />
          </div>
          <div className="text-3xl font-black tracking-tight mb-0.5">
            {data.global?.userCount ? `${data.global.userCount}` : 'Challenger'}
          </div>
          <div className={`text-[11px] font-bold ${isBento ? 'opacity-80' : 'text-gray-500 dark:text-gray-400'}`}>
            {data.global?.userCount ? 'Active Learners' : 'Global Leaderboard'}
          </div>
        </div>
      </div>

      {/* Category Performance & Radar */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>Subject Category Mastery</span>
          </h3>
          {categoryStats.length > 0 && (
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {categoryStats.length} Domains Tracked
            </span>
          )}
        </div>

        {categoryStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoryStats.map((c, i) => {
              const themeStyle = categoryColors[i % categoryColors.length];
              return (
                <div 
                  key={c.category} 
                  className={`p-3.5 rounded-2xl ${
                    isBento
                      ? `border-2 border-black shadow-[2.5px_2.5px_0px_#000] ${themeStyle.bg} ${themeStyle.text}`
                      : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs uppercase tracking-wider truncate">{c.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${
                      isBento
                        ? 'font-black bg-white border border-black shadow-[1px_1px_0px_#000] text-black'
                        : 'font-bold bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20'
                    }`}>
                      {c.average}%
                    </span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${
                    isBento
                      ? 'bg-white/80 border border-black p-[1px]'
                      : 'bg-gray-100 dark:bg-white/5 p-[1px]'
                  }`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        isBento ? themeStyle.bar : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      }`} 
                      style={{ width: `${Math.max(5, c.average)}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Gamified Empty State (When user has 0 category records) */
          <div className={`p-6 sm:p-8 rounded-3xl relative overflow-hidden text-center sm:text-left ${
            isBento
              ? 'bg-[#fefce8] dark:bg-[#1a1c29] border-3 border-black shadow-[5px_5px_0px_#000]'
              : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-lg">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider ${
                  isBento
                    ? 'bg-[#fde047] text-black font-black border border-black shadow-[1.5px_1.5px_0px_#000]'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20'
                }`}>
                  <Compass className="w-3.5 h-3.5" />
                  <span>Calibration Incomplete</span>
                </div>
                <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  No Subject Data Recorded Yet!
                </h4>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 leading-relaxed">
                  Solve your first quizzes across Frontend, Algorithms, or Systems roads to calibrate your radar chart, unlock weak-spot insights, and generate verified skill certificates.
                </p>
                {/* Popular Topics Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg ${
                    isBento
                      ? 'font-extrabold bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 border border-black shadow-[1px_1px_0px_#000]'
                      : 'font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                  }`}>
                    💻 Web Dev
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg ${
                    isBento
                      ? 'font-extrabold bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 border border-black shadow-[1px_1px_0px_#000]'
                      : 'font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                  }`}>
                    ⚡ Algorithms
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg ${
                    isBento
                      ? 'font-extrabold bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 border border-black shadow-[1px_1px_0px_#000]'
                      : 'font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                  }`}>
                    🗄️ Databases
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/')}
                className={`px-5 py-3 rounded-2xl uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isBento
                    ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-black text-xs border-2 border-black shadow-[3.5px_3.5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 active:scale-95'
                }`}
              >
                <span>⚡ Start First Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPanel;
