import React, { useEffect, useState, useCallback } from 'react';
import type { UserData } from '../../types';
import { api } from '../../lib/api';
import {
  Trophy,
  Target,
  Zap,
  Sparkles,
  BarChart2,
  Compass,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Award,
  Swords,
  Flame,
  Lightbulb,
  RotateCcw,
  ChevronRight,
  Brain,
  XCircle,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

interface AnalyticsPanelProps {
  user: UserData;
}

interface CategoryStat {
  category: string;
  average: number;
  attemptsCount?: number;
  passedCount?: number;
  passRate?: number;
  highestScore?: number;
}

interface RecentAttempt {
  quizId: string;
  title: string;
  category: string;
  percentage: number;
  score: number;
  totalQuestions: number;
  passed: boolean;
  completedAt: string | Date;
}

interface RawWrongAnswer {
  quizId: string;
  quizTitle: string;
  category: string;
  question: string;
  codeSnippet?: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  completedAt?: string | Date;
}

interface WeakTopicStat {
  topic: string;
  category: string;
  quizId: string;
  wrongCount: number;
  totalAnswered: number;
  errorRate: number;
  accuracy: number;
}

interface AiTopicToStudy {
  topic: string;
  category: string;
  priority: 'High' | 'Medium' | 'Review' | string;
  errorRate?: number;
  wrongCount?: number;
  reason: string;
  studySteps: string[];
  recommendedQuizId?: string;
}

interface AiMistakeBreakdown {
  question: string;
  quizTitle: string;
  category: string;
  quizId?: string;
  userAnswer: string;
  correctAnswer: string;
  whyWrong: string;
  coreConcept: string;
  memoryTip: string;
}

interface AiPracticeQuestion {
  id: string;
  topic: string;
  category: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface AiMistakeAnalysisResponse {
  generatedByAi: boolean;
  executiveSummary: string;
  topicsToStudy: AiTopicToStudy[];
  mistakeBreakdowns: AiMistakeBreakdown[];
  aiPracticeQuestions: AiPracticeQuestion[];
}

interface AnalyticsSummary {
  totalAttempts?: number;
  avgScore?: number;
  categoryStats?: CategoryStat[];
  strengths?: CategoryStat[];
  weakAreas?: CategoryStat[];
  recentAttempts?: RecentAttempt[];
  wrongAnswers?: RawWrongAnswer[];
  weakTopics?: WeakTopicStat[];
  global?: { userCount: number };
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ user }) => {
  const [data, setData] = useState<AnalyticsSummary>({});
  const [aiAnalysis, setAiAnalysis] = useState<AiMistakeAnalysisResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedMistakeCategory, setSelectedMistakeCategory] = useState<string>('ALL');
  const [remedialAnswers, setRemedialAnswers] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const { isBento } = useTheme();

  const runAiAnalysis = useCallback(async () => {
    try {
      setIsAiLoading(true);
      setAiError(null);
      const res = await api.getAiMistakeAnalysis(user.userId);
      setAiAnalysis(res);
      setRemedialAnswers({});
    } catch (err) {
      console.error('AI analysis error:', err);
      setAiError('Could not reach AI coach right now. Showing local mistake diagnostics below.');
    } finally {
      setIsAiLoading(false);
    }
  }, [user.userId]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await api.getAnalyticsSummary(user.userId);
        if (isMounted) {
          setData(res || {});
          if (res?.wrongAnswers && res.wrongAnswers.length > 0) {
            runAiAnalysis();
          }
        }
      } catch (err) {
        console.error('Analytics load error:', err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user.userId, runAiAnalysis]);

  const totalAttempts = data.totalAttempts ?? 0;
  const avgScore = Math.round(data.avgScore ?? 0);
  const categoryStats = [...(data.categoryStats || [])].sort((a, b) => b.average - a.average);
  const recentAttempts = data.recentAttempts || [];
  const rawWrongAnswers = data.wrongAnswers || [];
  const rawWeakTopics = data.weakTopics || [];

  const level = Math.floor(Math.sqrt((user.xp || 0) / 100)) + 1;

  // Identify strongest and weakest categories
  const topCategory = categoryStats.length > 0 ? categoryStats[0] : null;
  const lowestCategory =
    categoryStats.length > 1
      ? categoryStats[categoryStats.length - 1]
      : categoryStats.length === 1 && categoryStats[0].average < 80
      ? categoryStats[0]
      : null;

  // Merge AI mistake breakdowns with fallback raw wrong answers so user always sees their mistakes immediately
  const displayedMistakes: AiMistakeBreakdown[] =
    aiAnalysis?.mistakeBreakdowns && aiAnalysis.mistakeBreakdowns.length > 0
      ? aiAnalysis.mistakeBreakdowns
      : rawWrongAnswers.slice(0, 6).map((w) => ({
          question: w.question,
          quizTitle: w.quizTitle,
          category: w.category,
          quizId: w.quizId,
          userAnswer: w.userAnswer,
          correctAnswer: w.correctAnswer,
          whyWrong:
            w.explanation ||
            `You selected "${w.userAnswer}", whereas the correct answer is "${w.correctAnswer}". Review the underlying rule in ${w.quizTitle}.`,
          coreConcept: `${w.category} • ${w.quizTitle}`,
          memoryTip: `Double-check why "${w.correctAnswer}" is the expected outcome before submitting.`
        }));

  const displayedTopicsToStudy: AiTopicToStudy[] =
    aiAnalysis?.topicsToStudy && aiAnalysis.topicsToStudy.length > 0
      ? aiAnalysis.topicsToStudy
      : rawWeakTopics.slice(0, 4).map((t, idx) => ({
          topic: t.topic,
          category: t.category,
          priority: idx === 0 ? 'High' : idx === 1 ? 'Medium' : 'Review',
          errorRate: t.errorRate,
          wrongCount: t.wrongCount,
          reason: `You missed ${t.wrongCount} question${t.wrongCount > 1 ? 's' : ''} (${t.errorRate}% error rate) in this module.`,
          studySteps: [
            `Review the key concepts and examples in ${t.topic}.`,
            `Inspect your missed questions below and compare your choice with the correct answer.`,
            `Retake ${t.topic} until you achieve 90%+ mastery.`
          ],
          recommendedQuizId: t.quizId
        }));

  const mistakeCategories = ['ALL', ...Array.from(new Set(displayedMistakes.map((m) => m.category)))];
  const filteredMistakes =
    selectedMistakeCategory === 'ALL'
      ? displayedMistakes
      : displayedMistakes.filter((m) => m.category === selectedMistakeCategory);

  const practiceQuestions = aiAnalysis?.aiPracticeQuestions || [];
  const remedialAnsweredCount = Object.keys(remedialAnswers).length;
  const remedialCorrectCount = practiceQuestions.filter(
    (q) => remedialAnswers[q.id] !== undefined && remedialAnswers[q.id] === q.correctAnswerIndex
  ).length;

  const categoryColors = [
    { bg: 'bg-[#fde047]', bar: 'bg-[#ca8a04]', text: 'text-amber-950', lightBg: 'bg-amber-500/10' },
    { bg: 'bg-[#a3e635]', bar: 'bg-[#4d7c0f]', text: 'text-lime-950', lightBg: 'bg-lime-500/10' },
    { bg: 'bg-[#38bdf8]', bar: 'bg-[#0369a1]', text: 'text-sky-950', lightBg: 'bg-sky-500/10' },
    { bg: 'bg-[#c084fc]', bar: 'bg-[#7e22ce]', text: 'text-purple-950', lightBg: 'bg-purple-500/10' },
    { bg: 'bg-[#fb7185]', bar: 'bg-[#be123c]', text: 'text-rose-950', lightBg: 'bg-rose-500/10' },
    { bg: 'bg-[#fb923c]', bar: 'bg-[#c2410c]', text: 'text-orange-950', lightBg: 'bg-orange-500/10' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl transition-all ${
          isBento
            ? 'bg-white text-black border-[2.5px] border-black shadow-[5px_5px_0px_#000]'
            : 'glass-panel border border-slate-200/80 dark:border-white/10'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isBento
                ? 'bg-[#c4b5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400'
            }`}
          >
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              Mastery &amp; AI Performance Coach
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              AI-powered wrong-answer autopsy, priority study topics, and interactive recovery drills.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={runAiAnalysis}
            disabled={isAiLoading}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-60 ${
              isBento
                ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 active:translate-y-0'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'AI Analyzing...' : 'Run AI Mistake Analysis'}</span>
          </button>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
              isBento
                ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}
          >
            Level {level}
          </span>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
        {/* Completed Quizzes */}
        <div
          className={`min-h-[132px] p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
            isBento
              ? 'bg-[#fde047] text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000]'
              : 'glass-card border border-amber-500/20 shadow-sm text-slate-900 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-black ${
                isBento
                  ? 'bg-white/90 border border-black text-black shadow-[1px_1px_0px_#000]'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}
            >
              Completed
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-white border border-black shadow-[1px_1px_0px_#000]' : ''}`}>
              <Trophy className={`w-4 h-4 ${isBento ? 'text-black' : 'text-amber-500'}`} />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black font-tabular tracking-tight mb-0.5">{totalAttempts}</div>
            <div className={`text-xs font-bold ${isBento ? 'text-black/80' : 'text-slate-500 dark:text-slate-400'}`}>
              Quizzes Solved
            </div>
          </div>
        </div>

        {/* Accuracy */}
        <div
          className={`min-h-[132px] p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
            isBento
              ? 'bg-[#bef264] text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000]'
              : 'glass-card border border-lime-500/20 shadow-sm text-slate-900 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-black ${
                isBento
                  ? 'bg-white/90 border border-black text-black shadow-[1px_1px_0px_#000]'
                  : 'bg-lime-500/10 text-lime-600 dark:text-lime-400 border border-lime-500/20'
              }`}
            >
              Accuracy
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-white border border-black shadow-[1px_1px_0px_#000]' : ''}`}>
              <Target className={`w-4 h-4 ${isBento ? 'text-black' : 'text-lime-500'}`} />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black font-tabular tracking-tight mb-0.5">{avgScore}%</div>
            <div className={`text-xs font-bold ${isBento ? 'text-black/80' : 'text-slate-500 dark:text-slate-400'}`}>
              {avgScore >= 80 ? '🎯 Sharpshooter' : avgScore >= 60 ? '🔥 On Track' : '⚡ Needs Review'}
            </div>
          </div>
        </div>

        {/* Experience */}
        <div
          className={`min-h-[132px] p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
            isBento
              ? 'bg-[#bae6fd] text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000]'
              : 'glass-card border border-sky-500/20 shadow-sm text-slate-900 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-black ${
                isBento
                  ? 'bg-white/90 border border-black text-black shadow-[1px_1px_0px_#000]'
                  : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
              }`}
            >
              Experience
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-white border border-black shadow-[1px_1px_0px_#000]' : ''}`}>
              <Zap className={`w-4 h-4 ${isBento ? 'text-black' : 'text-sky-500'}`} />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black font-tabular tracking-tight mb-0.5">{user.xp || 0}</div>
            <div className={`text-xs font-bold ${isBento ? 'text-black/80' : 'text-slate-500 dark:text-slate-400'}`}>
              Total XP Earned
            </div>
          </div>
        </div>

        {/* Mistakes Analyzed */}
        <div
          className={`min-h-[132px] p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
            isBento
              ? 'bg-[#fecdd3] text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000]'
              : 'glass-card border border-rose-500/20 shadow-sm text-slate-900 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-black ${
                isBento
                  ? 'bg-white/90 border border-black text-black shadow-[1px_1px_0px_#000]'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              Mistake Vault
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBento ? 'bg-white border border-black shadow-[1px_1px_0px_#000]' : ''}`}>
              <Brain className={`w-4 h-4 ${isBento ? 'text-black' : 'text-rose-500'}`} />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black font-tabular tracking-tight mb-0.5">
              {rawWrongAnswers.length}
            </div>
            <div className={`text-xs font-bold ${isBento ? 'text-black/80' : 'text-slate-500 dark:text-slate-400'}`}>
              Recent Wrong Answers
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          AI DEEP MISTAKE ANALYSIS & STUDY TOPIC ROADMAP
         ===================================================================== */}
      <div
        className={`p-6 sm:p-8 rounded-3xl transition-all ${
          isBento
            ? 'bg-[#faf5ff] text-black border-[2.5px] border-black shadow-[5px_5px_0px_#000]'
            : 'glass-panel border-2 border-purple-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-black/15 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isBento
                  ? 'bg-[#c084fc] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
              }`}
            >
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  AI Coach: Wrong-Answer Autopsy &amp; Study Plan
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    isBento
                      ? 'bg-[#fde047] text-black border border-black shadow-[1px_1px_0px_#000]'
                      : 'bg-purple-500/20 text-purple-600 dark:text-purple-300'
                  }`}
                >
                  {aiAnalysis?.generatedByAi ? '✨ Groq AI Powered' : 'Smart Diagnostics'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                Deep analysis of the exact questions you missed, why your answer was wrong, and which topics to study next
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runAiAnalysis}
            disabled={isAiLoading}
            className={`self-start sm:self-center shrink-0 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
              isBento
                ? 'bg-white hover:bg-[#fef08a] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'Analyzing Mistakes...' : 'Refresh AI Coach'}</span>
          </button>
        </div>

        {aiError && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-xs font-bold text-amber-800 dark:text-amber-300">
            {aiError}
          </div>
        )}

        {/* AI Executive Summary Box */}
        <div
          className={`p-4 sm:p-5 rounded-2xl mb-7 ${
            isBento
              ? 'bg-[#fef08a] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
              : 'bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 text-slate-900 dark:text-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-indigo-700 dark:text-indigo-400" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block mb-1 opacity-75">
                AI Executive Learning Diagnosis
              </span>
              <p className="text-xs sm:text-sm font-bold leading-relaxed">
                {isAiLoading
                  ? 'Scanning your quiz attempts, wrong answer choices, and topic accuracy to build your personalized study diagnosis...'
                  : aiAnalysis?.executiveSummary ||
                    (rawWrongAnswers.length > 0
                      ? `You have ${rawWrongAnswers.length} recent missed questions across ${rawWeakTopics.length} topics. Review the topic study roadmap and mistake breakdowns below to turn your weak spots into 100% mastery.`
                      : 'Complete a quiz to unlock personalized AI mistake analysis and topic recommendations!')}
              </p>
            </div>
          </div>
        </div>

        {/* PART 1: TOPICS YOU NEED TO STUDY MORE */}
        {displayedTopicsToStudy.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-500 shrink-0" />
                <span>1. Topics You Need to Study More</span>
              </h3>
              <span className="text-xs font-bold opacity-75">
                Prioritized by error frequency
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {displayedTopicsToStudy.map((topic, idx) => {
                const isHigh = topic.priority === 'High' || idx === 0;
                return (
                  <div
                    key={`${topic.topic}-${idx}`}
                    className={`p-5 rounded-2xl flex flex-col justify-between transition-all ${
                      isBento
                        ? 'bg-white text-black border-2 border-black shadow-[3.5px_3.5px_0px_#000]'
                        : 'bg-white/80 dark:bg-[#131624] border border-slate-200 dark:border-white/10 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            isHigh
                              ? isBento
                                ? 'bg-[#fecdd3] text-black border border-black shadow-[1px_1px_0px_#000]'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : isBento
                              ? 'bg-[#fde047] text-black border border-black shadow-[1px_1px_0px_#000]'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isHigh ? '🔥 High Priority Study' : '⚡ Recommended Review'}
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wider opacity-70">
                          {topic.category}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900 dark:text-white mb-1.5 leading-snug">
                        {topic.topic}
                      </h4>
                      <p className={`text-xs font-medium mb-3.5 ${isBento ? 'text-black/80' : 'text-slate-600 dark:text-slate-300'}`}>
                        {topic.reason}
                      </p>

                      {Array.isArray(topic.studySteps) && topic.studySteps.length > 0 && (
                        <div
                          className={`p-3 rounded-xl mb-4 space-y-1.5 ${
                            isBento
                              ? 'bg-[#f8fafc] border border-black'
                              : 'bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5'
                          }`}
                        >
                          <div className="text-[10px] font-black uppercase tracking-wider opacity-75">
                            What to Study Next:
                          </div>
                          {topic.studySteps.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2 text-xs font-medium">
                              <span className="font-black text-indigo-600 dark:text-indigo-400">•</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          topic.recommendedQuizId
                            ? navigate(`/quiz/${topic.recommendedQuizId}`)
                            : navigate('/tracks')
                        }
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          isBento
                            ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        <span>Practice This Topic</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/study')}
                        className={`py-2.5 px-3.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                          isBento
                            ? 'bg-white hover:bg-slate-100 text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0'
                            : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        Study Cards
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PART 2: MISTAKE-BY-MISTAKE AI AUTOPSY */}
        {displayedMistakes.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>2. Wrong-Answer Breakdown &amp; Why You Missed Them</span>
              </h3>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {mistakeCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedMistakeCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                      selectedMistakeCategory === cat
                        ? isBento
                          ? 'bg-black text-white border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                          : 'bg-indigo-600 text-white shadow-sm'
                        : isBento
                        ? 'bg-white text-black border-2 border-black hover:bg-[#fde047]'
                        : 'bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {filteredMistakes.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl flex flex-col justify-between transition-all ${
                    isBento
                      ? 'bg-white text-black border-2 border-black shadow-[3.5px_3.5px_0px_#000]'
                      : 'bg-white/90 dark:bg-[#131624] border border-slate-200 dark:border-white/10 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Top Metadata */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isBento
                            ? 'bg-[#bae6fd] text-black border border-black shadow-[1px_1px_0px_#000]'
                            : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {item.coreConcept || item.category}
                      </span>
                      <span className="text-[11px] font-bold opacity-70 truncate max-w-[180px]">
                        {item.quizTitle}
                      </span>
                    </div>

                    {/* Question Text */}
                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-3.5 leading-snug">
                      {item.question}
                    </h4>

                    {/* Wrong vs Correct Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
                      <div
                        className={`p-3 rounded-xl border-2 ${
                          isBento
                            ? 'bg-[#fecdd3] border-black text-black'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        <div className="text-[9px] font-black uppercase tracking-wider opacity-75 mb-1">
                          ✕ Your Answer
                        </div>
                        <div className="text-xs font-black break-words leading-tight">{item.userAnswer}</div>
                      </div>

                      <div
                        className={`p-3 rounded-xl border-2 ${
                          isBento
                            ? 'bg-[#bef264] border-black text-black'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        <div className="text-[9px] font-black uppercase tracking-wider opacity-75 mb-1">
                          ✓ Correct Answer
                        </div>
                        <div className="text-xs font-black break-words leading-tight">{item.correctAnswer}</div>
                      </div>
                    </div>

                    {/* AI Explanation of Why Wrong */}
                    <div
                      className={`p-3.5 rounded-xl mb-3.5 text-xs leading-relaxed ${
                        isBento
                          ? 'bg-[#fefce8] border border-black text-black font-medium'
                          : 'bg-slate-100/80 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-black uppercase text-[10px] tracking-wider block mb-1 text-purple-700 dark:text-purple-400">
                        🧠 AI Analysis — Why It Was Wrong:
                      </span>
                      {item.whyWrong}
                    </div>
                  </div>

                  {/* Memory Tip + Retake */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-black/15 dark:border-white/10">
                    <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 min-w-0">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span className="truncate">{item.memoryTip}</span>
                    </div>
                    {item.quizId && (
                      <button
                        type="button"
                        onClick={() => navigate(`/quiz/${item.quizId}`)}
                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 cursor-pointer transition-all ${
                          isBento
                            ? 'bg-black text-white hover:bg-neutral-800 shadow-[1.5px_1.5px_0px_#000]'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        Retake Quiz →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PART 3: INTERACTIVE AI REMEDIAL PRACTICE QUIZ */}
        {practiceQuestions.length > 0 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>3. AI Recovery Drill — Test Yourself on Your Weak Spots</span>
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black ${
                  isBento
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                Score: {remedialCorrectCount} / {practiceQuestions.length} ({remedialAnsweredCount} answered)
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {practiceQuestions.map((pq, qIdx) => {
                const selectedIdx = remedialAnswers[pq.id];
                const isAnswered = selectedIdx !== undefined;
                const isCorrect = isAnswered && selectedIdx === pq.correctAnswerIndex;

                return (
                  <div
                    key={pq.id || qIdx}
                    className={`p-5 rounded-2xl flex flex-col justify-between ${
                      isBento
                        ? 'bg-white text-black border-2 border-black shadow-[3.5px_3.5px_0px_#000]'
                        : 'bg-white/90 dark:bg-[#131624] border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300">
                          Drill #{qIdx + 1} • {pq.category}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black mb-3.5 leading-snug">
                        {pq.question}
                      </h4>

                      <div className="space-y-2 mb-3.5">
                        {(pq.options || []).map((opt, oIdx) => {
                          const isThisSelected = selectedIdx === oIdx;
                          const isThisRight = pq.correctAnswerIndex === oIdx;

                          let btnStyle = isBento
                            ? 'bg-slate-50 hover:bg-yellow-50 text-black border border-black'
                            : 'bg-slate-100/70 dark:bg-white/5 hover:bg-indigo-500/10 text-slate-800 dark:text-slate-200 border border-transparent';

                          if (isAnswered) {
                            if (isThisRight) {
                              btnStyle = isBento
                                ? 'bg-[#bef264] text-black border-2 border-black font-black'
                                : 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-black';
                            } else if (isThisSelected && !isThisRight) {
                              btnStyle = isBento
                                ? 'bg-[#fecdd3] text-black border-2 border-black font-black'
                                : 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 font-black';
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() =>
                                setRemedialAnswers((prev) => ({
                                  ...prev,
                                  [pq.id]: oIdx
                                }))
                              }
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${btnStyle}`}
                            >
                              <span>
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </span>
                              {isAnswered && isThisRight && <span className="font-black">✓</span>}
                              {isAnswered && isThisSelected && !isThisRight && <span className="font-black">✕</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isAnswered && (
                      <div
                        className={`p-3 rounded-xl text-[11px] font-medium leading-relaxed ${
                          isCorrect
                            ? isBento
                              ? 'bg-[#ecfccb] border-2 border-black text-black'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : isBento
                            ? 'bg-[#ffe4e6] border-2 border-black text-black'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        <strong>{isCorrect ? '✓ Spot on! ' : '✕ Not quite: '}</strong>
                        {pq.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Domain Balance & Suggested Daily Routine */}
      <div
        className={`p-6 sm:p-8 rounded-3xl transition-all ${
          isBento
            ? 'bg-[#fefce8] text-black border-[2.5px] border-black shadow-[5px_5px_0px_#000]'
            : 'glass-panel border-2 border-indigo-500/30'
        }`}
      >
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-black/15 dark:border-white/10">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isBento
                ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400'
            }`}
          >
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg sm:text-xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
              Domain Balance &amp; Daily Improvement Routine
            </h2>
            <p className={`text-xs ${isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
              Compare your strongest and weakest domains and follow the 4-step daily habit loop
            </p>
          </div>
        </div>

        {lowestCategory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5 items-stretch">
            {/* Growth Opportunity Card */}
            <div
              className={`p-5 rounded-2xl flex flex-col justify-between ${
                isBento
                  ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'bg-slate-50/80 dark:bg-black/30 border border-slate-200 dark:border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Priority Growth Area
                  </span>
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white mb-1.5">
                  Focus on {lowestCategory.category}
                </h4>
                <p className={`text-xs leading-relaxed ${isBento ? 'text-black/80' : 'text-slate-600 dark:text-slate-400'}`}>
                  Your current accuracy in this domain is{' '}
                  <strong className="font-tabular font-black">{lowestCategory.average}%</strong>. Improving this
                  category will provide the highest boost to your overall standing!
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className={`mt-4 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isBento
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#a3e635] hover:-translate-y-0.5 active:translate-y-0'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                }`}
              >
                <span>Practice {lowestCategory.category} Quizzes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Core Strength Card */}
            <div
              className={`p-5 rounded-2xl flex flex-col justify-between ${
                isBento
                  ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'bg-slate-50/80 dark:bg-black/30 border border-slate-200 dark:border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Demonstrated Strength
                  </span>
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white mb-1.5">
                  Strong in {topCategory?.category || 'General Knowledge'}
                </h4>
                <p className={`text-xs leading-relaxed ${isBento ? 'text-black/80' : 'text-slate-600 dark:text-slate-400'}`}>
                  You maintain <strong className="font-tabular font-black">{topCategory?.average || avgScore}%</strong>{' '}
                  mastery here! Consider taking advanced timed duels or challenging clan members in this track.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/social')}
                className={`mt-4 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isBento
                    ? 'bg-[#c4b5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#a78bfa] hover:-translate-y-0.5 active:translate-y-0'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Challenge Friends to 1v1 Duel</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* 4 Action Steps to Level Up */}
        <div className="mt-5 pt-4 border-t border-black/15 dark:border-white/10">
          <h4
            className={`text-xs font-black uppercase tracking-wider mb-3.5 ${
              isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Suggested Daily Routine for Rapid Improvement
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
            {[
              {
                icon: BookOpen,
                title: '1. Study Decks',
                desc: 'Review flashcards before taking high-stakes quizzes.',
                action: 'Cards',
                path: '/study'
              },
              {
                icon: RotateCcw,
                title: '2. Review Mode',
                desc: 'Re-take missed questions with instant answer explanations.',
                action: 'Quizzes',
                path: '/'
              },
              {
                icon: Flame,
                title: '3. Daily 3-Tier',
                desc: 'Solve Easy, Medium, and Hard coding puzzles every morning.',
                action: 'Daily',
                path: '/daily'
              },
              {
                icon: Award,
                title: '4. Skill Tracks',
                desc: 'Progress through curated roadmap chapters to unlock badges.',
                action: 'Tracks',
                path: '/tracks'
              }
            ].map((step, idx) => {
              const Icon = step.icon;
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => navigate(step.path)}
                  className={`min-h-[148px] w-full text-left p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                    isBento
                      ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000] active:translate-y-0'
                      : 'bg-white/60 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-xs text-slate-900 dark:text-white">{step.title}</span>
                      <Icon className="w-4 h-4 text-indigo-500 shrink-0" />
                    </div>
                    <p
                      className={`text-[11px] leading-relaxed mb-3 ${
                        isBento ? 'text-black/75 font-medium' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {step.desc}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isBento ? 'text-purple-700' : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    Open {step.action} →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subject Category Mastery Deep Dive */}
      <div
        className={`p-6 sm:p-8 rounded-3xl transition-all ${
          isBento
            ? 'bg-white text-black border-[2.5px] border-black shadow-[5px_5px_0px_#000]'
            : 'glass-panel border border-slate-200/80 dark:border-white/10'
        }`}
      >
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-black/15 dark:border-white/10">
          <div>
            <h3 className={`text-lg sm:text-xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
              Subject Category Breakdown
            </h3>
            <p className={`text-xs ${isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
              Track your calibrated accuracy and pass rates across all domains
            </p>
          </div>
          {categoryStats.length > 0 && (
            <span
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                isBento ? 'bg-[#fde047] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {categoryStats.length} Tracks Monitored
            </span>
          )}
        </div>

        {categoryStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {categoryStats.map((c, i) => {
              const themeStyle = categoryColors[i % categoryColors.length];
              const isMastered = c.average >= 70;
              const isNeedsWork = c.average < 50;

              return (
                <div
                  key={c.category}
                  className={`p-4 sm:p-5 rounded-2xl flex flex-col justify-between transition-all ${
                    isBento
                      ? `border-2 border-black shadow-[3px_3px_0px_#000] ${themeStyle.bg} text-black`
                      : 'glass-card border border-slate-200 dark:border-white/10 shadow-sm text-slate-900 dark:text-white'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-wider truncate">{c.category}</h4>
                        <p className={`text-[11px] font-bold ${isBento ? 'text-black/70' : 'text-slate-500 dark:text-slate-400'}`}>
                          {c.attemptsCount || 1} Quiz Attempts • {c.passedCount || 0} Passed
                        </p>
                      </div>
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                          isBento
                            ? 'bg-white border-2 border-black shadow-[1.5px_1.5px_0px_#000] text-black font-tabular'
                            : 'bg-indigo-600 text-white font-tabular shadow-sm'
                        }`}
                      >
                        {c.average}% Avg
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      className={`h-3.5 rounded-full overflow-hidden mt-3 mb-2.5 ${
                        isBento
                          ? 'bg-white/90 border-2 border-black p-[1px]'
                          : 'bg-slate-100 dark:bg-white/5 p-[1px]'
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isBento ? themeStyle.bar : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                        }`}
                        style={{ width: `${Math.max(6, c.average)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-extrabold pt-2">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        isMastered
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : isNeedsWork
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {isMastered ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : isNeedsWork ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Target className="w-3.5 h-3.5" />
                      )}
                      {isMastered ? 'Mastered' : isNeedsWork ? 'Needs Practice' : 'Developing'}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="font-black uppercase tracking-wider text-[10px] underline cursor-pointer hover:opacity-80"
                    >
                      Solve More Quizzes →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`p-8 rounded-2xl text-center ${
              isBento ? 'bg-slate-50 border-2 border-black' : 'bg-slate-50 dark:bg-white/[0.02]'
            }`}
          >
            <Compass className="w-12 h-12 text-slate-400 mx-auto mb-2 opacity-50" />
            <h4 className="text-base font-black mb-1">No Category Data Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 font-medium">
              Start by taking a quiz in Web Development, Algorithms, or Databases to see your breakdown.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer ${
                isBento
                  ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              Browse Quizzes
            </button>
          </div>
        )}
      </div>

      {/* Recent Quiz Performance Timeline */}
      {recentAttempts.length > 0 && (
        <div
          className={`p-6 sm:p-8 rounded-3xl transition-all ${
            isBento
              ? 'bg-white text-black border-[2.5px] border-black shadow-[5px_5px_0px_#000]'
              : 'glass-panel border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-black/15 dark:border-white/10">
            <div>
              <h3 className={`text-lg sm:text-xl font-black ${isBento ? 'text-black' : 'text-slate-900 dark:text-white'}`}>
                Recent Attempt History
              </h3>
              <p className={`text-xs ${isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                Review how your score has evolved over recent quizzes
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile?tab=history')}
              className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                isBento ? 'text-black underline' : 'text-indigo-600 dark:text-indigo-400 hover:underline'
              }`}
            >
              <span>View Full History in Profile</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentAttempts.map((attempt, idx) => (
              <div
                key={idx}
                className={`p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  isBento
                    ? 'bg-slate-50 border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-white/40 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      attempt.passed
                        ? isBento
                          ? 'bg-[#bef264] text-black border-2 border-black'
                          : 'bg-emerald-500/20 text-emerald-500'
                        : isBento
                        ? 'bg-[#fecdd3] text-black border-2 border-black'
                        : 'bg-rose-500/20 text-rose-500'
                    }`}
                  >
                    {attempt.passed ? '✓' : '✕'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">{attempt.title}</h4>
                    <p className={`text-xs ${isBento ? 'text-black/60 font-semibold' : 'text-slate-400'}`}>
                      {attempt.category} • {new Date(attempt.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <span
                    className={`px-3 py-1 rounded-xl font-tabular font-black text-xs ${
                      attempt.passed
                        ? isBento
                          ? 'bg-[#bef264] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : isBento
                        ? 'bg-[#fda4af] text-black border-2 border-black shadow-[1px_1px_0px_#000]'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {attempt.percentage}%
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/quiz/${attempt.quizId}`)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                      isBento
                        ? 'bg-white hover:bg-yellow-50 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] hover:-translate-y-0.5 active:translate-y-0'
                        : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    Retake
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPanel;
