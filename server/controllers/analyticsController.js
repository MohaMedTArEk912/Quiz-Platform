import { Attempt } from '../models/Attempt.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';
import { Badge } from '../models/Badge.js';
import { Challenge } from '../models/Challenge.js';
import { ShopItem } from '../models/ShopItem.js';

export const getAnalyticsSummary = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    const attempts = await Attempt.find(isAdmin ? {} : { userId }).lean();
    const quizzes = await Quiz.find({}).select('id category').lean();
    const quizMap = new Map(quizzes.map(q => [q.id, q.category]));

    const totalAttempts = attempts.length;
    const avgScore = attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / (totalAttempts || 1);
    const byCategory = {};
    attempts.forEach(a => {
      const cat = quizMap.get(a.quizId) || 'unknown';
      byCategory[cat] = byCategory[cat] || { count: 0, total: 0 };
      byCategory[cat].count += 1;
      byCategory[cat].total += a.percentage || 0;
    });
    const categoryStats = Object.entries(byCategory).map(([cat, v]) => ({
      category: cat,
      average: Math.round(v.total / (v.count || 1))
    }));

    let global = undefined;
    if (isAdmin) {
      const userCount = await User.countDocuments({});
      global = { userCount };
    }

    res.json({ totalAttempts, avgScore: Math.round(avgScore), categoryStats, global });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};

/**
 * GET /api/analytics/questions
 * Deep question-level failure analytics across student quiz attempts
 */
