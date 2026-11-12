import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { SkillTrack } from '../models/SkillTrack.js';
import { Tournament } from '../models/Tournament.js';
import { Attempt } from '../models/Attempt.js';
import { User } from '../models/User.js';

import { DailyChallenge } from '../models/DailyChallenge.js';
import { CompilerQuestion } from '../models/CompilerQuestion.js';
import { CompilerSubmission } from '../models/CompilerSubmission.js';
import { SkillTrackProgress } from '../models/SkillTrackProgress.js';
import { checkAndUnlockBadges } from './badgeNodeController.js';
import { evaluateAndAwardBadges } from '../services/badgeService.js';
import { completeSpecificModule } from '../services/progressService.js';
import { evaluateSubmission, getPassThreshold } from '../services/compilerEvaluationService.js';
import { generateThreeTierChallenges } from '../services/dailyChallengeAiService.js';
import { syncClanXp } from '../utils/xpSync.js';

// --- Daily Compiler Challenge ---

/**
 * Helper to sanitize question details sent to client (excluding reference solution)
 */
const sanitizeQuestionForUser = (q) => {
  if (!q) return null;
  return {
    questionId: q.questionId,
    title: q.title,
    description: q.description,
    language: q.language || 'javascript',
    difficulty: q.difficulty,
    category: q.category,
    hints: q.hints || []
  };
};

/**
 * Helper to format a Date object as local YYYY-MM-DD
 */
const toLocalDateString = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

/**
 * Helper to parse a date input (including YYYY-MM-DD) as local midnight
 */
const parseLocalDate = (dateInput) => {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const dt = dateInput ? new Date(dateInput) : new Date();
  dt.setHours(0, 0, 0, 0);
  return dt;
};

/**
 * Get today's daily compiler challenge.
 * Returns challenges across 3 distinct tiers (Easy, Medium, Hard) if available.
 * 
 * @route GET /api/daily-challenge
 * @returns {Object} Challenge with 3 tiers and user completion status per tier
 */
export const getDailyChallenge = async (req, res) => {
  try {
    // Step 1: Verify authentication
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const userId = req.user.userId;

    // Step 2: Determine target date (Requested date or Today Midnight)
    const isSpecificDate = Boolean(req.query.date);
    const targetDate = isSpecificDate ? parseLocalDate(req.query.date) : parseLocalDate();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const todayMidnight = parseLocalDate();
    const isArchived = targetDate.getTime() < todayMidnight.getTime();

    // Step 3: Fetch passed question IDs for the user on targetDate
    const passedQuestionIds = await CompilerSubmission.getPassedQuestionsToday(userId, targetDate);
    const hasPassedAnyToday = passedQuestionIds.length > 0;

    // Step 4: Fetch challenge from DB
    let challenge = await DailyChallenge.findOne({ 
      date: { $gte: targetDate, $lt: nextDay } 
    }).lean();

    // Step 5: If no challenge exists
    if (!challenge) {
      if (isSpecificDate) {
        return res.status(404).json({ 
          message: 'No challenge found for the selected date.',
          reason: 'not_found'
        });
      }

      // Auto-create only for today if missing
      const eligibleQuestion = await CompilerQuestion.findEligibleQuestion();
      if (!eligibleQuestion) {
        return res.status(404).json({ 
          message: 'No compiler questions available. Please ask admin to add questions.',
          reason: 'no_questions'
        });
      }

      const createdChallenge = await DailyChallenge.create({
        date: targetDate,
        compilerQuestionId: eligibleQuestion.questionId
      });
      await CompilerQuestion.markAsUsed(eligibleQuestion.questionId);
      challenge = createdChallenge.toObject();
    }

    // Step 6: Fetch compiler questions for primary & all tiers
    const questionIdsToFetch = new Set();
    if (challenge.compilerQuestionId) questionIdsToFetch.add(challenge.compilerQuestionId);
    if (challenge.tiers?.easy?.compilerQuestionId) questionIdsToFetch.add(challenge.tiers.easy.compilerQuestionId);
    if (challenge.tiers?.medium?.compilerQuestionId) questionIdsToFetch.add(challenge.tiers.medium.compilerQuestionId);
    if (challenge.tiers?.hard?.compilerQuestionId) questionIdsToFetch.add(challenge.tiers.hard.compilerQuestionId);

    const questionsList = await CompilerQuestion.find({
      questionId: { $in: Array.from(questionIdsToFetch) }
    }).lean();

    const questionsMap = new Map(questionsList.map(q => [q.questionId, q]));

    // Helper to format tier object
    const formatTier = (tierConfig, difficultyFallback) => {
      if (!tierConfig || !tierConfig.compilerQuestionId) return null;
      const q = questionsMap.get(tierConfig.compilerQuestionId);
      if (!q) return null;
      const isCompleted = passedQuestionIds.includes(tierConfig.compilerQuestionId);

      return {
        questionId: tierConfig.compilerQuestionId,
        question: sanitizeQuestionForUser(q),
        rewards: {
          coins: tierConfig.rewardCoins ?? q.rewardCoins ?? 100,
          xp: tierConfig.rewardXP ?? q.rewardXP ?? 150,
          giftLabel: tierConfig.giftLabel || (difficultyFallback === 'easy' ? 'Bronze Novice Satchel' : difficultyFallback === 'hard' ? 'Gold Master Vault' : 'Silver Adept Cache'),
          badgeId: tierConfig.rewardBadgeId,
          itemId: tierConfig.rewardItemId
        },
        completed: isCompleted
      };
    };

    const easyTier = formatTier(challenge.tiers?.easy, 'easy');
    const mediumTier = formatTier(challenge.tiers?.medium, 'medium');
    const hardTier = formatTier(challenge.tiers?.hard, 'hard');

    const hasMultiTiers = Boolean(easyTier || mediumTier || hardTier);

    // Primary question (defaulting to medium, or easy, or legacy compilerQuestionId)
    const primaryQuestion = (mediumTier?.question) ||
      (easyTier?.question) ||
      (hardTier?.question) ||
      sanitizeQuestionForUser(questionsMap.get(challenge.compilerQuestionId));

    if (!primaryQuestion && !hasMultiTiers) {
      return res.status(404).json({ 
        message: 'Challenge question not found',
        reason: 'question_missing'
      });
    }

    // Calculate completion count across available tiers
    let completedCount = 0;
    let totalAvailableTiers = 0;
    if (easyTier) { totalAvailableTiers++; if (easyTier.completed) completedCount++; }
    if (mediumTier) { totalAvailableTiers++; if (mediumTier.completed) completedCount++; }
    if (hardTier) { totalAvailableTiers++; if (hardTier.completed) completedCount++; }

    // Fallback if no multi-tiers
    if (totalAvailableTiers === 0) {
      totalAvailableTiers = 1;
      completedCount = hasPassedAnyToday ? 1 : 0;
    }

    const allCompleted = completedCount > 0 && completedCount === totalAvailableTiers;

    // Step 7: Send response
    const response = {
      challengeId: challenge._id,
      date: targetDate,
      isArchived,
      question: primaryQuestion,
      rewards: {
        coins: challenge.rewardCoins || (primaryQuestion ? 100 : 0),
        xp: challenge.rewardXP || (primaryQuestion ? 150 : 0),
        badgeId: challenge.rewardBadgeId,
        itemId: challenge.rewardItemId
      },
      tiers: hasMultiTiers ? {
        easy: easyTier,
        medium: mediumTier,
        hard: hardTier
      } : {
        medium: {
          questionId: challenge.compilerQuestionId,
          question: primaryQuestion,
          rewards: {
            coins: challenge.rewardCoins || 100,
            xp: challenge.rewardXP || 150,
            giftLabel: 'Daily Challenge Chest',
            badgeId: challenge.rewardBadgeId,
            itemId: challenge.rewardItemId
          },
          completed: hasPassedAnyToday
        }
      },
      completedCount,
      totalTiers: totalAvailableTiers,
      allCompleted,
      streak: req.user.dailyChallengeStreak || 0,
      completed: hasPassedAnyToday,
      passThreshold: getPassThreshold()
    };
    
    res.json(response);

  } catch (error) {
    console.error('Daily Challenge Error:', error);
    res.status(500).json({ 
      message: 'Failed to process daily challenge request', 
      error: error.message
    });
  }
};

