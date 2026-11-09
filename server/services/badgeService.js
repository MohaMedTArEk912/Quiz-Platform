import { Badge } from '../models/Badge.js';
import { BadgeNode } from '../models/BadgeNode.js';
import { User } from '../models/User.js';
import { Attempt } from '../models/Attempt.js';
import { Clan } from '../models/Clan.js';
import { Challenge } from '../models/Challenge.js';
import { syncClanXp } from '../utils/xpSync.js';
import { clanCache } from '../controllers/clanController.js';

// ==========================================
// 30 Comprehensive Built-in Default Badges
// Across 8 Categories:
// 1. Quiz Milestones
// 2. Accuracy/Perfection
// 3. Daily Streaks
// 4. Speed/Reflexes
// 5. XP & Levels
// 6. Skill Tracks
// 7. Clans & Social
// 8. Arena/Multiplayer
// ==========================================
export const DEFAULT_BADGES = [
  // --- Category: Quiz Milestones ---
  {
    id: 'first-step',
    name: 'First Step',
    title: 'Novice Quizzer',
    description: 'Completed your first quiz attempt on the platform.',
    icon: '🎯',
    category: 'milestones',
    rarity: 'common',
    xpReward: 50,
    criteria: { type: 'total_attempts', threshold: 1, operator: '>=' }
  },
  {
    id: 'quiz-enthusiast',
    name: 'Quiz Enthusiast',
    title: 'Dedicated Scholar',
    description: 'Completed 10 quiz attempts across any subjects.',
    icon: '📚',
    category: 'milestones',
    rarity: 'rare',
    xpReward: 150,
    criteria: { type: 'total_attempts', threshold: 10, operator: '>=' }
  },
  {
    id: 'quiz-veteran',
    name: 'Quiz Veteran',
    title: 'Quiz Veteran',
    description: 'Completed 25 quiz attempts and proven consistent dedication.',
    icon: '🎖️',
    category: 'milestones',
    rarity: 'rare',
    xpReward: 300,
    criteria: { type: 'total_attempts', threshold: 25, operator: '>=' }
  },
  {
    id: 'century-club',
    name: 'Century Club',
    title: 'Centurion',
    description: 'Completed 100 quiz attempts. A true testing machine.',
    icon: '💯',
    category: 'milestones',
    rarity: 'epic',
    xpReward: 750,
    criteria: { type: 'total_attempts', threshold: 100, operator: '>=' }
  },
  {
    id: 'quiz-legend',
    name: 'Quiz Grandmaster',
    title: 'Grandmaster',
    description: 'Completed 250 quiz attempts. Living legend of the academy.',
    icon: '👑',
    category: 'milestones',
    rarity: 'legendary',
    xpReward: 2000,
    criteria: { type: 'total_attempts', threshold: 250, operator: '>=' }
  },

  // --- Category: Accuracy & Perfection ---
  {
    id: 'flawless-victory',
    name: 'Flawless Victory',
    title: 'Perfectionist',
    description: 'Scored 100% on a completed quiz attempt.',
    icon: '✨',
    category: 'perfection',
    rarity: 'rare',
    xpReward: 100,
    criteria: { type: 'perfect_score', threshold: 1, operator: '>=' }
  },
  {
    id: 'triple-crown',
    name: 'Triple Crown',
    title: 'Sharpshooter',
    description: 'Achieved 3 perfect 100% scores on quizzes.',
    icon: '💎',
    category: 'perfection',
    rarity: 'epic',
    xpReward: 300,
    criteria: { type: 'perfect_score', threshold: 3, operator: '>=' }
  },
  {
    id: 'deadeye',
    name: 'Deadeye Maestro',
    title: 'Deadeye',
    description: 'Achieved 10 flawless 100% quiz scores.',
    icon: '🎯',
    category: 'perfection',
    rarity: 'legendary',
    xpReward: 800,
    criteria: { type: 'perfect_score', threshold: 10, operator: '>=' }
  },
  {
    id: 'mythic-mind',
    name: 'Divine Intellect',
    title: 'Omniscient',
    description: 'Achieved 25 flawless 100% scores. Unmatched brilliance.',
    icon: '🌌',
    category: 'perfection',
    rarity: 'mythic',
    xpReward: 2500,
    criteria: { type: 'perfect_score', threshold: 25, operator: '>=' }
  },

  // --- Category: Daily Streaks ---
  {
    id: 'streak-starter',
    name: 'Spark of Habit',
    title: 'Habit Builder',
    description: 'Maintained a 3-day active daily login streak.',
    icon: '🌱',
    category: 'streaks',
    rarity: 'common',
    xpReward: 75,
    criteria: { type: 'streak', threshold: 3, operator: '>=' }
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    title: 'Iron Will',
    description: 'Maintained a continuous 7-day daily streak.',
    icon: '🔥',
    category: 'streaks',
    rarity: 'rare',
    xpReward: 250,
    criteria: { type: 'streak', threshold: 7, operator: '>=' }
  },
  {
    id: 'fortnight-fire',
    name: 'Blazing Will',
    title: 'Inferno',
    description: 'Maintained a continuous 14-day daily streak.',
    icon: '⚡',
    category: 'streaks',
    rarity: 'epic',
    xpReward: 500,
    criteria: { type: 'streak', threshold: 14, operator: '>=' }
  },
  {
    id: 'monthly-titan',
    name: 'Month of Might',
    title: 'Titan of Habit',
    description: 'Maintained a continuous 30-day streak unbroken.',
    icon: '🌋',
    category: 'streaks',
    rarity: 'legendary',
    xpReward: 1200,
    criteria: { type: 'streak', threshold: 30, operator: '>=' }
  },
  {
    id: 'century-streak',
    name: 'Eternal Flame',
    title: 'The Undying',
    description: 'Maintained a 100-day daily login streak without interruption.',
    icon: '☀️',
    category: 'streaks',
    rarity: 'mythic',
    xpReward: 5000,
    criteria: { type: 'streak', threshold: 100, operator: '>=' }
  },

  // --- Category: Speed / Reflexes ---
  {
    id: 'quick-thinker',
    name: 'Swift Thinker',
    title: 'Swift',
    description: 'Passed a quiz in under 60 seconds.',
    icon: '⏱️',
    category: 'speed',
    rarity: 'rare',
    xpReward: 120,
    criteria: { type: 'speed_demon', threshold: 60, operator: '<=' }
  },
  {
    id: 'lightning-fast',
    name: 'Lightning Fast',
    title: 'Speed Demon',
    description: 'Passed a quiz in under 30 seconds with rapid answers.',
    icon: '⚡',
    category: 'speed',
    rarity: 'epic',
    xpReward: 350,
    criteria: { type: 'speed_demon', threshold: 30, operator: '<=' }
  },
  {
    id: 'sonic-pulse',
    name: 'Supersonic Reflexes',
    title: 'Lightspeed',
    description: 'Passed a quiz in under 15 seconds. Near-instant cognition.',
    icon: '🚀',
    category: 'speed',
    rarity: 'legendary',
    xpReward: 900,
    criteria: { type: 'speed_demon', threshold: 15, operator: '<=' }
  },

  // --- Category: XP & Levels ---
  {
    id: 'level-5',
    name: 'Rising Star',
    title: 'Aspirant',
    description: 'Reached User Level 5 through quiz mastery.',
    icon: '⭐',
    category: 'xp',
    rarity: 'common',
    xpReward: 100,
    criteria: { type: 'level', threshold: 5, operator: '>=' }
  },
  {
    id: 'level-10',
    name: 'Adept Practitioner',
    title: 'Adept',
    description: 'Reached User Level 10.',
    icon: '🌟',
    category: 'xp',
    rarity: 'rare',
    xpReward: 250,
    criteria: { type: 'level', threshold: 10, operator: '>=' }
  },
  {
    id: 'level-25',
    name: 'Elite Vanguard',
    title: 'Elite Vanguard',
    description: 'Reached User Level 25.',
    icon: '💫',
    category: 'xp',
    rarity: 'epic',
    xpReward: 600,
    criteria: { type: 'level', threshold: 25, operator: '>=' }
  },
  {
    id: 'level-50',
    name: 'Immortal Sage',
    title: 'Sage of Knowledge',
    description: 'Reached User Level 50. Revered across the realm.',
    icon: '🪐',
    category: 'xp',
    rarity: 'legendary',
    xpReward: 1500,
    criteria: { type: 'level', threshold: 50, operator: '>=' }
  },
  {
    id: 'score-millionaire',
    name: 'Score Titan',
    title: 'Score Titan',
    description: 'Accumulated over 10,000 total score points.',
    icon: '💰',
    category: 'xp',
    rarity: 'epic',
    xpReward: 800,
    criteria: { type: 'total_score', threshold: 10000, operator: '>=' }
  },

  // --- Category: Skill Tracks & Roads ---
  {
    id: 'pathfinder',
    name: 'Pathfinder',
    title: 'Pathfinder',
    description: 'Enrolled in or started your first skill track road.',
    icon: '🧭',
    category: 'skills',
    rarity: 'common',
    xpReward: 80,
    criteria: { type: 'track_started', threshold: 1, operator: '>=' }
  },
  {
    id: 'road-builder',
    name: 'Road Finisher',
    title: 'Architect',
    description: 'Completed 5 skill track modules.',
    icon: '🛠️',
    category: 'skills',
    rarity: 'rare',
    xpReward: 300,
    criteria: { type: 'track_modules', threshold: 5, operator: '>=' }
  },
  {
    id: 'track-master',
    name: 'Track Sovereign',
    title: 'Polymath',
    description: 'Completed 15 skill track modules across subjects.',
    icon: '🏛️',
    category: 'skills',
    rarity: 'epic',
    xpReward: 700,
    criteria: { type: 'track_modules', threshold: 15, operator: '>=' }
  },

  // --- Category: Clans & Social ---
  {
    id: 'clan-pioneer',
    name: 'Guildmate',
    title: 'Guildmate',
    description: 'Joined or founded a Clan to collaborate with peers.',
    icon: '🛡️',
    category: 'social',
    rarity: 'common',
    xpReward: 100,
    criteria: { type: 'clans', threshold: 1, operator: '>=' }
  },
  {
    id: 'socialite',
    name: 'Friendly Face',
    title: 'Companion',
    description: 'Added your first study friend on the platform.',
    icon: '🤝',
    category: 'social',
    rarity: 'common',
    xpReward: 75,
    criteria: { type: 'friend_count', threshold: 1, operator: '>=' }
  },
  {
    id: 'clan-patron',
    name: 'Clan Patron',
    title: 'Champion of the Realm',
    description: 'Contributed 500+ XP to your clan treasury.',
    icon: '🏰',
    category: 'social',
    rarity: 'rare',
    xpReward: 350,
    criteria: { type: 'clan_contribution', threshold: 500, operator: '>=' }
  },

  // --- Category: Arena & Challenges ---
  {
    id: 'first-duel',
    name: 'Arena Challenger',
    title: 'Gladiator',
    description: 'Played or issued your first multiplayer quiz challenge.',
    icon: '⚔️',
    category: 'arena',
    rarity: 'common',
    xpReward: 80,
    criteria: { type: 'challenges', threshold: 1, operator: '>=' }
  },
  {
    id: 'arena-champion',
    name: 'Duel Conqueror',
    title: 'Arena Champion',
    description: 'Won 5 multiplayer or async VS challenge duels.',
    icon: '🏆',
    category: 'arena',
    rarity: 'epic',
    xpReward: 500,
    criteria: { type: 'challenge_wins', threshold: 5, operator: '>=' }
  }
];

