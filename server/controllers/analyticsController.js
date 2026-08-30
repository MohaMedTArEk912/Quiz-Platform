import { Attempt } from '../models/Attempt.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';

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

export const getData = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    
    // If admin, they can see EVERYTHING. If user, only public info.
    let users;
    let attempts;
    
    if (isAdmin) {
      users = await User.find({}, '-password').lean();
      attempts = await Attempt.find({}).lean();
    } else {
      // Filter out passwords and sensitive emails for general users
      users = await User.find({}, 'userId name totalScore totalAttempts xp level streak rank lastLoginDate createdAt badges').lean();
      // Only return the user's own attempts for privacy
      attempts = await Attempt.find({ userId: req.user.userId }).lean();
    }

    const badges = await import('../models/Badge.js').then(m => m.Badge.find({}).lean());
    const Challenge = await import('../models/Challenge.js').then(m => m.Challenge);
    const ShopItem = await import('../models/ShopItem.js').then(m => m.ShopItem);

    // Challenges the user is involved in
    const challenges = await Challenge.find({
      $or: [{ fromId: req.user.userId }, { toId: req.user.userId }]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Shop items (for client cache)
    const shopItems = await ShopItem.find({}).lean();

    res.json({ users, attempts, badges });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