/**
 * Get daily challenge calendar for user.
 * Returns challenges and user completion state per date in the requested month/year.
 * @route GET /api/daily-challenge/calendar
 */
export const getDailyChallengeCalendar = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const userId = req.user.userId;

    const { month, year } = req.query;
    const now = new Date();
    const currentYear = year !== undefined ? parseInt(year) : now.getFullYear();
    const currentMonth = month !== undefined ? parseInt(month) : now.getMonth();

    // Start of the month (inclusive)
    const startDate = new Date(currentYear, currentMonth, 1);
    startDate.setHours(0, 0, 0, 0);

    // End of the month (inclusive)
    const endDate = new Date(currentYear, currentMonth + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all challenges in this date range
    const challenges = await DailyChallenge.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 }).lean();

    // Fetch all passed submissions for this user in this date range
    const submissions = await CompilerSubmission.find({
      userId,
      passed: true,
      challengeDate: { $gte: startDate, $lte: endDate }
    }).select('questionId challengeDate').lean();

    // Group passed questionIds by local date string (YYYY-MM-DD)
    const passedByDate = new Map();
    submissions.forEach(sub => {
      const dStr = toLocalDateString(sub.challengeDate);
      if (!passedByDate.has(dStr)) passedByDate.set(dStr, new Set());
      passedByDate.get(dStr).add(sub.questionId);
    });

    // Bulk fetch question details for titles and difficulties
    const questionIds = new Set();
    challenges.forEach(c => {
      if (c.compilerQuestionId) questionIds.add(c.compilerQuestionId);
      if (c.tiers?.easy?.compilerQuestionId) questionIds.add(c.tiers.easy.compilerQuestionId);
      if (c.tiers?.medium?.compilerQuestionId) questionIds.add(c.tiers.medium.compilerQuestionId);
      if (c.tiers?.hard?.compilerQuestionId) questionIds.add(c.tiers.hard.compilerQuestionId);
    });

    const questions = await CompilerQuestion.find({
      questionId: { $in: Array.from(questionIds) }
    }).select('questionId title difficulty category').lean();
    const questionMap = new Map(questions.map(q => [q.questionId, q]));

    // Format calendar days
    const calendarDays = challenges.map(c => {
      const dStr = toLocalDateString(c.date);
      const userPassedQuestions = passedByDate.get(dStr) || new Set();

      const tiers = {};
      let totalTiers = 0;
      let completedTiers = 0;

      const checkTier = (tierConfig, key) => {
        if (!tierConfig || !tierConfig.compilerQuestionId) return null;
        totalTiers++;
        const isPassed = userPassedQuestions.has(tierConfig.compilerQuestionId);
        if (isPassed) completedTiers++;
        const qInfo = questionMap.get(tierConfig.compilerQuestionId);
        return {
          questionId: tierConfig.compilerQuestionId,
          title: qInfo?.title || 'Challenge Question',
          difficulty: key,
          completed: isPassed,
          giftLabel: tierConfig.giftLabel || ''
        };
      };

      if (c.tiers?.easy || c.tiers?.medium || c.tiers?.hard) {
        tiers.easy = checkTier(c.tiers?.easy, 'easy');
        tiers.medium = checkTier(c.tiers?.medium, 'medium');
        tiers.hard = checkTier(c.tiers?.hard, 'hard');
      } else if (c.compilerQuestionId) {
        totalTiers = 1;
        const isPassed = userPassedQuestions.has(c.compilerQuestionId);
        if (isPassed) completedTiers = 1;
        const qInfo = questionMap.get(c.compilerQuestionId);
        tiers.medium = {
          questionId: c.compilerQuestionId,
          title: qInfo?.title || 'Challenge Question',
          difficulty: 'medium',
          completed: isPassed
        };
      }

      return {
        challengeId: c._id,
        date: c.date,
        dateString: dStr,
        totalTiers,
        completedTiers,
        allCompleted: totalTiers > 0 && completedTiers >= totalTiers,
        isPartiallyCompleted: completedTiers > 0 && completedTiers < totalTiers,
        tiers
      };
    });

    res.json({
      month: currentMonth,
      year: currentYear,
      days: calendarDays
    });
  } catch (error) {
    console.error('Daily Challenge Calendar Error:', error);
    res.status(500).json({ message: 'Error fetching challenge calendar', error: error.message });
  }
};

/**
 * Submit code for a daily compiler challenge tier.
 * Evaluates the submission using Groq AI and awards prizes for the specific tier.
 * Users can solve and earn rewards for all 3 tiers (Easy, Medium, Hard).
 * 
 * @route POST /api/daily-challenge/submit
 * @param {string} code - User's submitted code
 * @param {string} [questionId] - Specific tier question ID being submitted
 * @param {string} [tier] - Tier name ('easy' | 'medium' | 'hard')
 * @returns {Object} Evaluation result with score, feedback, pass status, and rewards
 */
