import Groq from 'groq-sdk';
import { Attempt } from '../models/Attempt.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';
import { Badge } from '../models/Badge.js';
import { Challenge } from '../models/Challenge.js';
import { ShopItem } from '../models/ShopItem.js';
import { evaluateTextAnswer } from '../utils/textSimilarity.js';

const getGroqClient = () => {
  const key = (process.env.GROQ_API_KEY || '').trim();
  if (!key) return null;
  try {
    return new Groq({ apiKey: key });
  } catch (e) {
    console.warn('Failed to initialize Groq client in analyticsController:', e.message);
    return null;
  }
};

const ANALYTICS_AI_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile'
];

/**
 * Helper to extract human-readable answer text and correctness for a question in an attempt
 */
function resolveQuestionAttempt(q, idx, userAnswers) {
  const userAnsObj = userAnswers?.[idx] ?? userAnswers?.[String(idx)] ?? (q.id !== undefined ? (userAnswers?.[q.id] ?? userAnswers?.[String(q.id)]) : undefined);
  if (userAnsObj === undefined || userAnsObj === null) return null;

  let selected = undefined;
  let isCorrect = false;

  if (typeof userAnsObj === 'object' && userAnsObj !== null) {
    selected = userAnsObj.selected;
    if (typeof userAnsObj.isCorrect === 'boolean') {
      isCorrect = userAnsObj.isCorrect;
    }
  } else {
    selected = userAnsObj;
  }

  if (selected === undefined || selected === null || selected === '') return null;

  const options = Array.isArray(q.options) ? q.options : [];
  if (typeof userAnsObj !== 'object' || typeof userAnsObj.isCorrect !== 'boolean') {
    isCorrect =
      Number(selected) === Number(q.correctAnswer) ||
      (typeof q.correctAnswer === 'number' && options[q.correctAnswer] === selected) ||
      (q.type === 'text'
        ? evaluateTextAnswer(String(selected), String(q.correctAnswer), 0.70).isPassed
        : String(selected).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase());
  }

  const formatAnswerText = (val) => {
    if (val === undefined || val === null) return 'No answer';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    const num = Number(val);
    if (!Number.isNaN(num) && options[num] !== undefined) {
      return String(options[num]);
    }
    return String(val);
  };

  return {
    isCorrect,
    userAnswerText: formatAnswerText(selected),
    correctAnswerText: formatAnswerText(q.correctAnswer)
  };
}

/**
 * Helper to extract recent wrong answers and weak topic stats from user attempts
 */
function extractUserMistakes(attempts, quizMap) {
  const wrongAnswers = [];
  const topicErrors = new Map();

  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(b.completedAt || b.createdAt || 0).getTime() - new Date(a.completedAt || a.createdAt || 0).getTime()
  );

  for (const attempt of sortedAttempts) {
    const quiz = quizMap.get(String(attempt.quizId));
    const quizTitle = quiz?.title || attempt.quizTitle || 'Practice Quiz';
    const category = quiz?.category || attempt.category || 'General Knowledge';
    const questionsList = (Array.isArray(attempt.attemptQuestions) && attempt.attemptQuestions.length > 0)
      ? attempt.attemptQuestions
      : (Array.isArray(quiz?.questions) ? quiz.questions : []);

    if (!questionsList.length) continue;

    const userAnswers = attempt.answers || {};
    const topicKey = `${category}:::${quizTitle}`;
    if (!topicErrors.has(topicKey)) {
      topicErrors.set(topicKey, {
        topic: quizTitle,
        category,
        quizId: attempt.quizId,
        wrongCount: 0,
        totalAnswered: 0
      });
    }
    const topicEntry = topicErrors.get(topicKey);

    questionsList.forEach((q, idx) => {
      const resolved = resolveQuestionAttempt(q, idx, userAnswers);
      if (!resolved) return;

      topicEntry.totalAnswered += 1;
      if (!resolved.isCorrect) {
        topicEntry.wrongCount += 1;
        if (wrongAnswers.length < 15) {
          wrongAnswers.push({
            quizId: String(attempt.quizId),
            quizTitle,
            category,
            question: q.question || 'Quiz Question',
            codeSnippet: q.codeSnippet || '',
            userAnswer: resolved.userAnswerText,
            correctAnswer: resolved.correctAnswerText,
            explanation: q.explanation || '',
            completedAt: attempt.completedAt || attempt.createdAt || new Date()
          });
        }
      }
    });
  }

  const weakTopics = Array.from(topicErrors.values())
    .filter(t => t.wrongCount > 0)
    .map(t => ({
      ...t,
      errorRate: t.totalAnswered > 0 ? Math.round((t.wrongCount / t.totalAnswered) * 100) : 0,
      accuracy: t.totalAnswered > 0 ? Math.round(((t.totalAnswered - t.wrongCount) / t.totalAnswered) * 100) : 0
    }))
    .sort((a, b) => b.wrongCount - a.wrongCount || b.errorRate - a.errorRate)
    .slice(0, 6);

  return { wrongAnswers, weakTopics };
}