export const getQuestionAnalytics = async (req, res) => {
  try {
    const { quizId, minAttempts } = req.query;
    const minAttemptCount = parseInt(minAttempts, 10) || 1;

    // Fetch all quizzes and attempts
    const [quizzes, attempts] = await Promise.all([
      Quiz.find({}).lean(),
      Attempt.find(quizId ? { quizId } : {}).lean()
    ]);

    const quizMap = new Map();
    quizzes.forEach(q => {
      if (q.id) quizMap.set(String(q.id), q);
      if (q._id) quizMap.set(String(q._id), q);
    });

    // Map to accumulate question stats
    // Key: `${quizId}___${questionIdOrIndex}`
    const questionStatsMap = new Map();

    attempts.forEach(attempt => {
      const quiz = quizMap.get(String(attempt.quizId));
      const questionsList = attempt.attemptQuestions || quiz?.questions || [];
      if (!Array.isArray(questionsList) || questionsList.length === 0) return;

      const userAnswers = attempt.answers || {};

      questionsList.forEach((q, idx) => {
        const questionKey = `${attempt.quizId}___${q.id ?? idx}`;
        const userAnsObj = userAnswers[idx] ?? userAnswers[String(idx)] ?? userAnswers[q.id] ?? userAnswers[String(q.id)];

        if (userAnsObj === undefined || userAnsObj === null) return;

        let selected = undefined;
        let isCorrect = false;

        if (typeof userAnsObj === 'object' && userAnsObj !== null) {
          selected = userAnsObj.selected;
          if (typeof userAnsObj.isCorrect === 'boolean') {
            isCorrect = userAnsObj.isCorrect;
          } else {
            isCorrect = selected !== undefined && (
              Number(selected) === Number(q.correctAnswer) ||
              (Array.isArray(q.options) && typeof q.correctAnswer === 'number' && q.options[q.correctAnswer] === selected) ||
              String(selected).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
            );
          }
        } else {
          selected = userAnsObj;
          isCorrect = selected !== undefined && (
            Number(selected) === Number(q.correctAnswer) ||
            (Array.isArray(q.options) && typeof q.correctAnswer === 'number' && q.options[q.correctAnswer] === selected) ||
            String(selected).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
          );
        }

        if (!questionStatsMap.has(questionKey)) {
          questionStatsMap.set(questionKey, {
            key: questionKey,
            quizId: attempt.quizId,
            quizTitle: attempt.quizTitle || quiz?.title || 'Quiz',
            quizCategory: quiz?.category || 'General',
            questionId: q.id ?? idx,
            questionText: q.question || 'Question',
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            imageUrl: q.imageUrl || '',
            codeSnippet: q.codeSnippet || '',
            type: q.type || 'multiple-choice',
            totalAttempts: 0,
            correctCount: 0,
            wrongCount: 0,
            optionCounts: {},
            wrongOptionCounts: {},
            studentsAttempted: new Set()
          });
        }

        const stat = questionStatsMap.get(questionKey);
        stat.totalAttempts += 1;
        if (attempt.userName) stat.studentsAttempted.add(attempt.userName);

        if (isCorrect) {
          stat.correctCount += 1;
        } else {
          stat.wrongCount += 1;
          if (selected !== undefined && selected !== null && selected !== '') {
            const optKey = String(selected);
            stat.wrongOptionCounts[optKey] = (stat.wrongOptionCounts[optKey] || 0) + 1;
          }
        }

        if (selected !== undefined && selected !== null && selected !== '') {
          const optKey = String(selected);
          stat.optionCounts[optKey] = (stat.optionCounts[optKey] || 0) + 1;
        }
      });
    });

    // Process & calculate failure metrics
    const questionList = Array.from(questionStatsMap.values())
      .filter(stat => stat.totalAttempts >= minAttemptCount)
      .map(stat => {
        const failureRate = stat.totalAttempts > 0
          ? Math.round((stat.wrongCount / stat.totalAttempts) * 100)
          : 0;
        const accuracy = 100 - failureRate;

        // Determine most common wrong choice
        let mostCommonWrongIndex = null;
        let mostCommonWrongText = '';
        let highestWrongCount = 0;

        Object.entries(stat.wrongOptionCounts).forEach(([optKey, count]) => {
          if (count > highestWrongCount) {
            highestWrongCount = count;
            mostCommonWrongIndex = optKey;
          }
        });

        if (mostCommonWrongIndex !== null) {
          const optNum = parseInt(mostCommonWrongIndex, 10);
          if (!isNaN(optNum) && stat.options[optNum]) {
            mostCommonWrongText = stat.options[optNum];
          } else {
            mostCommonWrongText = mostCommonWrongIndex;
          }
        }

        // Calculate option distribution breakdown
        const optionDistribution = stat.options.map((optText, optIdx) => {
          const count = stat.optionCounts[String(optIdx)] || 0;
          const percentage = stat.totalAttempts > 0 ? Math.round((count / stat.totalAttempts) * 100) : 0;
          return {
            optionIndex: optIdx,
            text: optText,
            count,
            percentage,
            isCorrect: optIdx === stat.correctAnswer,
            isTopMisconception: String(optIdx) === String(mostCommonWrongIndex) && optIdx !== stat.correctAnswer
          };
        });

        return {
          key: stat.key,
          quizId: stat.quizId,
          quizTitle: stat.quizTitle,
          quizCategory: stat.quizCategory,
          questionId: stat.questionId,
          questionText: stat.questionText,
          options: stat.options,
          correctAnswer: stat.correctAnswer,
          explanation: stat.explanation,
          imageUrl: stat.imageUrl,
          codeSnippet: stat.codeSnippet,
          type: stat.type,
          totalAttempts: stat.totalAttempts,
          correctCount: stat.correctCount,
          wrongCount: stat.wrongCount,
          failureRate,
          accuracy,
          mostCommonWrongChoice: mostCommonWrongText,
          mostCommonWrongCount: highestWrongCount,
          optionDistribution,
          uniqueStudentsCount: stat.studentsAttempted.size
        };
      })
      .sort((a, b) => b.failureRate - a.failureRate || b.wrongCount - a.wrongCount);

    // Summary statistics
    const totalQuestionsAnalyzed = questionList.length;
    const avgFailureRate = totalQuestionsAnalyzed > 0
      ? Math.round(questionList.reduce((sum, q) => sum + q.failureRate, 0) / totalQuestionsAnalyzed)
      : 0;

    // Hardest Quiz computation
    const quizFailureMap = {};
    questionList.forEach(q => {
      quizFailureMap[q.quizId] = quizFailureMap[q.quizId] || { title: q.quizTitle, totalRate: 0, count: 0 };
      quizFailureMap[q.quizId].totalRate += q.failureRate;
      quizFailureMap[q.quizId].count += 1;
    });

    let hardestQuiz = null;
    let highestQuizAvgFailure = -1;
    Object.values(quizFailureMap).forEach(qData => {
      const avg = Math.round(qData.totalRate / (qData.count || 1));
      if (avg > highestQuizAvgFailure) {
        highestQuizAvgFailure = avg;
        hardestQuiz = { title: qData.title, averageFailureRate: avg };
      }
    });

    res.json({
      success: true,
      summary: {
        totalQuestionsAnalyzed,
        avgFailureRate,
        avgAccuracy: 100 - avgFailureRate,
        totalAttemptsAnalyzed: attempts.length,
        hardestQuiz,
        mostMissedQuestion: questionList[0] || null
      },
      questions: questionList
    });
  } catch (error) {
    console.error('❌ Error generating question analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to generate question analytics', error: error.message });
  }
};