export const submitCompilerAnswer = async (req, res) => {
  try {
    // Step 1: Validate auth
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const user = req.user;
    const userId = user.userId;

    // Step 2: Get submitted code, question/tier info, and optional challenge date
    const { code, questionId: submittedQuestionId, tier: submittedTier, date } = req.body;
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ message: 'Code submission is required' });
    }

    // Step 3: Determine challenge date
    const challengeDate = date ? parseLocalDate(date) : parseLocalDate();
    if (isNaN(challengeDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date parameter' });
    }
    const nextDay = new Date(challengeDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const todayMidnight = parseLocalDate();
    const isToday = challengeDate.getTime() === todayMidnight.getTime();

    // Step 4: Get challenge for this date
    const challenge = await DailyChallenge.findOne({ 
      date: { $gte: challengeDate, $lt: nextDay } 
    }).lean();

    if (!challenge) {
      return res.status(404).json({ message: 'No challenge available for this date' });
    }

    // Step 5: Identify the target question ID
    let targetQuestionId = submittedQuestionId;
    let resolvedTier = submittedTier;

    if (!targetQuestionId) {
      // Determine question ID from tier name if provided
      if (submittedTier && challenge.tiers?.[submittedTier]?.compilerQuestionId) {
        targetQuestionId = challenge.tiers[submittedTier].compilerQuestionId;
      } else {
        targetQuestionId = challenge.compilerQuestionId;
      }
    }

    // Resolve which tier this question belongs to in this challenge
    if (!resolvedTier && challenge.tiers) {
      if (challenge.tiers.easy?.compilerQuestionId === targetQuestionId) resolvedTier = 'easy';
      else if (challenge.tiers.medium?.compilerQuestionId === targetQuestionId) resolvedTier = 'medium';
      else if (challenge.tiers.hard?.compilerQuestionId === targetQuestionId) resolvedTier = 'hard';
    }

    // Step 6: Check if user already completed THIS specific question on challengeDate
    const alreadyPassedThisQuestion = await CompilerSubmission.hasPassedQuestionToday(userId, challengeDate, targetQuestionId);
    if (alreadyPassedThisQuestion) {
      return res.status(400).json({ 
        message: `You have already completed this ${resolvedTier ? resolvedTier.toUpperCase() + ' ' : ''}challenge!`,
        alreadyCompleted: true,
        tier: resolvedTier,
        streak: user.dailyChallengeStreak || 0
      });
    }

    // Step 7: Get the question with reference code
    const question = await CompilerQuestion.findOne({ 
      questionId: targetQuestionId 
    }).lean();

    if (!question) {
      return res.status(404).json({ message: 'Challenge question not found' });
    }

    // Step 8: Evaluate using Groq AI
    let evaluationResult;
    try {
      evaluationResult = await evaluateSubmission(question, code.trim());
    } catch (evalError) {
      console.error('AI Evaluation Error:', evalError);
      return res.status(500).json({ 
        message: 'Failed to evaluate submission. Please try again.',
        error: evalError.message
      });
    }

    const { score, feedback, passed } = evaluationResult;

    // Step 9: Save submission record
    await CompilerSubmission.create({
      userId,
      questionId: question.questionId,
      submittedCode: code.trim(),
      aiScore: score,
      aiFeedback: feedback,
      passed,
      challengeDate
    });

    // Step 10: If passed, award prizes and update streak
    let coinsAwarded = 0;
    let xpAwarded = 0;
    let giftLabel = '';
    let newStreak = user.dailyChallengeStreak || 0;
    let allTiersCompleted = false;

    if (passed) {
      // Determine tier-specific rewards
      const tierConfig = resolvedTier && challenge.tiers?.[resolvedTier] ? challenge.tiers[resolvedTier] : null;
      coinsAwarded = tierConfig?.rewardCoins ?? challenge.rewardCoins ?? question.rewardCoins ?? 100;
      xpAwarded = tierConfig?.rewardXP ?? challenge.rewardXP ?? question.rewardXP ?? 150;
      giftLabel = tierConfig?.giftLabel || (resolvedTier === 'easy' ? 'Bronze Novice Satchel' : resolvedTier === 'hard' ? 'Gold Master Vault' : 'Silver Adept Cache');

      // Check user's total passed challenges on this challengeDate
      const passedDateQuestionIds = await CompilerSubmission.getPassedQuestionsToday(userId, challengeDate);
      const isFirstToday = passedDateQuestionIds.length === 1;

      // Update streak only on today's first completed challenge
      if (isToday) {
        if (isFirstToday) {
          const lastChallengeDate = user.dailyChallengeDate ? new Date(user.dailyChallengeDate) : null;
          const yesterday = new Date(todayMidnight);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastChallengeDate && lastChallengeDate.getTime() === yesterday.getTime()) {
            newStreak = (user.dailyChallengeStreak || 0) + 1;
          } else if (lastChallengeDate && lastChallengeDate.getTime() === todayMidnight.getTime()) {
            newStreak = user.dailyChallengeStreak || 1;
          } else {
            newStreak = 1;
          }

          // Streak milestones
          if (newStreak === 7) {
            coinsAwarded += 50;
            xpAwarded += 100;
          } else if (newStreak === 30) {
            coinsAwarded += 200;
            xpAwarded += 500;
          }
        } else {
          newStreak = user.dailyChallengeStreak || 1;
        }

        user.dailyChallengeCompleted = true;
        user.dailyChallengeDate = todayMidnight;
        user.dailyChallengeStreak = newStreak;
      } else {
        newStreak = user.dailyChallengeStreak || 0;
      }

      // Check if all tiers in this challenge have now been completed
      const availableTierQIds = [
        challenge.tiers?.easy?.compilerQuestionId,
        challenge.tiers?.medium?.compilerQuestionId,
        challenge.tiers?.hard?.compilerQuestionId
      ].filter(Boolean);

      if (availableTierQIds.length > 1 && availableTierQIds.every(qId => passedDateQuestionIds.includes(qId))) {
        allTiersCompleted = true;
        // Triple Crown mastery bonus for clearing all 3 tiers!
        coinsAwarded += 75;
        xpAwarded += 150;
      }

      // Update user balances
      user.coins = (user.coins || 0) + coinsAwarded;
      user.xp = (user.xp || 0) + xpAwarded;
      
      if (user.clanId) {
        await syncClanXp(userId, xpAwarded, user.clanId);
      }

      // Award Shop Item if present
      const rewardItemId = tierConfig?.rewardItemId || challenge.rewardItemId;
      if (rewardItemId) {
        if (!user.inventory) user.inventory = [];
        const existingItem = user.inventory.find(i => i.itemId === rewardItemId);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          user.inventory.push({ itemId: rewardItemId, quantity: 1 });
        }
      }

      await user.save();

      // Check for badges
      await checkAndUnlockBadges(userId, 'daily_challenge_completed', {
        streak: newStreak,
        score,
        tier: resolvedTier,
        allTiersCompleted
      });
      await evaluateAndAwardBadges(userId).catch(() => {});
    }

    // Step 11: Send response
    res.json({
      score,
      feedback,
      passed,
      passThreshold: getPassThreshold(),
      tier: resolvedTier,
      giftLabel,
      allTiersCompleted,
      rewards: passed ? {
        coins: coinsAwarded,
        xp: xpAwarded,
        giftLabel,
        streak: newStreak,
        allTiersCompleted
      } : null,
      streak: passed ? newStreak : (user.dailyChallengeStreak || 0)
    });

  } catch (error) {
    console.error('Submit Compiler Answer Error:', error);
    res.status(500).json({ 
      message: 'Failed to process submission', 
      error: error.message
    });
  }
};

/**
 * Legacy endpoint - kept for backwards compatibility.
 * Now just checks if user has completed today's challenge.
 * 
 * @route POST /api/daily-challenge/complete
 * @deprecated Use submitCompilerAnswer instead
 */
export const completeDailyChallenge = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const user = req.user;

    const hasPassedToday = await CompilerSubmission.hasPassedToday(user.userId, today);
    
    if (hasPassedToday) {
      return res.json({ 
        message: 'Challenge completed', 
        streak: user.dailyChallengeStreak,
        coins: user.coins,
        xp: user.xp
      });
    }

    return res.status(400).json({ 
      message: 'Please submit your code solution first',
      completed: false
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking challenge status', error: error.message });
  }
};

// --- Compiler Question Admin CRUD ---

/**
 * Get all compiler questions (Admin).
 * @route GET /api/compiler-questions/admin
 */
