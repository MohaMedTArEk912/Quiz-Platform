import { Attempt } from '../models/Attempt.js';
import { User } from '../models/User.js';
import { Quiz } from '../models/Quiz.js';
import { SkillTrack } from '../models/SkillTrack.js';
import { SkillTrackProgress } from '../models/SkillTrackProgress.js';
import { updateSkillTrackProgress } from '../services/progressService.js';
import { syncClanXp } from '../utils/xpSync.js';

import { checkAndUnlockBadges } from './badgeNodeController.js';

const normalizeAttemptPayload = (attemptData, user) => {
    const normalized = { ...attemptData };

    if (!normalized.attemptId) {
        normalized.attemptId = `${normalized.userId || 'guest'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    if (typeof normalized.userName !== 'string' || normalized.userName.trim() === '') {
        normalized.userName = user?.name || 'Unknown User';
    }

    if (typeof normalized.userEmail !== 'string' || normalized.userEmail.trim() === '') {
        normalized.userEmail = user?.email || 'unknown@example.com';
    }

    normalized.timeTaken = Number.isFinite(normalized.timeTaken) ? normalized.timeTaken : 0;
    normalized.totalQuestions = Number.isFinite(normalized.totalQuestions) ? normalized.totalQuestions : 0;
    normalized.score = Number.isFinite(normalized.score) ? normalized.score : 0;
    normalized.percentage = Number.isFinite(normalized.percentage) ? normalized.percentage : 0;

    if (!normalized.answers || typeof normalized.answers !== 'object') {
        normalized.answers = {};
    }

    if (!Array.isArray(normalized.powerUpsUsed)) {
        normalized.powerUpsUsed = [];
    }

    return normalized;
};

export const saveAttempt = async (req, res) => {
  try {
        const attemptData = req.body || {};
        const { userId } = attemptData;

        if (!userId || !attemptData.quizId || !attemptData.quizTitle) {
            return res.status(400).json({ message: 'Missing required attempt fields: userId, quizId, or quizTitle' });
        }

    // Validate power-ups against user inventory if user exists
    const user = await User.findOne({ userId });
        const normalizedAttempt = normalizeAttemptPayload(attemptData, user);
        const powerUpsUsed = normalizedAttempt.powerUpsUsed || [];

    if (user && powerUpsUsed.length > 0) {
      const counts = new Map();
      (user.powerUps || []).forEach(p => counts.set(p.type, p.quantity || 0));

      for (const type of powerUpsUsed) {
        const remain = counts.get(type) || 0;
        if (remain <= 0) {
          return res.status(400).json({ message: `Insufficient power-up: ${type}` });
        }
        counts.set(type, remain - 1);
      }

      // persist decremented counts
      user.powerUps = (user.powerUps || []).map(p => ({
        ...p,
        quantity: counts.get(p.type) ?? p.quantity
      }));
      await user.save();
    }

        let newAttempt;
        try {
            newAttempt = new Attempt(normalizedAttempt);
            await newAttempt.save();
        } catch (saveError) {
            // Gracefully handle duplicate submission retries using the same attemptId.
            if (saveError?.code === 11000 && saveError?.keyPattern?.attemptId) {
                const existingAttempt = await Attempt.findOne({ attemptId: normalizedAttempt.attemptId }).lean();
                if (existingAttempt) {
                    return res.status(200).json({ ...existingAttempt, duplicate: true, newBadges: [] });
                }
            }
            if (saveError?.name === 'ValidationError') {
                return res.status(400).json({ message: 'Invalid attempt payload', error: saveError.message });
            }
            throw saveError;
        }

    // UPDATE USER STATS & REWARDS
    if (user) {
        user.totalAttempts = (user.totalAttempts || 0) + 1;
        user.totalScore = (user.totalScore || 0) + (normalizedAttempt.score || 0);
        user.totalTime = (user.totalTime || 0) + (normalizedAttempt.timeTaken || 0);

        // Fetch quiz for rewards
        const quiz = await Quiz.findOne({ id: normalizedAttempt.quizId }).lean();
        
        if (quiz) {
            // Coins logic
            const baseCoins = quiz.coinsReward || 10;
            // Award coins if passed, or maybe partial? 
            // For now, let's award base coins if passed, plus small amount for participation
            if (normalizedAttempt.passed) {
                const coinsEarned = baseCoins + Math.floor((normalizedAttempt.score / 10)); // Example bonus
                user.coins = (user.coins || 0) + coinsEarned;
            } else {
                 user.coins = (user.coins || 0) + 2; // Participation coins
            }

            // XP Logic
            const baseXp = quiz.xpReward || 50;
            let xpEarned = 0;
             if (normalizedAttempt.passed) {
                xpEarned = baseXp;
            } else {
                xpEarned = 10; // Participation XP
            }
            user.xp = (user.xp || 0) + xpEarned;

            if (user.clanId) {
                await syncClanXp(userId, xpEarned, user.clanId);
            }
        } else {
            // Default fallbacks if quiz not found
            user.xp = (user.xp || 0) + 10;
            user.coins = (user.coins || 0) + 2;
        }

        // Level Up Logic (Simple: Level = 1 + floor(XP / 1000))
        user.level = 1 + Math.floor((user.xp || 0) / 1000);
        
        await user.save();

        // Send response IMMEDIATELY — don't make the user wait for badges/roadmap
        res.status(201).json({ ...newAttempt.toObject(), newBadges: [] });

        // Fire-and-forget: badge checks + roadmap progress in background
        Promise.all([
            checkAndUnlockBadges(userId, normalizedAttempt),
            normalizedAttempt.passed ? updateRoadmapProgress(userId, normalizedAttempt.quizId) : Promise.resolve()
        ]).catch(err => console.error('Post-submission background processing error:', err));

        return; // Early return — response already sent
    }

    res.status(201).json({ ...newAttempt.toObject(), newBadges: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPendingReviews = async (req, res) => {
    try {
        const pendingAttempts = await Attempt.find({ reviewStatus: 'pending' }).lean();
        res.json(pendingAttempts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending reviews', error: error.message });
    }
};

export const submitReview = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { feedback, scoreAdjustment } = req.body;

        const attempt = await Attempt.findOne({ attemptId });
        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        attempt.feedback = feedback;
        attempt.reviewStatus = 'reviewed';
        
        let newScore = 0;
        if (scoreAdjustment !== undefined) {
             attempt.score = attempt.score + scoreAdjustment; // Simple adjustment
        } else if (req.body.finalScore !== undefined) {
            attempt.score = req.body.finalScore;
        }

        // Recalculate percentage
        const quiz = await Quiz.findOne({ id: attempt.quizId });
        if (quiz) {
             const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
             attempt.percentage = Math.round((attempt.score / totalPoints) * 100);
             attempt.passed = attempt.percentage >= quiz.passingScore;
        }
        
        await attempt.save();
        res.json(attempt);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting review', error: error.message });
    }
};

/**
 * Update Roadmap Progress based on quiz completion.
 * A module is marked complete only when:
 * 1. ALL linked quizzes are passed by the user
 * 2. ALL sub-modules are completed (if the module has any)
 * 
 * @param {string} userId - The user's ID
 * @param {string} quizId - The quiz ID that was just completed
 */
const updateRoadmapProgress = async (userId, quizId) => {
    try {
        // Find tracks containing this quiz
        const tracks = await SkillTrack.find({
            $or: [
                { "modules.quizIds": quizId },
                { "modules.quizId": quizId }
            ]
        });

        for (const track of tracks) {
            let progress = await SkillTrackProgress.findOne({ userId, trackId: track.trackId });
            
            // Initialize progress if user hasn't started the track (lazy init)
            if (!progress) {
                 const rootNodes = track.modules.filter(m => !m.prerequisites || m.prerequisites.length === 0).map(m => m.moduleId);
                 progress = new SkillTrackProgress({ 
                     userId, 
                     trackId: track.trackId, 
                     completedModules: [], 
                     unlockedModules: rootNodes,
                     completedSubModules: []
                 });
            }

            let progressChanged = false;

            // Find ALL modules in this track, because completing a quiz might affect a previous module if logic was skipped
            // But efficiently, we only care about modules that include this quiz or are currently 'in progress'
            // For robustness, let's check ALL modules that contain this quiz ID
            const relevantModules = track.modules.filter(m => 
                (m.quizIds && m.quizIds.includes(quizId)) || m.quizId === quizId
            );

            for (const mod of relevantModules) {
                // If already completed, skip
                if (progress.completedModules.includes(mod.moduleId)) continue;

                // === CHECK 1: Quiz Completion ===
                const allQuizIds = new Set(mod.quizIds || []);
                if (mod.quizId) allQuizIds.add(mod.quizId);
                const uniqueQuizIds = Array.from(allQuizIds);

                let allQuizzesPassed = true;
                // Module completion requires 70% minimum on ALL quizzes
                const MODULE_PASSING_THRESHOLD = 70;
                
                if (uniqueQuizIds.length > 0) {
                    // Count how many of these quizzes have at least 70% score
                    const passedAttempts = await Attempt.find({
                        userId,
                        quizId: { $in: uniqueQuizIds },
                        percentage: { $gte: MODULE_PASSING_THRESHOLD }
                    }).select('quizId percentage').lean();
                    
                    const passedQuizIds = new Set(passedAttempts.map(a => a.quizId));
                    allQuizzesPassed = uniqueQuizIds.every(id => passedQuizIds.has(id));
                }

                // === CHECK 2: Sub-Module Completion ===
                // Important: If a module has NO sub-modules, this is trivially true.
                let allSubModulesCompleted = true;
                if (mod.subModules && mod.subModules.length > 0) {
                    const completedSubModules = progress.completedSubModules || [];
                    // Check if *every* sub-module's ID exists in the completed list key format
                    allSubModulesCompleted = mod.subModules.every(subMod => {
                         // The key stored is likely "moduleId:subId"
                         return completedSubModules.includes(`${mod.moduleId}:${subMod.id}`);
                    });
                }

                // === Mark Complete Only If Both Conditions Met ===
                if (allQuizzesPassed && allSubModulesCompleted) {
                    console.log(`🎓 Module Completed: ${mod.title} (${mod.moduleId})`);
                    
                    progress.completedModules.push(mod.moduleId);
                    progressChanged = true;
                }
            }
            
            // The service handles unlocking next modules and syncing to User model
            if (progressChanged) {
                // Pass the UPDATED list of completed modules. The service will calculate unlocks based on this.
                // We pass 'null' for unlockedModules so the service recalculates/appends correctly or we pass the current one?
                // The service logic for `updateSkillTrackProgress` (checked in Step 51) appends unlocks if new modules are completed.
                // It's safer to pass the CURRENT unlockedModules (or null if we trust it to pull existing)
                // Actually, let's let the service do its job. We pass the new completed list.
                await updateSkillTrackProgress(userId, track.trackId, progress.completedModules, progress.unlockedModules);
            }
        }
    } catch (error) {
        console.error('Error updating roadmap progress:', error);
    }
};