export const getAnalyticsSummary = async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'];
    const isAdmin = req.user?.role === 'admin';

    let attempts = [];
    if (userId && userId !== 'guest') {
      attempts = await Attempt.find({ userId }).lean();
    }
    if (attempts.length === 0 && isAdmin) {
      attempts = await Attempt.find({}).lean();
    }

    const quizzes = await Quiz.find({}).select('id _id category title questions difficulty').lean();
    const quizMap = new Map();
    quizzes.forEach(q => {
      if (q.id) quizMap.set(String(q.id), q);
      if (q._id) quizMap.set(String(q._id), q);
    });

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts)
      : 0;

    const byCategory = {};
    attempts.forEach(a => {
      const qInfo = quizMap.get(String(a.quizId));
      const cat = qInfo?.category || a.category || 'General Knowledge';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, total: 0, passedCount: 0, perfectCount: 0, highestScore: 0 };
      }
      byCategory[cat].count += 1;
      const pct = a.percentage || 0;
      byCategory[cat].total += pct;
      if (pct >= 70 || a.passed) byCategory[cat].passedCount += 1;
      if (pct === 100) byCategory[cat].perfectCount += 1;
      if (pct > byCategory[cat].highestScore) byCategory[cat].highestScore = pct;
    });

    const categoryStats = Object.entries(byCategory).map(([cat, v]) => ({
      category: cat,
      average: Math.round(v.total / (v.count || 1)),
      attemptsCount: v.count,
      passedCount: v.passedCount,
      passRate: Math.round((v.passedCount / (v.count || 1)) * 100),
      highestScore: v.highestScore
    }));

    // Strengths and weak growth areas
    const strengths = categoryStats.filter(c => c.average >= 70);
    const weakAreas = categoryStats.filter(c => c.average < 60);

    // Recent attempts history
    const recentAttempts = attempts
      .sort((a, b) => new Date(b.completedAt || b.createdAt || 0).getTime() - new Date(a.completedAt || a.createdAt || 0).getTime())
      .slice(0, 10)
      .map(a => {
        const qInfo = quizMap.get(String(a.quizId));
        return {
          quizId: a.quizId,
          title: qInfo?.title || a.quizTitle || 'Quiz Attempt',
          category: qInfo?.category || a.category || 'General Knowledge',
          percentage: a.percentage || 0,
          score: a.score || 0,
          totalQuestions: a.totalQuestions || 0,
          passed: Boolean(a.passed || (a.percentage && a.percentage >= 70)),
          completedAt: a.completedAt || a.createdAt || new Date()
        };
      });

    const { wrongAnswers, weakTopics } = extractUserMistakes(attempts, quizMap);

    let global = undefined;
    if (isAdmin) {
      const userCount = await User.countDocuments({});
      global = { userCount };
    }

    res.json({
      totalAttempts,
      avgScore,
      categoryStats,
      strengths,
      weakAreas,
      recentAttempts,
      wrongAnswers,
      weakTopics,
      global
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};

/**
 * POST /api/analytics/ai-analysis
 * Uses Groq AI to deeply analyze the user's wrong answers, diagnose misconceptions,
 * highlight specific topics to study, and generate 3 remedial practice questions.
 */
export const getAiMistakeAnalysis = async (req, res) => {
  try {
    const userId = req.user?.userId || req.headers['x-user-id'] || req.body?.userId;
    const isAdmin = req.user?.role === 'admin';

    let attempts = [];
    if (userId && userId !== 'guest') {
      attempts = await Attempt.find({ userId }).lean();
    }
    if (attempts.length === 0 && isAdmin) {
      attempts = await Attempt.find({}).limit(30).lean();
    }

    const quizzes = await Quiz.find({}).select('id _id category title questions difficulty').lean();
    const quizMap = new Map();
    quizzes.forEach(q => {
      if (q.id) quizMap.set(String(q.id), q);
      if (q._id) quizMap.set(String(q._id), q);
    });

    const { wrongAnswers, weakTopics } = extractUserMistakes(attempts, quizMap);

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAttempts)
      : 0;

    // Build fallback in case user has no wrong answers or AI is unavailable
    const buildFallbackAnalysis = () => {
      const topWeak = weakTopics[0];
      return {
        generatedByAi: false,
        executiveSummary: wrongAnswers.length > 0
          ? `Based on your ${totalAttempts} quiz attempts (${avgScore}% average accuracy), most of your missed points come from ${topWeak ? `"${topWeak.topic}" (${topWeak.category})` : 'detail-oriented conceptual questions'}. Reviewing the exact distinctions between your chosen answers and the correct rules below will quickly push your accuracy above 85%.`
          : `You have completed ${totalAttempts} quizzes with ${avgScore}% accuracy and no recent wrong answers recorded! Keep challenging yourself with harder tracks and daily coding problems.`,
        topicsToStudy: weakTopics.slice(0, 4).map((t, idx) => ({
          topic: t.topic,
          category: t.category,
          priority: idx === 0 ? 'High' : idx === 1 ? 'Medium' : 'Review',
          errorRate: t.errorRate,
          wrongCount: t.wrongCount,
          reason: `You missed ${t.wrongCount} question${t.wrongCount > 1 ? 's' : ''} (${t.errorRate}% error rate) in ${t.topic}.`,
          studySteps: [
            `Review core definitions and syntax rules in ${t.topic}.`,
            `Compare your wrong choices against the official explanations before retaking.`,
            `Retake ${t.topic} in Review Mode until you score 100%.`
          ],
          recommendedQuizId: String(t.quizId)
        })),
        mistakeBreakdowns: wrongAnswers.slice(0, 6).map(w => ({
          question: w.question,
          quizTitle: w.quizTitle,
          category: w.category,
          quizId: w.quizId,
          userAnswer: w.userAnswer,
          correctAnswer: w.correctAnswer,
          whyWrong: w.explanation || `Selecting "${w.userAnswer}" overlooks the key principle tested by this question, where "${w.correctAnswer}" is required.`,
          coreConcept: `${w.category} — ${w.quizTitle}`,
          memoryTip: `When facing "${w.question.slice(0, 50)}...", verify why "${w.correctAnswer}" satisfies all constraints.`
        })),
        aiPracticeQuestions: wrongAnswers.slice(0, 3).map((w, i) => ({
          id: `remedial-${i + 1}`,
          topic: w.quizTitle,
          category: w.category,
          question: `[Remedial Check] Which statement or answer correctly resolves: "${w.question}"?`,
          options: Array.from(new Set([w.correctAnswer, w.userAnswer, 'None of the above', 'Depends on runtime context'])).slice(0, 4),
          correctAnswerIndex: 0,
          explanation: w.explanation || `The correct answer is "${w.correctAnswer}". Previously you selected "${w.userAnswer}".`
        }))
      };
    };

    if (wrongAnswers.length === 0) {
      return res.json(buildFallbackAnalysis());
    }

    const groq = getGroqClient();
    if (!groq) {
      return res.json(buildFallbackAnalysis());
    }

    const mistakesSample = wrongAnswers.slice(0, 8).map((w, idx) => (
      `${idx + 1}. [${w.category} - ${w.quizTitle} (quizId: ${w.quizId})]\n` +
      `   Question: ${w.question}\n` +
      (w.codeSnippet ? `   Code: ${w.codeSnippet}\n` : '') +
      `   Student's Wrong Answer: ${w.userAnswer}\n` +
      `   Correct Answer: ${w.correctAnswer}\n` +
      (w.explanation ? `   Reference Explanation: ${w.explanation}\n` : '')
    )).join('\n');

    const weakTopicsSample = weakTopics.map(t => (
      `- ${t.topic} (${t.category}, quizId: ${t.quizId}): ${t.wrongCount}/${t.totalAnswered} wrong (${t.errorRate}% error rate)`
    )).join('\n');

    const prompt = `You are an expert AI Learning Coach & Diagnostic Tutor for a programming and technology Quiz Platform.
Analyze this student's actual wrong answers and weak topics, then return a strictly valid JSON object to help them improve.

Student Overview:
- Total Quiz Attempts: ${totalAttempts}
- Overall Accuracy: ${avgScore}%

Weakest Topics / Quizzes:
${weakTopicsSample || 'None'}

Recent Wrong Answers Made by the Student:
${mistakesSample}

Return ONLY a valid JSON object matching this exact schema:
{
  "executiveSummary": "2-3 sentences of personalized, encouraging diagnostic insight explaining their specific mistake patterns (e.g., syntax mix-ups, conceptual gaps, edge cases) and what to focus on first.",
  "topicsToStudy": [
    {
      "topic": "Specific concept or module name they need to study",
      "category": "Category name",
      "priority": "High" | "Medium" | "Review",
      "errorRate": 50,
      "wrongCount": 3,
      "reason": "1 sentence explaining specifically what they are getting wrong in this topic",
      "studySteps": [
        "Concrete study step 1",
        "Concrete study step 2",
        "Concrete study step 3"
      ],
      "recommendedQuizId": "exact quizId from the input above"
    }
  ],
  "mistakeBreakdowns": [
    {
      "question": "The exact question text",
      "quizTitle": "Quiz title",
      "category": "Category",
      "quizId": "quizId",
      "userAnswer": "What the student answered",
      "correctAnswer": "The correct answer",
      "whyWrong": "Clear, insightful 1-2 sentence explanation of why the student's answer is wrong and why the correct answer is right",
      "coreConcept": "Short name of the exact rule/concept (e.g. 'Python Case-Sensitive Identifiers')",
      "memoryTip": "A punchy 1-line rule of thumb or mnemonic so they never miss this again"
    }
  ],
  "aiPracticeQuestions": [
    {
      "id": "ai-q1",
      "topic": "Specific concept being tested",
      "category": "Category",
      "question": "A brand-new multiple-choice practice question that tests the exact same concept the student missed (do not copy the exact wording, test the underlying concept)",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Clear explanation of why the correct option is right"
    }
  ]
}
Requirements:
- Include 3 to 4 items in "topicsToStudy".
- Include up to 6 items in "mistakeBreakdowns" corresponding to the student's actual wrong answers.
- Include exactly 3 items in "aiPracticeQuestions" with 4 options each and a valid "correctAnswerIndex" (0 to 3).`;

    let aiResult = null;
    for (const modelName of ANALYTICS_AI_MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are an expert technical tutor that outputs strictly valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
          max_tokens: 3500
        });
        const raw = completion?.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(raw);
        if (parsed && parsed.executiveSummary && Array.isArray(parsed.mistakeBreakdowns)) {
          aiResult = parsed;
          break;
        }
      } catch (err) {
        console.warn(`[Analytics AI] Model ${modelName} failed:`, err.message);
      }
    }

    if (!aiResult) {
      return res.json(buildFallbackAnalysis());
    }

    return res.json({
      generatedByAi: true,
      executiveSummary: aiResult.executiveSummary,
      topicsToStudy: Array.isArray(aiResult.topicsToStudy) ? aiResult.topicsToStudy : [],
      mistakeBreakdowns: Array.isArray(aiResult.mistakeBreakdowns) ? aiResult.mistakeBreakdowns : [],
      aiPracticeQuestions: Array.isArray(aiResult.aiPracticeQuestions) ? aiResult.aiPracticeQuestions : []
    });
  } catch (error) {
    console.error('AI Mistake Analysis error:', error);
    res.status(500).json({ message: 'Failed to generate AI mistake analysis', error: error.message });
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
              (q.type === 'text' ? evaluateTextAnswer(selected, q.correctAnswer, 0.70).isPassed : String(selected).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase())
            );
          }
        } else {
          selected = userAnsObj;
          isCorrect = selected !== undefined && (
            Number(selected) === Number(q.correctAnswer) ||
            (Array.isArray(q.options) && typeof q.correctAnswer === 'number' && q.options[q.correctAnswer] === selected) ||
            (q.type === 'text' ? evaluateTextAnswer(selected, q.correctAnswer, 0.70).isPassed : String(selected).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase())
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