export const getCompilerQuestionsAdmin = async (req, res) => {
  try {
    const questions = await CompilerQuestion.find({})
      .sort({ createdAt: -1 })
      .lean();
    
    // Add stats to each question
    const questionsWithStats = await Promise.all(
      questions.map(async (q) => {
        const stats = await CompilerSubmission.getQuestionStats(q.questionId);
        return { ...q, stats };
      })
    );

    res.json(questionsWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching questions', error: error.message });
  }
};

/**
 * Create a new compiler question (Admin).
 * @route POST /api/compiler-questions/admin
 */
export const createCompilerQuestion = async (req, res) => {
  try {
    const { title, description, referenceCode, language, difficulty, category, hints, rewardCoins, rewardXP } = req.body;

    if (!title || !description || !referenceCode) {
      return res.status(400).json({ message: 'Title, description, and reference code are required' });
    }

    const question = new CompilerQuestion({
      title,
      description,
      referenceCode,
      language: language || 'javascript',
      difficulty: difficulty || 'medium',
      category: category || 'general',
      hints: hints || [],
      rewardCoins: rewardCoins || 100,
      rewardXP: rewardXP || 150
    });

    await question.save();
    res.status(201).json(question);
  } catch (error) {
    console.error('Create Question Error:', error);
    res.status(500).json({ message: 'Error creating question', error: error.message });
  }
};

/**
 * Bulk upload compiler questions (Admin).
 * @route POST /api/compiler-questions/admin/bulk
 */
export const bulkUploadCompilerQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required' });
    }

    const results = { created: 0, errors: [] };

    for (const q of questions) {
      try {
        if (!q.title || !q.description || !q.referenceCode) {
          results.errors.push({ title: q.title || 'Unknown', error: 'Missing required fields' });
          continue;
        }

        const question = new CompilerQuestion({
          title: q.title,
          description: q.description,
          referenceCode: q.referenceCode,
          language: q.language || 'javascript',
          difficulty: q.difficulty || 'medium',
          category: q.category || 'general',
          hints: q.hints || [],
          rewardCoins: q.rewardCoins || 100,
          rewardXP: q.rewardXP || 150
        });

        await question.save();
        results.created++;
      } catch (err) {
        results.errors.push({ title: q.title || 'Unknown', error: err.message });
      }
    }

    res.json({
      message: `Uploaded ${results.created} questions`,
      created: results.created,
      errors: results.errors
    });
  } catch (error) {
    res.status(500).json({ message: 'Error bulk uploading questions', error: error.message });
  }
};

/**
 * Update a compiler question (Admin).
 * @route PUT /api/compiler-questions/admin/:id
 */
export const updateCompilerQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const question = await CompilerQuestion.findOneAndUpdate(
      { questionId: id },
      updates,
      { new: true }
    );

    if (!question) {
      // Try by _id
      const byObjectId = await CompilerQuestion.findByIdAndUpdate(id, updates, { new: true });
      if (!byObjectId) {
        return res.status(404).json({ message: 'Question not found' });
      }
      return res.json(byObjectId);
    }

    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Error updating question', error: error.message });
  }
};

/**
 * Delete a compiler question (Admin).
 * @route DELETE /api/compiler-questions/admin/:id
 */
export const deleteCompilerQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    let result = await CompilerQuestion.deleteOne({ questionId: id });
    
    if (result.deletedCount === 0) {
      // Try by _id
      result = await CompilerQuestion.deleteOne({ _id: id });
    }

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting question', error: error.message });
  }
};

// --- Daily Challenge Admin CRUD (Updated for Compiler Questions) ---

/**
 * Create/Schedule a daily challenge (Admin).
 * @route POST /api/daily-challenge/admin
 */
export const createDailyChallenge = async (req, res) => {
  try {
    const { date, compilerQuestionId, rewardCoins, rewardXP, rewardBadgeId, rewardItemId } = req.body;
    
    if (!date || !compilerQuestionId) {
      return res.status(400).json({ message: 'Date and compilerQuestionId are required' });
    }

    const challengeDate = new Date(date);
    if (isNaN(challengeDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    challengeDate.setHours(0, 0, 0, 0);

    // Verify question exists
    const question = await CompilerQuestion.findOne({ questionId: compilerQuestionId }).lean();
    if (!question) {
      return res.status(404).json({ message: 'Compiler question not found' });
    }

    // Check for existing challenge on this date - if exists, append/update seamlessly
    const existing = await DailyChallenge.findOne({ date: challengeDate });
    if (existing) {
      existing.compilerQuestionId = compilerQuestionId;
      if (rewardCoins !== undefined) existing.rewardCoins = rewardCoins;
      if (rewardXP !== undefined) existing.rewardXP = rewardXP;
      if (rewardBadgeId !== undefined) existing.rewardBadgeId = rewardBadgeId;
      if (rewardItemId !== undefined) existing.rewardItemId = rewardItemId;

      if (!existing.tiers) existing.tiers = {};
      const diff = question.difficulty || 'medium';
      if (diff === 'easy' || diff === 'medium' || diff === 'hard') {
        existing.tiers[diff] = {
          compilerQuestionId,
          rewardCoins: rewardCoins || (diff === 'easy' ? 50 : diff === 'medium' ? 100 : 200),
          rewardXP: rewardXP || (diff === 'easy' ? 80 : diff === 'medium' ? 180 : 400),
          rewardBadgeId,
          rewardItemId,
          giftLabel: existing.tiers[diff]?.giftLabel || `${diff.charAt(0).toUpperCase() + diff.slice(1)} Challenge Gift`
        };
      }

      await existing.save();
      return res.status(200).json({ ...existing.toObject(), question, updated: true });
    }

    const diff = question.difficulty || 'medium';
    const initialTiers = {};
    if (diff === 'easy' || diff === 'medium' || diff === 'hard') {
      initialTiers[diff] = {
        compilerQuestionId,
        rewardCoins: rewardCoins || 100,
        rewardXP: rewardXP || 50,
        rewardBadgeId,
        rewardItemId,
        giftLabel: `${diff.charAt(0).toUpperCase() + diff.slice(1)} Challenge Gift`
      };
    }

    const challenge = new DailyChallenge({
      date: challengeDate,
      compilerQuestionId,
      rewardCoins,
      rewardXP,
      rewardBadgeId,
      rewardItemId,
      tiers: Object.keys(initialTiers).length > 0 ? initialTiers : undefined
    });

    await challenge.save();
    res.status(201).json({ ...challenge.toObject(), question });
  } catch (error) {
    console.error('Create Daily Challenge Error:', error);
    res.status(500).json({ message: 'Error creating daily challenge', error: error.message });
  }
};

/**
 * Update a daily challenge (Admin).
 * @route PUT /api/daily-challenge/admin/:id
 */
export const updateDailyChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { compilerQuestionId, rewardCoins, rewardXP, rewardBadgeId, rewardItemId, date, tiers } = req.body;

    const updates = {};
    if (compilerQuestionId) updates.compilerQuestionId = compilerQuestionId;
    if (rewardCoins !== undefined) updates.rewardCoins = rewardCoins;
    if (rewardXP !== undefined) updates.rewardXP = rewardXP;
    if (rewardBadgeId !== undefined) updates.rewardBadgeId = rewardBadgeId;
    if (rewardItemId !== undefined) updates.rewardItemId = rewardItemId;
    if (tiers !== undefined) updates.tiers = tiers;

    if (date) {
      const targetDate = new Date(date);
      if (!isNaN(targetDate.getTime())) {
        targetDate.setHours(0, 0, 0, 0);
        // Check if another challenge exists on targetDate
        const existingOnDate = await DailyChallenge.findOne({
          _id: { $ne: id },
          date: targetDate
        });

        if (existingOnDate) {
          // Append/merge into existing challenge on target date
          const currentDoc = await DailyChallenge.findById(id);
          if (currentDoc) {
            if (!existingOnDate.tiers) existingOnDate.tiers = {};
            if (currentDoc.tiers) {
              if (currentDoc.tiers.easy) existingOnDate.tiers.easy = currentDoc.tiers.easy;
              if (currentDoc.tiers.medium) existingOnDate.tiers.medium = currentDoc.tiers.medium;
              if (currentDoc.tiers.hard) existingOnDate.tiers.hard = currentDoc.tiers.hard;
            }
            if (compilerQuestionId) {
              existingOnDate.compilerQuestionId = compilerQuestionId;
            } else if (!existingOnDate.compilerQuestionId) {
              existingOnDate.compilerQuestionId = currentDoc.compilerQuestionId;
            }
            if (rewardCoins !== undefined) existingOnDate.rewardCoins = rewardCoins;
            if (rewardXP !== undefined) existingOnDate.rewardXP = rewardXP;
            if (rewardBadgeId !== undefined) existingOnDate.rewardBadgeId = rewardBadgeId;
            if (rewardItemId !== undefined) existingOnDate.rewardItemId = rewardItemId;
            await existingOnDate.save();
            await DailyChallenge.deleteOne({ _id: id });
            return res.json({ ...existingOnDate.toObject(), merged: true });
          }
        } else {
          updates.date = targetDate;
        }
      }
    }

    const challenge = await DailyChallenge.findByIdAndUpdate(id, updates, { new: true });
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ message: 'Error updating challenge', error: error.message });
  }
};