/**
 * Seeds or updates the default 30-badge catalog in the database.
 */
export const seedDefaultBadges = async () => {
  try {
    const ops = DEFAULT_BADGES.map(badge => {
      return Badge.findOneAndUpdate(
        { id: badge.id },
        { $set: badge },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });
    const results = await Promise.all(ops);

    // Also mirror to BadgeNode for tree system backward compatibility
    const nodeOps = DEFAULT_BADGES.map(b => {
      return BadgeNode.findOneAndUpdate(
        { badgeId: b.id },
        {
          $set: {
            badgeId: b.id,
            name: b.name,
            title: b.title || b.name,
            category: b.category,
            description: b.description,
            icon: b.icon,
            rarity: b.rarity,
            unlockCriteria: [{
              type: b.criteria.type,
              threshold: b.criteria.threshold,
              operator: b.criteria.operator
            }],
            rewards: {
              xp: b.xpReward,
              coins: Math.round(b.xpReward / 2),
              powerUps: []
            }
          }
        },
        { upsert: true, new: true }
      );
    });
    await Promise.allSettled(nodeOps);

    return results;
  } catch (error) {
    console.error('Error seeding default badges:', error);
    throw error;
  }
};

/**
 * Evaluates all badges for a user, auto-awards any unlocked, adds XP bonus,
 * updates user level, auto-equips if none equipped, and syncs clan XP.
 * 
 * @param {string} userId 
 * @param {Object} context Optional context (e.g., attempt data)
 * @returns {Promise<{ newlyUnlocked: Array, user: Object }>}
 */
export const evaluateAndAwardBadges = async (userId, context = {}) => {
  if (!userId) return { newlyUnlocked: [], user: null };

  try {
    const user = await User.findOne({ userId });
    if (!user) return { newlyUnlocked: [], user: null };

    // Ensure badge catalog is not empty
    let allBadges = await Badge.find().lean();
    if (!allBadges || allBadges.length === 0) {
      await seedDefaultBadges();
      allBadges = await Badge.find().lean();
    }

    const earnedBadgeIds = new Set((user.badges || []).map(b => b.id));

    // Parallel gather of relevant evaluation metrics
    const [
      attemptsCount,
      perfectCount,
      fastestAttempt,
      challengeCount,
      clanDoc
    ] = await Promise.all([
      Attempt.countDocuments({ userId }),
      Attempt.countDocuments({ userId, percentage: 100 }),
      Attempt.findOne({ userId, passed: true, timeTaken: { $gt: 0 } })
        .sort({ timeTaken: 1 })
        .select('timeTaken')
        .lean(),
      Challenge.countDocuments({
        $or: [{ fromId: userId }, { toId: userId }]
      }).catch(() => 0),
      user.clanId ? Clan.findOne({ clanId: user.clanId }).select('members').lean() : null
    ]);

    // Calculate clan contribution if in clan
    let clanContribution = 0;
    if (clanDoc && clanDoc.members) {
      const myMember = clanDoc.members.find(m => m.userId === userId);
      clanContribution = myMember?.contribution || 0;
    }

    // Calculate completed track modules
    const completedModules = (user.skillTracks || []).reduce(
      (sum, t) => sum + (t.completedModules?.length || 0),
      0
    );

    // Current attempt context speed
    const currentAttemptTime = (context.attempt && context.attempt.passed && context.attempt.timeTaken > 0)
      ? context.attempt.timeTaken
      : null;
    const bestSpeed = Math.min(
      ...[currentAttemptTime, fastestAttempt?.timeTaken].filter((n) => typeof n === 'number' && n > 0)
    );

    const metrics = {
      total_attempts: Math.max(user.totalAttempts || 0, attemptsCount),
      perfect_score: perfectCount,
      streak: user.streak || 0,
      level: user.level || 1,
      total_score: user.totalScore || 0,
      speed_demon: Number.isFinite(bestSpeed) ? bestSpeed : 9999,
      track_started: (user.primaryTrackId || (user.skillTracks && user.skillTracks.length > 0)) ? 1 : 0,
      track_modules: completedModules,
      clans: user.clanId ? 1 : 0,
      clan_contribution: clanContribution,
      friend_count: user.friends?.length || 0,
      challenges: challengeCount,
      challenge_wins: Math.floor(challengeCount / 2) // Approximation or verified count
    };

    const newlyUnlocked = [];
    let totalXpBonus = 0;

    for (const badge of allBadges) {
      const badgeId = badge.id || badge._id?.toString();
      if (!badgeId || earnedBadgeIds.has(badgeId)) continue;

      const { type, threshold, operator = '>=' } = badge.criteria || {};
      const userValue = metrics[type];

      let unlocked = false;
      if (typeof userValue === 'number') {
        switch (operator) {
          case '>=': unlocked = userValue >= threshold; break;
          case '>': unlocked = userValue > threshold; break;
          case '<=': unlocked = userValue <= threshold && userValue > 0; break;
          case '<': unlocked = userValue < threshold && userValue > 0; break;
          case '=': unlocked = userValue === threshold; break;
          default: unlocked = userValue >= threshold;
        }
      }

      if (unlocked) {
        const earnedObj = {
          id: badgeId,
          name: badge.name,
          title: badge.title || badge.name,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity || 'common',
          category: badge.category || 'milestones',
          xpReward: badge.xpReward || 50,
          dateEarned: new Date()
        };

        if (!user.badges) user.badges = [];
        user.badges.push(earnedObj);
        earnedBadgeIds.add(badgeId);

        const xpReward = badge.xpReward || 50;
        user.xp = (user.xp || 0) + xpReward;
        totalXpBonus += xpReward;

        // Auto-equip first unlocked badge if nothing equipped
        if (!user.equippedBadgeId) {
          user.equippedBadgeId = badgeId;
        }

        newlyUnlocked.push(earnedObj);
      }
    }

    if (newlyUnlocked.length > 0) {
      // Recalculate level
      user.level = 1 + Math.floor((user.xp || 0) / 1000);
      await user.save();

      // Sync XP to Clan if user belongs to one
      if (user.clanId && totalXpBonus > 0) {
        await syncClanXp(userId, totalXpBonus, user.clanId).catch(err => {
          console.warn('Clan XP sync error after badge unlock:', err.message);
        });
      }

      // Invalidate clan cache so member roster shows fresh badge
      if (user.clanId) {
        clanCache.invalidateClan(user.clanId);
      }
    }

    return { newlyUnlocked, user };
  } catch (error) {
    console.error('Error evaluating badges for user:', userId, error);
    return { newlyUnlocked: [], user: null };
  }
};

/**
 * Equips or un-equips a badge for a user.
 * 
 * @param {string} userId 
 * @param {string|null} badgeId 
 */
export const equipUserBadge = async (userId, badgeId) => {
  const user = await User.findOne({ userId });
  if (!user) {
    throw new Error('User not found');
  }

  // Unequip
  if (!badgeId || badgeId === '' || badgeId === 'none') {
    user.equippedBadgeId = null;
    await user.save();
    if (user.clanId) clanCache.invalidateClan(user.clanId);
    return { success: true, equippedBadgeId: null };
  }

  // Validate user owns this badge
  const hasBadge = (user.badges || []).some(b => b.id === badgeId);
  if (!hasBadge) {
    throw new Error('You must unlock this badge before equipping it.');
  }

  user.equippedBadgeId = badgeId;
  await user.save();

  if (user.clanId) {
    clanCache.invalidateClan(user.clanId);
  }

  return { success: true, equippedBadgeId: badgeId };
};
