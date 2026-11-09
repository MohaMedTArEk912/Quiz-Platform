import { Badge } from '../models/Badge.js';
import { User } from '../models/User.js';
import { 
  seedDefaultBadges, 
  evaluateAndAwardBadges, 
  equipUserBadge 
} from '../services/badgeService.js';

export const getBadges = async (req, res) => {
  try {
    let badges = await Badge.find({}).lean();
    if (!badges || badges.length === 0) {
      await seedDefaultBadges();
      badges = await Badge.find({}).lean();
    }
    res.json(badges);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching badges', error: error.message });
  }
};

export const createBadge = async (req, res) => {
  try {
    const badgeData = req.body;
    if (!badgeData.id || !badgeData.name || !badgeData.icon) {
      return res.status(400).json({ message: 'Badge id, name, and icon are required' });
    }
    const newBadge = new Badge(badgeData);
    await newBadge.save();
    res.status(201).json(newBadge);
  } catch (error) {
    res.status(500).json({ message: 'Error creating badge', error: error.message });
  }
};

export const deleteBadge = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Badge.findOneAndDelete({ id });
    if (!result) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    res.json({ message: 'Badge deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting badge', error: error.message });
  }
};

export const seedBadges = async (req, res) => {
  try {
    const seeded = await seedDefaultBadges();
    const badges = await Badge.find({}).lean();
    res.json({
      success: true,
      message: 'Default badges seeded successfully',
      count: badges.length,
      badges
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error seeding badges', error: error.message });
  }
};

export const evaluateBadges = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }
    const result = await evaluateAndAwardBadges(userId);
    res.json({
      success: true,
      newlyUnlocked: result.newlyUnlocked,
      newBadges: result.newlyUnlocked,
      user: result.user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error evaluating badges', error: error.message });
  }
};

export const equipBadge = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }
    const { badgeId } = req.body || {};
    const result = await equipUserBadge(userId, badgeId);
    const updatedUser = await User.findOne({ userId }).lean();
    res.json({ ...result, success: true, user: updatedUser });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Error equipping badge' });
  }
};