/**
 * Get all daily challenges (Admin).
 * @route GET /api/daily-challenge/admin/all
 */
export const getDailyChallengesAdmin = async (req, res) => {
  try {
    const challenges = await DailyChallenge.find({}).sort({ date: -1 }).limit(40).lean();
    
    // OPTIMIZATION: Bulk fetch all questions in one query instead of N+1
    const questionIds = new Set();
    challenges.forEach(c => {
      if (c.compilerQuestionId) questionIds.add(c.compilerQuestionId);
      if (c.tiers?.easy?.compilerQuestionId) questionIds.add(c.tiers.easy.compilerQuestionId);
      if (c.tiers?.medium?.compilerQuestionId) questionIds.add(c.tiers.medium.compilerQuestionId);
      if (c.tiers?.hard?.compilerQuestionId) questionIds.add(c.tiers.hard.compilerQuestionId);
    });

    const questions = await CompilerQuestion.find({ questionId: { $in: Array.from(questionIds) } }).lean();
    const questionMap = new Map(questions.map(q => [q.questionId, q]));
    
    // Populate using the map
    const populated = challenges.map(c => {
      const primaryQ = questionMap.get(c.compilerQuestionId) || null;
      const populatedTiers = c.tiers ? {
        easy: c.tiers.easy ? {
          ...c.tiers.easy,
          question: questionMap.get(c.tiers.easy.compilerQuestionId) || null
        } : null,
        medium: c.tiers.medium ? {
          ...c.tiers.medium,
          question: questionMap.get(c.tiers.medium.compilerQuestionId) || null
        } : null,
        hard: c.tiers.hard ? {
          ...c.tiers.hard,
          question: questionMap.get(c.tiers.hard.compilerQuestionId) || null
        } : null
      } : null;

      return {
        ...c,
        question: primaryQ,
        populatedTiers
      };
    });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching challenges', error: error.message });
  }
};

/**
 * AI-generate a 3-tier daily challenge (Admin).
 * Uses existing quizzes as reference context to generate 3 distinct difficulty tiers (Easy, Medium, Hard).
 * Each tier has different rewards/gifts, and users can answer all 3.
 * 
 * @route POST /api/daily-challenge/admin/ai-generate
 */
export const generateAiDailyChallenge = async (req, res) => {
  try {
    const { date, referenceQuizId, language, customTopic, tierRewards, saveDirectly = true } = req.body;

    const result = await generateThreeTierChallenges({
      date: date || new Date(),
      referenceQuizId,
      language: language || 'javascript',
      customTopic,
      tierRewards: tierRewards || {},
      saveDirectly
    });

    res.status(200).json({
      message: saveDirectly ? 'Daily challenge with 3 tiers generated and scheduled!' : '3 tiers generated for preview',
      ...result
    });
  } catch (error) {
    console.error('AI Generate Daily Challenge Error:', error);
    res.status(500).json({
      message: error.message || 'Failed to generate 3-tier challenge with AI',
      error: error.message
    });
  }
};

/**
 * Delete a daily challenge (Admin).
 * @route DELETE /api/daily-challenge/admin/:id
 */
export const deleteDailyChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await DailyChallenge.deleteOne({ _id: id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Challenge not found' });
    res.json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting challenge', error: error.message });
  }
};

// Helper removed: Replaced by progressService.completeSpecificModule


// --- Skill Tracks ---
export const getSkillTracks = async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === 'true';
    const query = includeHidden ? {} : {
      $or: [
        { isVisible: { $ne: false } },
        { isVisible: { $exists: false } }
      ]
    };

    if (req.query.subjectId) {
        query.subjectId = req.query.subjectId;
    }
    const tracks = await SkillTrack.find(query).lean();
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching skill tracks', error: error.message });
  }
};

