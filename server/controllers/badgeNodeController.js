import { BadgeNode } from '../models/BadgeNode.js';
import { BadgeTree } from '../models/BadgeTree.js';
import { User } from '../models/User.js';
import { Attempt } from '../models/Attempt.js';
import { syncClanXp } from '../utils/xpSync.js';

// Create a new badge node
export const createBadgeNode = async (req, res) => {
  try {
    const badgeNode = new BadgeNode(req.body);
    await badgeNode.save();
    res.status(201).json(badgeNode);
  } catch (error) {
    res.status(500).json({ message: 'Error creating badge node', error: error.message });
  }
};

// Get all badge nodes
export const getAllBadgeNodes = async (req, res) => {
  try {
    const badges = await BadgeNode.find().sort({ createdAt: -1 });
    res.json(badges);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching badge nodes', error: error.message });
  }
};

// Get single badge node
export const getBadgeNode = async (req, res) => {
  try {
    const badge = await BadgeNode.findOne({ badgeId: req.params.badgeId });
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    res.json(badge);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching badge', error: error.message });
  }
};

// Update badge node
export const updateBadgeNode = async (req, res) => {
  try {
    const badge = await BadgeNode.findOneAndUpdate(
      { badgeId: req.params.badgeId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    res.json(badge);
  } catch (error) {
    res.status(500).json({ message: 'Error updating badge', error: error.message });
  }
};

// Delete badge node
export const deleteBadgeNode = async (req, res) => {
  try {
    const badge = await BadgeNode.findOneAndDelete({ badgeId: req.params.badgeId });
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    
    // Remove from all trees
    await BadgeTree.updateMany(
      { 'nodes.badgeId': req.params.badgeId },
      { $pull: { nodes: { badgeId: req.params.badgeId } } }
    );
    
    res.json({ message: 'Badge deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting badge', error: error.message });
  }
};

// Helper function to compare values based on operator
const compare = (value, threshold, operator) => {
  switch (operator) {
    case '>=': return value >= threshold;
    case '>': return value > threshold;
    case '=': return value === threshold;
    case '<': return value < threshold;
    case '<=': return value <= threshold;
    default: return value >= threshold;
  }
};

// Helper function to check if user passed a specific exam
const checkExamPass = async (userId, quizId, threshold = 70) => {
  const attempt = await Attempt.findOne({ 
    userId, 
    quizId,
    percentage: { $gte: threshold }
  }).sort({ completedAt: -1 });
  return !!attempt;
};

// Helper function to check tournament participation/win
const checkTournamentParticipation = async (userId, tournamentId) => {
  // TODO: Implement when tournament system is ready
  return false;
};

// Evaluate a single unlock criterion
const evaluateCriteria = async (user, criteria, currentAttempt = null) => {
  const { type, threshold, operator = '>=', quizId, trackId, tournamentId } = criteria;
  
  switch (type) {
    case 'total_score':
      return compare(user.totalScore || 0, threshold, operator);
      
    case 'total_attempts':
      return compare(user.totalAttempts || 0, threshold, operator);
      
    case 'streak':
      return compare(user.streak || 0, threshold, operator);
      
    case 'level':
      return compare(user.level || 1, threshold, operator);
      
    case 'perfect_score':
      if (currentAttempt && currentAttempt.percentage === 100) {
        return true;
      }
      // Check historical perfect scores
      const perfectCount = await Attempt.countDocuments({ 
        userId: user.userId, 
        percentage: 100 
      });
      return compare(perfectCount, threshold || 1, operator);
      
    case 'speed_demon':
      // Check if completed quiz under time threshold
      if (currentAttempt && threshold) {
        return currentAttempt.timeTaken < threshold;
      }
      return false;
      
    case 'quiz_completion':
      const quizAttempt = await Attempt.findOne({ 
        userId: user.userId, 
        quizId 
      });
      return !!quizAttempt;
      
    case 'exam_pass':
      return await checkExamPass(user.userId, quizId, threshold);
      
    case 'tournament_win':
    case 'tournament_participate':
      return await checkTournamentParticipation(user.userId, tournamentId);
      
    case 'track_completion':
      const userTrack = user.skillTracks?.find(t => t.trackId === trackId);
      if (!userTrack) return false;
      return userTrack.completedModules?.length >= (threshold || 1);
      
    case 'friend_count':
      return compare(user.friends?.length || 0, threshold, operator);
      
    case 'challenge_wins':
      // TODO: Implement when challenge tracking is ready
      return false;
      
    case 'manual':
      // Manual badges are awarded by admin, not auto-unlocked
      return false;
      
    default:
      return false;
  }
};

// Check if user can unlock a badge
export const checkBadgeUnlock = async (req, res) => {
  try {
    const { userId, badgeId } = req.params;
    
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const badge = await BadgeNode.findOne({ badgeId });
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    
    // Check if already earned
    if (user.badges.some(b => b.id === badgeId)) {
      return res.json({ unlocked: false, reason: 'already_earned' });
    }
    
    // Check prerequisites in all trees containing this badge
    const trees = await BadgeTree.find({ 'nodes.badgeId': badgeId });
    for (const tree of trees) {
      const node = tree.nodes.find(n => n.badgeId === badgeId);
      if (node.prerequisites && node.prerequisites.length > 0) {
        const hasAllPrereqs = node.prerequisites.every(prereqId =>
          user.badges.some(b => b.id === prereqId)
        );
        if (!hasAllPrereqs) {
          return res.json({ 
            unlocked: false, 
            reason: 'missing_prerequisites',
            missing: node.prerequisites.filter(prereqId => 
              !user.badges.some(b => b.id === prereqId)
            )
          });
        }
      }
    }
    
    // Check all unlock criteria (ALL must be met)
    for (const criteria of badge.unlockCriteria) {
      const met = await evaluateCriteria(user, criteria);
      if (!met) {
        return res.json({ 
          unlocked: false, 
          reason: 'criteria_not_met',
          failedCriteria: criteria
        });
      }
    }
    
    res.json({ unlocked: true });
  } catch (error) {
    res.status(500).json({ message: 'Error checking badge unlock', error: error.message });
  }
};

// Manually unlock badge for user (admin only)
export const manuallyUnlockBadge = async (req, res) => {
  try {
    const { userId, badgeId } = req.params;
    
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const badge = await BadgeNode.findOne({ badgeId });
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    
    // Check if already earned
    if (user.badges.some(b => b.id === badgeId)) {
      return res.status(400).json({ message: 'User already has this badge' });
    }
    
    // Award badge
    user.badges.push({
      id: badge.badgeId,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      dateEarned: new Date()
    });
    
    // Award rewards
    const xpAwarded = badge.rewards.xp || 0;
    user.xp = (user.xp || 0) + xpAwarded;
    user.coins = (user.coins || 0) + badge.rewards.coins;
    
    if (user.clanId && xpAwarded > 0) {
        await syncClanXp(userId, xpAwarded, user.clanId);
    }
    
    // Award power-ups
    if (badge.rewards.powerUps && badge.rewards.powerUps.length > 0) {
      for (const powerUp of badge.rewards.powerUps) {
        const existingPowerUp = user.powerUps?.find(p => p.type === powerUp.type);
        if (existingPowerUp) {
          existingPowerUp.quantity += powerUp.quantity;
        } else {
          if (!user.powerUps) user.powerUps = [];
          user.powerUps.push({
            type: powerUp.type,
            quantity: powerUp.quantity
          });
        }
      }
    }
    
    await user.save();
    
    res.json({ 
      message: 'Badge unlocked successfully',
      badge: user.badges[user.badges.length - 1],
      rewards: badge.rewards
    });
  } catch (error) {
    res.status(500).json({ message: 'Error unlocking badge', error: error.message });
  }
};

// Check and auto-unlock badges after quiz attempt
export const checkAndUnlockBadges = async (userId, attemptData) => {
  try {
    const user = await User.findOne({ userId });
    if (!user) return [];
    
    const allBadges = await BadgeNode.find();
    const newlyUnlocked = [];
    let totalClanXpEarned = 0;
    
    for (const badge of allBadges) {
      // Skip if already earned
      if (user.badges.some(b => b.id === badge.badgeId)) continue;
      
      // Check prerequisites
      const trees = await BadgeTree.find({ 'nodes.badgeId': badge.badgeId });
      let hasPrereqs = true;
      
      for (const tree of trees) {
        const node = tree.nodes.find(n => n.badgeId === badge.badgeId);
        if (node.prerequisites && node.prerequisites.length > 0) {
          hasPrereqs = node.prerequisites.every(prereqId =>
            user.badges.some(b => b.id === prereqId)
          );
          if (!hasPrereqs) break;
        }
      }
      
      if (!hasPrereqs) continue;
      
      // Check all criteria
      let meetsAllCriteria = true;
      for (const criteria of badge.unlockCriteria) {
        const met = await evaluateCriteria(user, criteria, attemptData);
        if (!met) {
          meetsAllCriteria = false;
          break;
        }
      }
      
      if (meetsAllCriteria) {
        // Unlock badge
        user.badges.push({
          id: badge.badgeId,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          dateEarned: new Date()
        });
        
        // Award rewards
        const xpAwarded = badge.rewards.xp || 0;
        user.xp = (user.xp || 0) + xpAwarded;
        user.coins = (user.coins || 0) + badge.rewards.coins;
        
        if (user.clanId && xpAwarded > 0) {
            totalClanXpEarned += xpAwarded;
        }
        
        // Award power-ups
        if (badge.rewards.powerUps && badge.rewards.powerUps.length > 0) {
          for (const powerUp of badge.rewards.powerUps) {
            const existingPowerUp = user.powerUps?.find(p => p.type === powerUp.type);
            if (existingPowerUp) {
              existingPowerUp.quantity += powerUp.quantity;
            } else {
              if (!user.powerUps) user.powerUps = [];
              user.powerUps.push({
                type: powerUp.type,
                quantity: powerUp.quantity
              });
            }
          }
        }
        
        newlyUnlocked.push({
          id: badge.badgeId,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          rewards: badge.rewards
        });
      }
    }
    
    if (newlyUnlocked.length > 0) {
      if (totalClanXpEarned > 0 && user.clanId) {
          await syncClanXp(userId, totalClanXpEarned, user.clanId);
      }
      await user.save();
    }
    
    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking badges:', error);
    return [];
  }
};
