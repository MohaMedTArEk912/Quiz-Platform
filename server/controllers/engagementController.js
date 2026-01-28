import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { SkillTrack } from '../models/SkillTrack.js';
import { Tournament } from '../models/Tournament.js';

import { DailyChallenge } from '../models/DailyChallenge.js';
import { CompilerQuestion } from '../models/CompilerQuestion.js';
import { CompilerSubmission } from '../models/CompilerSubmission.js';
import { SkillTrackProgress } from '../models/SkillTrackProgress.js';
import { checkAndUnlockBadges } from './badgeNodeController.js';
import { completeSpecificModule } from '../services/progressService.js';
import { evaluateSubmission, getPassThreshold } from '../services/compilerEvaluationService.js';
import { syncClanXp } from '../utils/xpSync.js';

// --- Daily Compiler Challenge ---

/**
 * Get today's daily compiler challenge.
 * If no challenge is scheduled, auto-selects a random question not used in 7 days.
 * 
 * @route GET /api/daily-challenge
 * @returns {Object} Challenge with question details (without reference code)
 */
export const getDailyChallenge = async (req, res) => {
  try {
    // Step 1: Verify authentication
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const userId = req.user.userId;

    // Step 2: Get today's date (Midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Step 3: Check if user already completed today's challenge
    const hasPassedToday = await CompilerSubmission.hasPassedToday(userId, today);

    // Step 4: Fetch today's challenge from DB
    let challenge = await DailyChallenge.findOne({ 
      date: { $gte: today, $lt: tomorrow } 
    }).lean();

    // Step 5: If no challenge exists, auto-create one with a random question
    if (!challenge) {
      const eligibleQuestion = await CompilerQuestion.findEligibleQuestion();
      
      if (!eligibleQuestion) {
        return res.status(404).json({ 
          message: 'No compiler questions available. Please ask admin to add questions.',
          reason: 'no_questions'
        });
      }

      // Create today's challenge
      challenge = await DailyChallenge.create({
        date: today,
        compilerQuestionId: eligibleQuestion.questionId
      });
      
      // Mark question as used
      await CompilerQuestion.markAsUsed(eligibleQuestion.questionId);
      
      challenge = challenge.toObject();
    }

    // Step 6: Fetch the compiler question details
    const question = await CompilerQuestion.findOne({ 
      questionId: challenge.compilerQuestionId 
    }).lean();

    if (!question) {
      return res.status(404).json({ 
        message: 'Challenge question not found',
        reason: 'question_missing'
      });
    }

    // Step 7: Send response (exclude reference code for security)
    const response = {
      challengeId: challenge._id,
      date: today,
      question: {
        questionId: question.questionId,
        title: question.title,
        description: question.description,
        language: question.language || 'javascript',
        difficulty: question.difficulty,
        category: question.category,
        hints: question.hints || []
      },
      rewards: {
        coins: challenge.rewardCoins || question.rewardCoins || 100,
        xp: challenge.rewardXP || question.rewardXP || 150,
        badgeId: challenge.rewardBadgeId,
        itemId: challenge.rewardItemId
      },
      streak: req.user.dailyChallengeStreak || 0,
      completed: hasPassedToday,
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
 * Submit code for today's daily compiler challenge.
 * Evaluates the submission using Groq AI and awards prizes if passed.
 * 
 * @route POST /api/daily-challenge/submit
 * @param {string} code - User's submitted code
 * @returns {Object} Evaluation result with score, feedback, and pass status
 */
export const submitCompilerAnswer = async (req, res) => {
  try {
    // Step 1: Validate auth
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const user = req.user;
    const userId = user.userId;

    // Step 2: Get submitted code
    const { code } = req.body;
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ message: 'Code submission is required' });
    }

    // Step 3: Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Step 4: Check if already completed today
    const alreadyPassed = await CompilerSubmission.hasPassedToday(userId, today);
    if (alreadyPassed) {
      return res.status(400).json({ 
        message: 'You have already completed today\'s challenge',
        alreadyCompleted: true,
        streak: user.dailyChallengeStreak || 0
      });
    }

    // Step 5: Get today's challenge
    const challenge = await DailyChallenge.findOne({ 
      date: { $gte: today, $lt: tomorrow } 
    }).lean();

    if (!challenge) {
      return res.status(404).json({ message: 'No challenge available today' });
    }

    // Step 6: Get the question with reference code
    const question = await CompilerQuestion.findOne({ 
      questionId: challenge.compilerQuestionId 
    }).lean();

    if (!question) {
      return res.status(404).json({ message: 'Challenge question not found' });
    }

    // Step 7: Evaluate using Groq AI
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

    // Step 8: Save submission record
    await CompilerSubmission.create({
      userId,
      questionId: question.questionId,
      submittedCode: code.trim(),
      aiScore: score,
      aiFeedback: feedback,
      passed,
      challengeDate: today
    });

    // Step 9: If passed, award prizes and update streak
    let coinsAwarded = 0;
    let xpAwarded = 0;
    let newStreak = user.dailyChallengeStreak || 0;

    if (passed) {
      // Calculate rewards
      coinsAwarded = challenge.rewardCoins || question.rewardCoins || 100;
      xpAwarded = challenge.rewardXP || question.rewardXP || 150;

      // Update streak
      const lastChallengeDate = user.dailyChallengeDate ? new Date(user.dailyChallengeDate) : null;
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastChallengeDate && lastChallengeDate.getTime() === yesterday.getTime()) {
        // Consecutive day - increment streak
        newStreak = (user.dailyChallengeStreak || 0) + 1;
      } else if (lastChallengeDate && lastChallengeDate.getTime() === today.getTime()) {
        // Same day - keep streak (shouldn't happen due to check above)
        newStreak = user.dailyChallengeStreak || 1;
      } else {
        // Streak broken - reset to 1
        newStreak = 1;
      }

      // Bonus for streak milestones
      if (newStreak === 7) {
        coinsAwarded += 50;
        xpAwarded += 100;
      } else if (newStreak === 30) {
        coinsAwarded += 200;
        xpAwarded += 500;
      }

      // Update user
      user.coins = (user.coins || 0) + coinsAwarded;
      user.xp = (user.xp || 0) + xpAwarded;
      
      if (user.clanId) {
          await syncClanXp(userId, xpAwarded, user.clanId);
      }

      // Award Shop Item if present
      if (challenge.rewardItemId) {
          if (!user.inventory) user.inventory = [];
          const existingItem = user.inventory.find(i => i.itemId === challenge.rewardItemId);
          if (existingItem) {
              existingItem.quantity += 1;
          } else {
              user.inventory.push({ itemId: challenge.rewardItemId, quantity: 1 });
          }
      }

      user.dailyChallengeCompleted = true;
      user.dailyChallengeDate = today;
      user.dailyChallengeStreak = newStreak;

      await user.save();

      // Check for badges
      await checkAndUnlockBadges(userId, 'daily_challenge_completed', {
        streak: newStreak,
        score
      });
    }

    // Step 10: Send response
    res.json({
      score,
      feedback,
      passed,
      passThreshold: getPassThreshold(),
      rewards: passed ? {
        coins: coinsAwarded,
        xp: xpAwarded,
        streak: newStreak
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

    // Check for existing challenge on this date
    const existing = await DailyChallenge.findOne({ date: challengeDate });
    if (existing) {
      return res.status(409).json({ message: 'Challenge already exists for this date' });
    }

    const challenge = new DailyChallenge({
      date: challengeDate,
      compilerQuestionId,
      rewardCoins,
      rewardXP,
      rewardBadgeId,
      rewardItemId
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
    const { compilerQuestionId, rewardCoins, rewardXP, rewardBadgeId, rewardItemId } = req.body;

    const updates = {};
    if (compilerQuestionId) updates.compilerQuestionId = compilerQuestionId;
    if (rewardCoins !== undefined) updates.rewardCoins = rewardCoins;
    if (rewardXP !== undefined) updates.rewardXP = rewardXP;
    if (rewardBadgeId !== undefined) updates.rewardBadgeId = rewardBadgeId;
    if (rewardItemId !== undefined) updates.rewardItemId = rewardItemId;

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
    const challenges = await DailyChallenge.find({}).sort({ date: -1 }).limit(30).lean();
    
    // OPTIMIZATION: Bulk fetch all questions in one query instead of N+1
    const questionIds = [...new Set(challenges.map(c => c.compilerQuestionId).filter(Boolean))];
    const questions = await CompilerQuestion.find({ questionId: { $in: questionIds } }).lean();
    
    // Create a lookup map for O(1) access
    const questionMap = new Map(questions.map(q => [q.questionId, q]));
    
    // Populate using the map
    const populated = challenges.map(c => ({
      ...c,
      question: questionMap.get(c.compilerQuestionId) || null
    }));

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching challenges', error: error.message });
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
    const query = {};
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

// --- Tournaments ---
export const getTournaments = async (req, res) => {
  try {
    const now = new Date();
    const tournaments = await Tournament.find({}).sort({ startsAt: 1 }).lean();
    // Compute live status based on time
    const mapped = tournaments.map(t => {
      let status = t.status;
      if (t.startsAt && t.endsAt) {
        if (now < new Date(t.startsAt)) status = 'scheduled';
        else if (now >= new Date(t.startsAt) && now <= new Date(t.endsAt)) status = 'live';
        else status = 'completed';
      }
      return { ...t, status };
    });
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tournaments', error: error.message });
  }
};

export const createTournament = async (req, res) => {
    try {
        const t = new Tournament(req.body);
        if(!t.tournamentId) t.tournamentId = crypto.randomUUID();
        await t.save();
        res.status(201).json(t);
    } catch (error) {
        res.status(500).json({ message: 'Error creating tournament', error: error.message });
    }
};

export const updateTournament = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const t = await Tournament.findOneAndUpdate({ tournamentId: id }, updates, { new: true });
        if (!t) return res.status(404).json({ message: 'Tournament not found' });
        res.json(t);
    } catch (error) {
        res.status(500).json({ message: 'Error updating tournament', error: error.message });
    }
};

export const deleteTournament = async (req, res) => {
    try {
        const { id } = req.params;
        await Tournament.deleteOne({ tournamentId: id });
        res.json({ message: 'Tournament deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting tournament', error: error.message });
    }
};

export const joinTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const t = await Tournament.findOne({ tournamentId: id });
    if (!t) return res.status(404).json({ message: 'Tournament not found' });
    if (!t.participants) t.participants = [];
    if (t.participants.includes(req.user.userId)) {
      return res.json({ message: 'Already joined' });
    }
    t.participants.push(req.user.userId);
    await t.save();
    res.json({ message: 'Joined', participants: t.participants.length });
  } catch (error) {
    res.status(500).json({ message: 'Error joining tournament', error: error.message });
  }
};