export const completeSkillModule = async (req, res) => {
  try {
    const { trackId } = req.params;
    const { moduleId } = req.body;
    if (!moduleId) return res.status(400).json({ message: 'moduleId is required' });

    // Use the unified logic from service
    // This updates both SkillTrackProgress and User models
    const progressUpdated = await completeSpecificModule(req.user.userId, trackId, moduleId);
    
    // Legacy Code Removal: The service now handles User model sync.
    // However, we need to check if we trigger badges here or if that should move to service too.
    // The service handles data, badge logic is separate.
    
    // We can refetch user to get latest state for badge check if needed, 
    // or trust the service did its job.
    
    // Check for badges (using existing logic)
    const newBadges = await checkAndUnlockBadges(req.user.userId, 'module_completion', {
      moduleId,
      trackId
    });

    res.json({ 
        message: 'Module completed',
        newBadges: newBadges || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating track progress', error: error.message });
  }
};

/**
 * Complete a sub-module within a module.
 * POST /api/skill-tracks/:trackId/modules/:moduleId/submodules/complete
 */
export const completeSubModuleHandler = async (req, res) => {
  try {
    const { trackId, moduleId } = req.params;
    const { subModuleId } = req.body;

    if (!subModuleId) {
      return res.status(400).json({ message: 'subModuleId is required' });
    }

    // Import and use the service
    const { completeSubModule } = await import('../services/progressService.js');
    const progress = await completeSubModule(req.user.userId, trackId, moduleId, subModuleId);

    res.json({
      message: 'Sub-module completed',
      completedSubModules: progress.completedSubModules,
      completedModules: progress.completedModules,
      unlockedModules: progress.unlockedModules
    });
  } catch (error) {
    console.error('Error completing sub-module:', error);
    res.status(500).json({ message: 'Error completing sub-module', error: error.message });
  }
};

export const createSkillTrack = async (req, res) => {
  try {
    const trackData = req.body;
    if (!trackData.trackId || !trackData.title) {
        return res.status(400).json({ message: 'trackId and title are required' });
    }
    const existing = await SkillTrack.findOne({ trackId: trackData.trackId });
    if (existing) {
        return res.status(409).json({ message: 'Track with this ID already exists' });
    }
    const track = new SkillTrack(trackData);
    await track.save();
    res.status(201).json(track);
  } catch (error) {
    res.status(500).json({ message: 'Error creating track', error: error.message });
  }
};

export const updateSkillTrack = async (req, res) => {
  try {
    const { trackId } = req.params;
    const updates = req.body;
    
    console.log('📝 Updating track:', trackId);
    console.log('📦 Payload modules count:', updates.modules?.length || 0);
    
    const track = await SkillTrack.findOne({ trackId });
    if (!track) {
      console.log('❌ Track not found:', trackId);
      return res.status(404).json({ message: 'Track not found' });
    }

    // Update all fields that can be changed
    if (updates.title) track.title = updates.title;
    if (updates.description !== undefined) track.description = updates.description;
    if (updates.category) track.category = updates.category;
    if (updates.icon) track.icon = updates.icon;
    if (updates.subjectId) track.subjectId = updates.subjectId;
    if (updates.modules) track.modules = updates.modules; // This includes subModules, coordinates, etc.
    
    // Mark modules as modified to ensure nested objects are saved
    track.markModified('modules');
    
    try {
      await track.save();
      console.log('✅ Track saved successfully');
    } catch (saveError) {
      console.error('❌ Save validation error:', saveError.message);
      if (saveError.errors) {
        Object.keys(saveError.errors).forEach(key => {
          console.error(`  - ${key}: ${saveError.errors[key].message} (value: ${saveError.errors[key].value})`);
        });
      }
      throw saveError;
    }
    
    res.json(track);
  } catch (error) {
    console.error('❌ Error updating track:', error.message);
    res.status(500).json({ message: 'Error updating track', error: error.message });
  }
};

export const deleteSkillTrack = async (req, res) => {
  try {
    const { trackId } = req.params;
    const result = await SkillTrack.deleteOne({ trackId });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Track not found' });
    res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting track', error: error.message });
  }
};

// In-memory telemetry cache for active tournament quiz-takers: tournamentId -> Map<userId, SessionData>
const tournamentActiveSessions = new Map();

// --- Tournaments ---

/**
 * Get all tournaments with user participation status and computed time state
 */
export const getTournaments = async (req, res) => {
  try {
    const now = new Date();
    const currentUserId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin' || req.user?.isAdmin === true;

    const tournaments = await Tournament.find({}).sort({ startsAt: 1 }).lean();

    const mapped = tournaments.map(t => {
      let status = t.status || 'scheduled';
      if (status !== 'completed' && t.startsAt && t.endsAt) {
        if (now < new Date(t.startsAt)) status = 'scheduled';
        else if (now >= new Date(t.startsAt) && now <= new Date(t.endsAt)) status = 'live';
        else status = 'completed';
      }

      // Check current user's participation
      const participants = t.participants || [];
      const userParticipant = currentUserId ? participants.find(p => p.userId === currentUserId) : null;

      // Sanitize other participants' scores/percentages if results are not yet revealed and requester is not admin
      const isRevealed = Boolean(t.resultsRevealed);
      const safeParticipants = participants.map(p => {
        if (!isAdmin && !isRevealed && p.userId !== currentUserId) {
          const { score, percentage, ...rest } = p;
          return rest;
        }
        return p;
      });

      return {
        ...t,
        status,
        participantsCount: participants.length,
        approvedCount: participants.filter(p => p.status === 'approved').length,
        pendingCount: participants.filter(p => p.status === 'pending').length,
        submittedCount: participants.filter(p => p.submittedAt).length,
        myStatus: userParticipant ? userParticipant.status : 'none',
        myParticipation: userParticipant || null,
        hasSubmitted: Boolean(userParticipant?.submittedAt),
        myAttemptId: userParticipant?.attemptId || null,
        participants: isAdmin ? participants : safeParticipants
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournaments', error: error.message });
  }
};

/**
 * Get single tournament by tournamentId
 */
export const getTournamentById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin' || req.user?.isAdmin === true;

    const t = await Tournament.findOne({ tournamentId: id }).lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    const now = new Date();
    let status = t.status || 'scheduled';
    if (status !== 'completed' && t.startsAt && t.endsAt) {
      if (now < new Date(t.startsAt)) status = 'scheduled';
      else if (now >= new Date(t.startsAt) && now <= new Date(t.endsAt)) status = 'live';
      else status = 'completed';
    }

    const participants = t.participants || [];
    const userParticipant = currentUserId ? participants.find(p => p.userId === currentUserId) : null;
    const isRevealed = Boolean(t.resultsRevealed);

    const safeParticipants = participants.map(p => {
      if (!isAdmin && !isRevealed && p.userId !== currentUserId) {
        const { score, percentage, ...rest } = p;
        return rest;
      }
      return p;
    });

    res.json({
      ...t,
      status,
      participantsCount: participants.length,
      approvedCount: participants.filter(p => p.status === 'approved').length,
      pendingCount: participants.filter(p => p.status === 'pending').length,
      submittedCount: participants.filter(p => p.submittedAt).length,
      myStatus: userParticipant ? userParticipant.status : 'none',
      myParticipation: userParticipant || null,
      hasSubmitted: Boolean(userParticipant?.submittedAt),
      myAttemptId: userParticipant?.attemptId || null,
      participants: isAdmin ? participants : safeParticipants
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournament', error: error.message });
  }
};

/**
 * Admin create tournament
 */
export const createTournament = async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id; // Prevent Mongo duplicate or immutable _id error
    if (!data.tournamentId) {
      data.tournamentId = `tourn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
    if (data.requiresApproval === undefined) {
      data.requiresApproval = true;
    }
    if (data.resultsRevealed === undefined) {
      data.resultsRevealed = false;
    }

    const t = new Tournament(data);
    await t.save();
    res.status(201).json(t);
  } catch (error) {
    res.status(500).json({ message: 'Error creating tournament', error: error.message });
  }
};

/**
 * Admin update tournament
 */
export const updateTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: new Date() };
    delete updates._id; // Prevent Mongo immutable field '_id' modification error

    const t = await Tournament.findOneAndUpdate({ tournamentId: id }, updates, { new: true, runValidators: true });
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    res.json(t);
  } catch (error) {
    res.status(500).json({ message: 'Error updating tournament', error: error.message });
  }
};

/**
 * Admin delete tournament
 */
export const deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;
    await Tournament.deleteOne({ tournamentId: id });
    tournamentActiveSessions.delete(id);
    res.json({ message: 'Tournament deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tournament', error: error.message });
  }
};

/**
 * Student request to join tournament (or instant join if approval is not required)
 */
export const requestJoinTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const t = await Tournament.findOne({ tournamentId: id });
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    if (!t.participants) t.participants = [];

    // Check if user is already registered
    const existing = t.participants.find(p => p.userId === userId);
    if (existing) {
      return res.json({
        message: existing.status === 'approved' ? 'Already approved to participate' : 'Request already submitted',
        status: existing.status,
        participant: existing
      });
    }

    // Resolve user profile info
    const userDoc = await User.findOne({ userId }).lean();
    const userName = userDoc?.name || req.user.name || 'Student';
    const userEmail = userDoc?.email || req.user.email || '';
    const userAvatar = userDoc?.avatar || '';

    // Auto-approve if tournament does not require approval
    const status = t.requiresApproval ? 'pending' : 'approved';

    const newParticipant = {
      userId,
      userName,
      userEmail,
      userAvatar,
      status,
      requestedAt: new Date(),
      approvedAt: status === 'approved' ? new Date() : undefined
    };

    t.participants.push(newParticipant);
    await t.save();

    // Notify admin via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`tournament_admin_${id}`).emit('tournament_join_requested', {
        tournamentId: id,
        participant: newParticipant
      });
    }

    res.json({
      message: status === 'approved' ? 'Successfully joined the tournament!' : 'Join request submitted! Awaiting teacher/admin approval.',
      status,
      participant: newParticipant
    });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting to join tournament', error: error.message });
  }
};

// Alias for backwards compatibility
export const joinTournament = requestJoinTournament;

/**
 * Admin approve or reject participant requests (supports single userId or array of userIds)
 */
export const manageTournamentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds, userId, action } = req.body; // action: 'approve' | 'reject' | 'remove'

    if (!['approve', 'reject', 'remove'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve", "reject", or "remove"' });
    }

    const targetUserIds = Array.isArray(userIds) ? userIds : (userId ? [userId] : []);
    if (targetUserIds.length === 0) {
      return res.status(400).json({ message: 'userIds array or userId is required' });
    }

    const t = await Tournament.findOne({ tournamentId: id });
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    if (!t.participants) t.participants = [];

    if (action === 'remove') {
      t.participants = t.participants.filter(p => !targetUserIds.includes(p.userId));
    } else {
      const now = new Date();
      t.participants = t.participants.map(p => {
        if (targetUserIds.includes(p.userId)) {
          return {
            ...p,
            status: action === 'approve' ? 'approved' : 'rejected',
            approvedAt: action === 'approve' ? now : undefined
          };
        }
        return p;
      });
    }

    await t.save();

    // Broadcast socket updates to users
    const io = req.app.get('io');
    if (io) {
      targetUserIds.forEach(uid => {
        io.to(uid).emit('tournament_request_status', {
          tournamentId: id,
          status: action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : 'removed')
        });
      });
      io.to(`tournament_admin_${id}`).emit('tournament_requests_updated', {
        tournamentId: id,
        action,
        userIds: targetUserIds
      });
    }

    res.json({
      message: `Successfully processed ${targetUserIds.length} request(s)`,
      action,
      updatedCount: targetUserIds.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error managing tournament requests', error: error.message });
  }
};

/**
 * Admin reveal or hide tournament results
 */
export const revealTournamentResults = async (req, res) => {
  try {
    const { id } = req.params;
    const { resultsRevealed } = req.body;

    const revealed = resultsRevealed !== undefined ? Boolean(resultsRevealed) : true;
    const t = await Tournament.findOneAndUpdate(
      { tournamentId: id },
      {
        resultsRevealed: revealed,
        revealedAt: revealed ? new Date() : null,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    // Emit socket event to all students in the tournament room
    const io = req.app.get('io');
    if (io) {
      io.to(`tournament_${id}`).emit('tournament_results_revealed', {
        tournamentId: id,
        resultsRevealed: revealed,
        revealedAt: t.revealedAt
      });
    }

    res.json({
      message: revealed ? 'Results revealed to all participants!' : 'Results locked. Students must wait for reveal.',
      resultsRevealed: revealed,
      revealedAt: t.revealedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling result reveal', error: error.message });
  }
};

/**
 * Get active live quiz takers for a tournament (Admin Live Room & Live Refresh)
 */
export const getTournamentLiveTakers = async (req, res) => {
  try {
    const { id } = req.params;
    const activeMap = tournamentActiveSessions.get(id) || new Map();
    const now = Date.now();
    const TWO_MINUTES = 2 * 60 * 1000;

    const liveSessions = [];
    for (const [userId, session] of activeMap.entries()) {
      // Keep session if updated within the last 2 minutes
      if (now - session.lastActive <= TWO_MINUTES) {
        liveSessions.push(session);
      } else {
        activeMap.delete(userId);
      }
    }

    // Also fetch participants from DB who have completed their submission
    const t = await Tournament.findOne({ tournamentId: id }).lean();
    const dbSubmissions = (t?.participants || [])
      .filter(p => p.submittedAt)
      .map(p => ({
        userId: p.userId,
        userName: p.userName,
        userAvatar: p.userAvatar,
        userEmail: p.userEmail,
        status: 'submitted',
        score: p.score,
        percentage: p.percentage,
        timeTaken: p.timeTaken,
        submittedAt: p.submittedAt,
        lastActive: new Date(p.submittedAt).getTime()
      }));

    res.json({
      activeCount: liveSessions.length,
      submittedCount: dbSubmissions.length,
      liveTakers: liveSessions,
      recentSubmissions: dbSubmissions
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching live tournament sessions', error: error.message });
  }
};

/**
 * Student heartbeat while on tournament quiz
 */
export const recordTournamentHeartbeat = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { currentQuestion, totalQuestions, score, answersCount, status, timeElapsed } = req.body;

    if (!tournamentActiveSessions.has(id)) {
      tournamentActiveSessions.set(id, new Map());
    }

    const sessionMap = tournamentActiveSessions.get(id);
    const userDoc = await User.findOne({ userId }).lean();

    const sessionData = {
      userId,
      userName: userDoc?.name || req.user.name || 'Student',
      userEmail: userDoc?.email || req.user.email || '',
      userAvatar: userDoc?.avatar || '',
      currentQuestion: Number(currentQuestion) || 1,
      totalQuestions: Number(totalQuestions) || 10,
      score: Number(score) || 0,
      answersCount: Number(answersCount) || 0,
      status: status || 'answering', // 'answering' | 'focus_lost' | 'submitted'
      timeElapsed: Number(timeElapsed) || 0,
      lastActive: Date.now()
    };

    sessionMap.set(userId, sessionData);

    // Relay to admin live proctoring room via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`tournament_admin_${id}`).emit('tournament_live_update', sessionData);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Heartbeat error', error: error.message });
  }
};

/**
 * Get tournament leaderboard
 */
export const getTournamentLeaderboard = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin' || req.user?.isAdmin === true;

    const t = await Tournament.findOne({ tournamentId: id }).lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    // Results Gating check
    if (!isAdmin && !t.resultsRevealed) {
      const myParticipant = currentUserId ? (t.participants || []).find(p => p.userId === currentUserId) : null;
      return res.json({
        resultsRevealed: false,
        message: 'Tournament results have not been revealed by the instructor yet.',
        submittedCount: (t.participants || []).filter(p => p.submittedAt).length,
        mySubmission: myParticipant?.submittedAt ? {
          submittedAt: myParticipant.submittedAt,
          timeTaken: myParticipant.timeTaken
        } : null
      });
    }

    // Build leaderboard from participants with submissions
    const participantsWithScores = (t.participants || [])
      .filter(p => p.submittedAt !== undefined && p.score !== undefined)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.timeTaken || 0) - (b.timeTaken || 0);
      });

    const leaderboard = participantsWithScores.map((p, index) => ({
      rank: index + 1,
      userId: p.userId,
      userName: p.userName || 'Student',
      userEmail: isAdmin ? p.userEmail : undefined,
      userAvatar: p.userAvatar || '',
      score: p.score || 0,
      percentage: p.percentage || 0,
      timeTaken: p.timeTaken || 0,
      submittedAt: p.submittedAt,
      attemptId: p.attemptId
    }));

    res.json({
      resultsRevealed: true,
      revealedAt: t.revealedAt,
      totalParticipants: t.participants?.length || 0,
      submittedCount: leaderboard.length,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournament leaderboard', error: error.message });
  }
};

/**
 * Get tournament history & past event archives
 */
export const getTournamentHistory = async (req, res) => {
  try {
    const completed = await Tournament.find({
      $or: [
        { status: 'completed' },
        { endsAt: { $lt: new Date() } }
      ]
    }).sort({ endsAt: -1 }).lean();

    const history = completed.map(t => {
      const submitted = (t.participants || [])
        .filter(p => p.submittedAt && p.score !== undefined)
        .sort((a, b) => (b.score - a.score) || ((a.timeTaken || 0) - (b.timeTaken || 0)));

      const podium = submitted.slice(0, 3).map((p, idx) => ({
        rank: idx + 1,
        userName: p.userName,
        userAvatar: p.userAvatar,
        score: p.score,
        percentage: p.percentage,
        timeTaken: p.timeTaken
      }));

      return {
        tournamentId: t.tournamentId,
        name: t.name,
        description: t.description,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
        totalParticipants: t.participants?.length || 0,
        podium,
        resultsRevealed: t.resultsRevealed,
        rewardBadgeId: t.rewardBadgeId
      };
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournament history', error: error.message });
  }
};

/**
 * Admin: Get all attempts for a tournament
 */
export const getTournamentAttempts = async (req, res) => {
  try {
    const { id } = req.params;
    const attempts = await Attempt.find({ tournamentId: id }).sort({ completedAt: -1 }).lean();
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournament attempts', error: error.message });
  }
};

/**
 * Teacher / Session Review Mode: Get detailed answered exam to explain question-by-question
 */
export const getTournamentAttemptReview = async (req, res) => {
  try {
    const { id, attemptId } = req.params;
    const currentUserId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin' || req.user?.isAdmin === true;

    const t = await Tournament.findOne({ tournamentId: id }).lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });

    // Look for attempt
    let attempt = await Attempt.findOne({ attemptId }).lean();
    if (!attempt) {
      // Fallback: check if attemptId is in participant record
      const participant = (t.participants || []).find(p => p.attemptId === attemptId || p.userId === attemptId);
      if (participant?.attemptId) {
        attempt = await Attempt.findOne({ attemptId: participant.attemptId }).lean();
      }
    }

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    // Permissions check: must be admin OR owner when results are revealed
    if (!isAdmin) {
      if (attempt.userId !== currentUserId) {
        return res.status(403).json({ message: 'Not authorized to view this attempt review' });
      }
      if (!t.resultsRevealed) {
        return res.status(403).json({ message: 'Results have not been revealed yet' });
      }
    }

    // Resolve question source: from attempt questions, or tournament customQuiz, or assigned quiz
    let questions = attempt.attemptQuestions;
    if (!questions || questions.length === 0) {
      if (t.quizMode === 'custom' && t.customQuiz?.questions?.length) {
        questions = t.customQuiz.questions;
      } else if (attempt.quizId) {
        const quizDoc = await Quiz.findOne({ id: attempt.quizId }).lean();
        questions = quizDoc?.questions || [];
      }
    }

    // Build question-by-question teacher breakdown
    const userAnswers = attempt.answers || {};
    const questionReview = (questions || []).map((q, idx) => {
      const qKey = q.id || idx;
      const rawAns = userAnswers[qKey] !== undefined ? userAnswers[qKey] : userAnswers[idx];

      let studentSelected = rawAns;
      let isCorrect = false;

      if (typeof rawAns === 'object' && rawAns !== null && 'selected' in rawAns) {
        studentSelected = rawAns.selected;
        isCorrect = Boolean(rawAns.isCorrect);
      } else if (rawAns !== undefined && rawAns !== null) {
        isCorrect = String(rawAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
      }

      return {
        index: idx,
        id: q.id || `q_${idx}`,
        text: q.text || q.question || '',
        type: q.type || 'multiple-choice',
        options: q.options || [],
        codeSnippet: q.codeSnippet || q.code || '',
        points: q.points || 10,
        correctAnswer: q.correctAnswer,
        studentAnswer: studentSelected,
        isCorrect,
        explanation: q.explanation || 'No detailed explanation provided for this question.',
        feedback: attempt.feedback?.[qKey] || ''
      };
    });

    res.json({
      tournamentName: t.name,
      tournamentId: t.tournamentId,
      studentName: attempt.userName,
      studentEmail: attempt.userEmail,
      studentId: attempt.userId,
      score: attempt.score,
      percentage: attempt.percentage,
      totalQuestions: attempt.totalQuestions || questionReview.length,
      timeTaken: attempt.timeTaken,
      completedAt: attempt.completedAt,
      passed: attempt.passed,
      telemetry: attempt.telemetry,
      questions: questionReview
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teacher attempt review', error: error.message });
  }
};

/**
 * Claim Daily Login Streak Reward
 * @route POST /api/streak/claim
 */
export const claimDailyStreak = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const todayStr = new Date().toDateString();
    const isClaimedToday = user.lastStreakClaimDate && new Date(user.lastStreakClaimDate).toDateString() === todayStr;

    if (isClaimedToday) {
      return res.status(400).json({
        success: false,
        message: 'Daily streak reward has already been claimed today',
        claimedToday: true,
        lastStreakClaimDate: user.lastStreakClaimDate
      });
    }

    const streak = user.streak || 1;
    const currentDay = ((streak - 1) % 7) + 1; // 1 to 7

    const STREAK_REWARDS = {
      1: { coins: 25, xp: 0, powerUp: null },
      2: { coins: 50, xp: 50, powerUp: null },
      3: { coins: 30, xp: 0, powerUp: 'hint' },
      4: { coins: 100, xp: 100, powerUp: null },
      5: { coins: 50, xp: 0, powerUp: 'time_freeze' },
      6: { coins: 150, xp: 250, powerUp: null },
      7: { coins: 200, xp: 300, powerUp: 'hint' }
    };

    const reward = STREAK_REWARDS[currentDay] || { coins: 25, xp: 25, powerUp: null };

    // Apply Coins and XP
    if (reward.coins) {
      user.coins = (user.coins || 0) + reward.coins;
    }
    if (reward.xp) {
      user.xp = (user.xp || 0) + reward.xp;
    }

    // Apply Power-up
    if (reward.powerUp) {
      const powerUps = user.powerUps || [];
      const existing = powerUps.find(p => p.type === reward.powerUp);
      if (existing) {
        existing.quantity = (existing.quantity || 0) + 1;
      } else {
        powerUps.push({ type: reward.powerUp, quantity: 1 });
      }
      user.powerUps = powerUps;
    }

    // Mark as claimed today
    user.lastStreakClaimDate = new Date();
    await user.save();
    await evaluateAndAwardBadges(user.userId).catch(() => {});

    res.json({
      success: true,
      message: `Day ${currentDay} streak reward claimed!`,
      streak,
      currentDay,
      rewards: reward,
      user: {
        userId: user.userId,
        streak: user.streak,
        coins: user.coins,
        xp: user.xp,
        powerUps: user.powerUps,
        lastStreakClaimDate: user.lastStreakClaimDate
      }
    });
  } catch (error) {
    console.error('Error claiming daily streak:', error);
    res.status(500).json({ success: false, message: 'Error claiming streak', error: error.message });
  }
};

/**
 * Check Daily Login Streak Status
 * @route GET /api/streak/status
 */
export const getStreakStatus = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const todayStr = new Date().toDateString();
    const isClaimedToday = user.lastStreakClaimDate && new Date(user.lastStreakClaimDate).toDateString() === todayStr;
    const streak = user.streak || 1;
    const currentDay = ((streak - 1) % 7) + 1;

    res.json({
      success: true,
      streak,
      currentDay,
      isClaimedToday: Boolean(isClaimedToday),
      lastStreakClaimDate: user.lastStreakClaimDate || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error checking streak status', error: error.message });
  }
};
