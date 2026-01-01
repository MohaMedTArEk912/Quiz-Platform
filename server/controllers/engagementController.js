import { Quiz } from '../models/Quiz.js';
import { SkillTrack } from '../models/SkillTrack.js';
import { Tournament } from '../models/Tournament.js';

import { DailyChallenge } from '../models/DailyChallenge.js';
import { SkillTrackProgress } from '../models/SkillTrackProgress.js';
import { checkAndUnlockBadges } from './badgeNodeController.js';

// --- Daily Challenge ---
export const getDailyChallenge = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Try to find a specific challenge defined for today
    let challenge = await DailyChallenge.findOne({ date: today }).lean();
    let quiz = null;

    if (challenge) {
        if (challenge.quizId) {
             quiz = await Quiz.findOne({ $or: [{ id: challenge.quizId }, { _id: challenge.quizId }] }).lean();
             
             // If the challenge has a quizId but the quiz doesn't exist, return 404
             if (!quiz) {
                 return res.status(404).json({ message: 'Daily challenge quiz not found' });
             }
        } else {
            // Challenge exists but no specific quiz - pick a random one
            const availableQuizzes = await Quiz.find({ isTournamentOnly: { $ne: true } }).lean();
            if (availableQuizzes.length > 0) {
                quiz = availableQuizzes[Math.floor(Math.random() * availableQuizzes.length)];
            }
        }
    } else {
        // No challenge scheduled for today - pick a random quiz and create dynamic challenge
        const availableQuizzes = await Quiz.find({ isTournamentOnly: { $ne: true } }).lean();
        if (availableQuizzes.length > 0) {
            quiz = availableQuizzes[Math.floor(Math.random() * availableQuizzes.length)];
            challenge = {
                title: 'Daily Random Quiz',
                description: `Complete the ${quiz.title} quiz!`,
                criteria: { type: 'complete_quiz', threshold: 1 },
                rewardCoins: 50,
                rewardXP: 100,
                quizId: quiz.id || quiz._id
            };
        }
    }

    if (!challenge || !quiz) {
        return res.status(404).json({ message: 'No daily challenge available' });
    }
    
    res.json({
      ...challenge,
      quizId: quiz.id || quiz._id,
      streak: req.user.dailyChallengeStreak || 0,
      completed: req.user.dailyChallengeCompleted && req.user.dailyChallengeDate && new Date(req.user.dailyChallengeDate).setHours(0,0,0,0) === today.getTime(),
      date: today
    });
  } catch (error) {
    console.error('Error fetching daily challenge:', error);
    res.status(500).json({ message: 'Error fetching daily challenge', error: error.message });
  }
};

export const createDailyChallenge = async (req, res) => {
    try {
        const { date, ...data } = req.body;
        const challengeDate = new Date(date);
        challengeDate.setHours(0, 0, 0, 0);

        const existing = await DailyChallenge.findOne({ date: challengeDate });
        if (existing) {
            return res.status(409).json({ message: 'Challenge already exists for this date' });
        }

        const challenge = new DailyChallenge({ ...data, date: challengeDate });
        await challenge.save();
        res.status(201).json(challenge);
    } catch (error) {
        res.status(500).json({ message: 'Error creating daily challenge', error: error.message });
    }
};

export const updateDailyChallenge = async (req, res) => {
    try {
        const { date } = req.params; // Expecting ISO date string or timestamp in URL
        const queryDate = new Date(date);
        queryDate.setHours(0,0,0,0);

        const challenge = await DailyChallenge.findOneAndUpdate({ date: queryDate }, req.body, { new: true });
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

// Helper to handle module completion logic
const handleModuleCompletion = async (userId, trackId, moduleId) => {
    let trackProgress = await SkillTrackProgress.findOne({ userId, trackId });
    if (!trackProgress) {
        trackProgress = new SkillTrackProgress({
            userId,
            trackId,
            unlockedModules: ['mod_1'], 
            completedModules: [],
            lastAccessed: new Date()
        });
    }

    let progressUpdated = false;
    if (!trackProgress.completedModules.includes(moduleId)) {
        trackProgress.completedModules.push(moduleId);
        progressUpdated = true;
        
        // Unlock next module logic
        const track = await SkillTrack.findOne({ trackId }).lean();
        if (track) {
            const currentModuleIndex = track.modules.findIndex(m => m.moduleId === moduleId);
            if (currentModuleIndex !== -1 && currentModuleIndex < track.modules.length - 1) {
                const nextModuleId = track.modules[currentModuleIndex + 1].moduleId;
                if (!trackProgress.unlockedModules.includes(nextModuleId)) {
                    trackProgress.unlockedModules.push(nextModuleId);
                }
            }
        }
        await trackProgress.save();
    }
    return progressUpdated;
};


// --- Skill Tracks ---
export const getSkillTracks = async (req, res) => {
  try {
    const tracks = await SkillTrack.find({}).lean();
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

    // Use the unified logic (this updates SkillTrackProgress)
    const progressUpdated = await handleModuleCompletion(req.user.userId, trackId, moduleId);

    // Also update legacy user.skillTracks for backward compatibility if needed, 
    // BUT we should probably move fully to SkillTrackProgress. 
    // To be safe for now, let's keep the legacy update or ensure frontend reads from correct source.
    // Based on previous code, it was updating req.user.skillTracks directly. 
    // Ideally we should deprecate that if we are using SkillTrackProgress.
    // tailored to the UserData type we saw earlier.
    
    const user = req.user;
    if (!user.skillTracks) user.skillTracks = [];
    const trackIndex = user.skillTracks.findIndex((p) => p.trackId === trackId);
    if (trackIndex === -1) {
      user.skillTracks.push({ trackId, unlockedModules: [], completedModules: [moduleId] });
    } else if (!user.skillTracks[trackIndex].completedModules.includes(moduleId)) {
      user.skillTracks[trackIndex].completedModules.push(moduleId);
    }
    user.markModified('skillTracks');
    await user.save();

    // Check for badges
    const newBadges = await checkAndUnlockBadges(user.userId, 'module_completion', {
      moduleId,
      trackId
    });

    res.json({ 
        // Return updated progress. For now just returning what we have.
        message: 'Module completed',
        newBadges: newBadges || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating track progress', error: error.message });
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
    const track = await SkillTrack.findOne({ trackId });
    if (!track) return res.status(404).json({ message: 'Track not found' });

    track.title = updates.title || track.title;
    track.description = updates.description || track.description;
    if (updates.modules) track.modules = updates.modules;
    
    await track.save();
    res.json(track);
  } catch (error) {
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
