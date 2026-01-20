import { Attempt } from '../models/Attempt.js';
import { User } from '../models/User.js';
import { Quiz } from '../models/Quiz.js';
import { SkillTrack } from '../models/SkillTrack.js';
import { SkillTrackProgress } from '../models/SkillTrackProgress.js';
import { updateSkillTrackProgress } from '../services/progressService.js';

import { checkAndUnlockBadges } from './badgeNodeController.js';

export const saveAttempt = async (req, res) => {
  try {
    const attemptData = req.body;
    const { userId, powerUpsUsed = [] } = attemptData;

    // Validate power-ups against user inventory if user exists
    const user = await User.findOne({ userId });
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

    const newAttempt = new Attempt(attemptData);
    await newAttempt.save();

    let newBadges = [];

    // UPDATE USER STATS & REWARDS
    if (user) {
        user.totalAttempts = (user.totalAttempts || 0) + 1;
        user.totalScore = (user.totalScore || 0) + (attemptData.score || 0);
        user.totalTime = (user.totalTime || 0) + (attemptData.timeTaken || 0);

        // Fetch quiz for rewards
        const quiz = await Quiz.findOne({ id: attemptData.quizId }).lean();
        
        if (quiz) {
            // Coins logic
            const baseCoins = quiz.coinsReward || 10;
            // Award coins if passed, or maybe partial? 
            // For now, let's award base coins if passed, plus small amount for participation
            if (attemptData.passed) {
                const coinsEarned = baseCoins + Math.floor((attemptData.score / 10)); // Example bonus
                user.coins = (user.coins || 0) + coinsEarned;
            } else {
                 user.coins = (user.coins || 0) + 2; // Participation coins
            }

            // XP Logic
            const baseXp = quiz.xpReward || 50;
             if (attemptData.passed) {
                user.xp = (user.xp || 0) + baseXp;
            } else {
                user.xp = (user.xp || 0) + 10; // Participation XP
            }
        } else {
            // Default fallbacks if quiz not found
            user.xp = (user.xp || 0) + 10;
            user.coins = (user.coins || 0) + 2;
        }

        // Level Up Logic (Simple: Level = 1 + floor(XP / 1000))
        user.level = 1 + Math.floor((user.xp || 0) / 1000);
        
        await user.save();

        // Check for new badges
        newBadges = await checkAndUnlockBadges(userId, attemptData);

        // Update Roadmap Progress (Unlock modules)
        if (attemptData.passed) {
            await updateRoadmapProgress(userId, attemptData.quizId);
        }
    }

    res.status(201).json({ ...newAttempt.toObject(), newBadges });
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

// Helper: Update Roadmap Progress based on quiz completion
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
            
            // Should potentially initialize progress if they haven't started track?
            if (!progress) {
                 // Initialize with 'unlockedModules' containing the root nodes (no prereqs)
                 const rootNodes = track.modules.filter(m => !m.prerequisites || m.prerequisites.length === 0).map(m => m.moduleId);
                 progress = new SkillTrackProgress({ 
                     userId, 
                     trackId: track.trackId, 
                     completedModules: [], 
                     unlockedModules: rootNodes 
                 });
            }

            let progressChanged = false;

            // Find relevant modules linked to this quiz
            const relevantModules = track.modules.filter(m => 
                (m.quizIds && m.quizIds.includes(quizId)) || m.quizId === quizId
            );

            for (const mod of relevantModules) {
                // If already completed, skip
                if (progress.completedModules.includes(mod.moduleId)) continue;

                // Check dependencies (quizzes)
                const allQuizIds = new Set(mod.quizIds || []);
                if (mod.quizId) allQuizIds.add(mod.quizId);
                const uniqueQuizIds = Array.from(allQuizIds);

                if (uniqueQuizIds.length === 0) continue;

                // Count how many of these quizzes are passed
                // We can query distinct quizIds from passed attempts for this user
                const passedAttempts = await Attempt.find({
                    userId,
                    quizId: { $in: uniqueQuizIds },
                    passed: true
                }).select('quizId').lean();
                
                const passedQuizIds = new Set(passedAttempts.map(a => a.quizId));

                // If all passed -> Mark Module Complete
                if (uniqueQuizIds.every(id => passedQuizIds.has(id))) {
                    console.log(`🎓 Module Completed via Quiz: ${mod.title} (${mod.moduleId})`);
                    progress.completedModules.push(mod.moduleId);
                    progressChanged = true;
                }
            }
            
            // Note: The service handles unlocking next modules if we pass only completedModules?
            // The service has auto-unlock logic inside it. 
            // So we can just pass the updated completedModules array and let the service handle unlocks and persistence.

            if (progressChanged) {
                // Use service to save and sync to User
                await updateSkillTrackProgress(userId, track.trackId, progress.completedModules, progress.unlockedModules);
            }
        }
    } catch (error) {
        console.error('Error updating roadmap progress:', error);
    }
};
