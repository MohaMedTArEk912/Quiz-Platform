import { Attempt } from '../models/Attempt.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';

export const getAnalyticsSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

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

export const getData = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    
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
