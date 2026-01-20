import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { SkillTrack } from '../models/SkillTrack.js';
import { Tournament } from '../models/Tournament.js';

import { DailyChallenge } from '../models/DailyChallenge.js';
import { SkillTrackProgress } from '../models/SkillTrackProgress.js';
import { checkAndUnlockBadges } from './badgeNodeController.js';
import { completeSpecificModule } from '../services/progressService.js';

// --- Daily Challenge ---
export const getDailyChallenge = async (req, res) => {
  let errorDetails = { step: 'init' };
  try {
    // Step 1: Verify authentication
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const userId = req.user.userId;
    errorDetails.step = `auth_ok_${userId}`;

    // Step 2: Get today's date (Midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    errorDetails.step = 'date_ok';

    // Step 3: Fetch challenge from DB
    let challenge = await DailyChallenge.findOne({ 
      date: { $gte: today, $lt: tomorrow } 
    }).lean();
    errorDetails.step = challenge ? 'challenge_found' : 'challenge_fallback';

    // Step 4: Resolve Quiz
    let quiz = null;
    if (challenge && challenge.quizId) {
      // Try by ID (custom string ID)
      quiz = await Quiz.findOne({ id: challenge.quizId }).lean();
      
      // Fallback to _id
      if (!quiz && mongoose.Types.ObjectId.isValid(challenge.quizId)) {
        quiz = await Quiz.findById(challenge.quizId).lean();
      }
    }

    // If no specific quiz or challenge, pick a random/first one
    if (!quiz) {
      quiz = await Quiz.findOne({ isTournamentOnly: { $ne: true } }).lean();
      if (!quiz) {
        quiz = await Quiz.findOne({}).lean();
      }
      
      if (quiz && !challenge) {
        challenge = {
          title: 'Daily Mission',
          description: `Complete the ${quiz.title} quiz to earn rewards!`,
          criteria: { type: 'complete_quiz', threshold: 1 },
          rewardCoins: 50,
          rewardXP: 100,
          quizId: quiz.id || quiz._id,
          date: today
        };
      }
    }

    // Step 5: Final Validation
    if (!quiz || !challenge) {
      return res.status(404).json({ 
        message: 'No quizzes or daily challenges are currently available in the system.',
        reason: !quiz ? 'no_quizzes' : 'no_challenge'
      });
    }

    // Step 6: Send response
    const challengeDateTimestamp = req.user.dailyChallengeDate ? new Date(req.user.dailyChallengeDate).setHours(0,0,0,0) : null;
    
    const response = {
      ...challenge,
      quizId: quiz.id || quiz._id,
      streak: req.user.dailyChallengeStreak || 0,
      completed: req.user.dailyChallengeCompleted && challengeDateTimestamp === today.getTime(),
      date: today
    };
    
    res.json(response);

  } catch (error) {
    console.error('Daily Challenge Error:', error);
    res.status(500).json({ 
      message: 'Failed to process daily challenge request', 
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
};

export const createDailyChallenge = async (req, res) => {
    try {
        const { date, title, description, rewardCoins, rewardXP, quizId, criteria, rewardBadgeId, rewardItemId } = req.body;
        
        if (!date) return res.status(400).json({ message: 'Date is required' });

        const challengeDate = new Date(date);
        if (isNaN(challengeDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        challengeDate.setHours(0, 0, 0, 0);

        const existing = await DailyChallenge.findOne({ date: challengeDate });
        if (existing) {
            return res.status(409).json({ message: 'Challenge already exists for this date' });
        }

        const payload = {
            date: challengeDate,
            title,
            description,
            rewardCoins: Number(rewardCoins) || 0,
            rewardXP: Number(rewardXP) || 0,
            criteria,
            quizId: quizId || undefined,
            rewardBadgeId: rewardBadgeId || undefined,
            rewardItemId: rewardItemId || undefined
        };

        const challenge = new DailyChallenge(payload);
        await challenge.save();
        res.status(201).json(challenge);
    } catch (error) {
        console.error('Create Daily Challenge Error:', error);
        res.status(500).json({ message: 'Error creating daily challenge', error: error.message });
    }
};

export const updateDailyChallenge = async (req, res) => {
    try {
        const { id } = req.params;
        const challenge = await DailyChallenge.findByIdAndUpdate(id, req.body, { new: true });
        if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
        res.json(challenge);
    } catch (error) {
        res.status(500).json({ message: 'Error updating challenge', error: error.message });
    }
};

export const getDailyChallengesAdmin = async (req, res) => {
    try {
        const challenges = await DailyChallenge.find({}).sort({ date: -1 }).limit(30);
        res.json(challenges);
    } catch (error) {
         res.status(500).json({ message: 'Error fetching challenges', error: error.message });
    }
}

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


export const completeDailyChallenge = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const user = req.user;
    const last = user.dailyChallengeDate ? new Date(user.dailyChallengeDate) : null;
    const lastDay = last ? new Date(last.setHours(0, 0, 0, 0)) : null;

    if (lastDay && lastDay.getTime() === today.getTime() && user.dailyChallengeCompleted) {
      return res.json({ message: 'Already completed today', streak: user.dailyChallengeStreak });
    }

    // Logic: Verify criteria if needed (e.g., check score passed in body?)
    // For now, assuming client side validates criteria or passed simply by calling this endpoint.
    // Ideally, we check the attempt ID passed in.
    
    // Get today's challenge to know rewards
    let challenge = await DailyChallenge.findOne({ date: today }).lean();
    const coinsReward = challenge ? challenge.rewardCoins : 20;
    const xpReward = challenge ? challenge.rewardXP : 100;

    if (lastDay && lastDay.getTime() === today.getTime() - 86400000) {
      user.dailyChallengeStreak = (user.dailyChallengeStreak || 0) + 1;
    } else {
      user.dailyChallengeStreak = 1;
    }

    user.dailyChallengeCompleted = true;
    user.dailyChallengeDate = today;
    user.coins = (user.coins || 0) + coinsReward;
    user.xp = (user.xp || 0) + xpReward; // Add XP too
    
    await user.save();

    res.json({ message: 'Daily challenge completed', streak: user.dailyChallengeStreak, coins: user.coins, xp: user.xp });
  } catch (error) {
    res.status(500).json({ message: 'Error completing daily challenge', error: error.message });
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