/**
 * GET /api/analytics/cohorts
 * Cohort and group-level performance analytics
 */
export const getCohortAnalytics = async (req, res) => {
  try {
    const [users, attempts, quizzes] = await Promise.all([
      User.find({}, 'userId name email level xp totalScore totalAttempts').lean(),
      Attempt.find({}).sort({ completedAt: -1 }).lean(),
      Quiz.find({}, 'id title category difficulty').lean()
    ]);

    const userAttemptMap = new Map();
    attempts.forEach(a => {
      if (!userAttemptMap.has(a.userId)) {
        userAttemptMap.set(a.userId, []);
      }
      userAttemptMap.get(a.userId).push(a);
    });

    // 1. Level-Based Cohorts
    const levelCohorts = {
      novice: { name: 'Novice (Lvl 1-3)', users: 0, totalScore: 0, totalAttempts: 0, avgScore: 0, passRate: 0, passes: 0 },
      adept: { name: 'Adept (Lvl 4-7)', users: 0, totalScore: 0, totalAttempts: 0, avgScore: 0, passRate: 0, passes: 0 },
      master: { name: 'Master (Lvl 8+)', users: 0, totalScore: 0, totalAttempts: 0, avgScore: 0, passRate: 0, passes: 0 }
    };

    // 2. Performance Tier Cohorts
    const performanceTiers = {
      high: { name: 'High Performers (≥80%)', count: 0, avgPercentage: 0, totalAttempts: 0, users: [] },
      medium: { name: 'Proficient (60-79%)', count: 0, avgPercentage: 0, totalAttempts: 0, users: [] },
      atRisk: { name: 'Needs Attention (<60%)', count: 0, avgPercentage: 0, totalAttempts: 0, users: [] }
    };

    users.forEach(u => {
      const userAttempts = userAttemptMap.get(u.userId) || [];
      const lvl = u.level || 1;
      const cohortKey = lvl <= 3 ? 'novice' : lvl <= 7 ? 'adept' : 'master';

      levelCohorts[cohortKey].users += 1;
      levelCohorts[cohortKey].totalAttempts += userAttempts.length;

      let userTotalPct = 0;
      let userPasses = 0;

      userAttempts.forEach(a => {
        const pct = a.percentage || 0;
        userTotalPct += pct;
        levelCohorts[cohortKey].totalScore += pct;
        if (a.passed) {
          userPasses += 1;
          levelCohorts[cohortKey].passes += 1;
        }
      });

      const userAvgPct = userAttempts.length > 0 ? Math.round(userTotalPct / userAttempts.length) : 0;
      const tierKey = userAvgPct >= 80 ? 'high' : userAvgPct >= 60 ? 'medium' : 'atRisk';

      performanceTiers[tierKey].count += 1;
      performanceTiers[tierKey].totalAttempts += userAttempts.length;
      if (performanceTiers[tierKey].users.length < 15) {
        performanceTiers[tierKey].users.push({
          userId: u.userId,
          name: u.name,
          email: u.email,
          level: u.level || 1,
          avgScore: userAvgPct,
          attempts: userAttempts.length
        });
      }
    });

    // Compute averages
    Object.values(levelCohorts).forEach(c => {
      c.avgScore = c.totalAttempts > 0 ? Math.round(c.totalScore / c.totalAttempts) : 0;
      c.passRate = c.totalAttempts > 0 ? Math.round((c.passes / c.totalAttempts) * 100) : 0;
    });

    // 3. Category Breakdown
    const quizCategoryMap = new Map(quizzes.map(q => [q.id, q.category]));
    const categoryPerformance = {};

    attempts.forEach(a => {
      const cat = quizCategoryMap.get(a.quizId) || 'General';
      if (!categoryPerformance[cat]) {
        categoryPerformance[cat] = { category: cat, totalAttempts: 0, totalPct: 0, passes: 0 };
      }
      categoryPerformance[cat].totalAttempts += 1;
      categoryPerformance[cat].totalPct += (a.percentage || 0);
      if (a.passed) categoryPerformance[cat].passes += 1;
    });

    const categoryList = Object.values(categoryPerformance).map(c => ({
      category: c.category,
      totalAttempts: c.totalAttempts,
      avgScore: Math.round(c.totalPct / (c.totalAttempts || 1)),
      passRate: Math.round((c.passes / (c.totalAttempts || 1)) * 100)
    })).sort((a, b) => b.totalAttempts - a.totalAttempts);

    res.json({
      success: true,
      summary: {
        totalStudents: users.length,
        totalAttemptsEvaluated: attempts.length,
        levelCohorts: Object.values(levelCohorts),
        performanceTiers,
        categoryPerformance: categoryList
      }
    });
  } catch (error) {
    console.error('❌ Error generating cohort analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to generate cohort analytics', error: error.message });
  }
};

/**
 * GET /api/analytics/live-proctoring
 * Real-time exam sessions and integrity telemetry monitor
 */
export const getLiveProctoringData = async (req, res) => {
  try {
    const attempts = await Attempt.find({})
      .sort({ completedAt: -1 })
      .limit(100)
      .lean();

    let cleanCount = 0;
    let moderateCount = 0;
    let highRiskCount = 0;
    let totalTabSwitches = 0;
    let totalFocusLosses = 0;
    let totalCopyPastes = 0;
    let totalFullscreenExits = 0;
    let totalRapidGuesses = 0;

    const monitoredSessions = attempts.map(a => {
      const tel = a.telemetry || {
        integrityScore: 100,
        tabSwitches: 0,
        focusLossCount: 0,
        copyPasteAttempts: 0,
        fullscreenExits: 0,
        rapidGuesses: 0,
        events: []
      };

      const score = tel.integrityScore ?? 100;
      if (score >= 90) cleanCount++;
      else if (score >= 70) moderateCount++;
      else highRiskCount++;

      totalTabSwitches += tel.tabSwitches || 0;
      totalFocusLosses += tel.focusLossCount || 0;
      totalCopyPastes += tel.copyPasteAttempts || 0;
      totalFullscreenExits += tel.fullscreenExits || 0;
      totalRapidGuesses += tel.rapidGuesses || 0;

      return {
        attemptId: a.attemptId,
        userId: a.userId,
        userName: a.userName,
        userEmail: a.userEmail,
        quizId: a.quizId,
        quizTitle: a.quizTitle,
        score: a.score,
        percentage: a.percentage,
        passed: a.passed,
        timeTaken: a.timeTaken,
        completedAt: a.completedAt,
        telemetry: tel,
        riskLevel: score >= 90 ? 'clean' : score >= 70 ? 'moderate' : 'high'
      };
    });

    res.json({
      success: true,
      summary: {
        totalMonitored: attempts.length,
        cleanCount,
        moderateCount,
        highRiskCount,
        avgIntegrityScore: attempts.length > 0
          ? Math.round(monitoredSessions.reduce((s, a) => s + (a.telemetry.integrityScore || 100), 0) / attempts.length)
          : 100,
        totalTabSwitches,
        totalFocusLosses,
        totalCopyPastes,
        totalFullscreenExits,
        totalRapidGuesses
      },
      sessions: monitoredSessions
    });
  } catch (error) {
    console.error('❌ Error fetching live proctoring telemetry:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live proctoring telemetry', error: error.message });
  }
};

export const getData = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const userId = req.user?.userId;

    const [users, attempts, badges, challenges, shopItems] = await Promise.all([
      isAdmin
        ? User.find({}, '-password').lean()
        : User.find({}, 'userId name totalScore totalAttempts xp level streak rank lastLoginDate createdAt badges')
            .sort({ totalScore: -1 })
            .limit(100)
            .lean(),
      isAdmin
        ? Attempt.find({}).sort({ completedAt: -1 }).limit(500).lean()
        : Attempt.find({ userId }).sort({ completedAt: -1 }).lean(),
      Badge.find({}).lean(),
      Challenge.find({
        $or: [{ fromId: userId }, { toId: userId }]
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      ShopItem.find({}).lean()
    ]);

    res.json({ users, attempts, badges, challenges, shopItems });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
