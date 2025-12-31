import { User } from '../models/User.js';
import { Attempt } from '../models/Attempt.js';
import { Badge } from '../models/Badge.js';
import { Challenge } from '../models/Challenge.js';
import { ShopItem } from '../models/ShopItem.js';

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // SECURITY: Prevent role changes through this endpoint
    if (updates.role !== undefined) {
      delete updates.role;
    }
    
    // Prevent updating userId
    if (updates.userId !== undefined) {
      delete updates.userId;
    }
    
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete user
    const deletedUser = await User.findOneAndDelete({ userId });
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Also delete all attempts by this user
    await Attempt.deleteMany({ userId });
    
    res.json({ message: 'User and associated attempts deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

export const getUserData = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId })
      .select('userId name email role totalScore totalAttempts totalTime xp level streak lastLoginDate badges friends friendRequests avatar')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const attempts = await Attempt.find({ userId: req.user.userId })
      .sort({ completedAt: -1 })
      .lean();

    const badges = await Badge.find({}).lean();

    // Build friend / request participant list
    const friendIds = new Set([
      ...(user.friends || []),
      ...((user.friendRequests || []).map((r) => r.from)),
      ...((user.friendRequests || []).map((r) => r.to)),
    ].filter(Boolean));

    // Top leaderboard slice
    const leaderboard = await User.find(
      {},
      'userId name totalScore totalAttempts xp level streak lastLoginDate badges role'
    )
      .sort({ totalScore: -1 })
      .limit(100)
      .lean();

    const friendDocs = friendIds.size > 0
      ? await User.find(
        { userId: { $in: Array.from(friendIds) } },
        'userId name totalScore totalAttempts xp level streak lastLoginDate badges role'
      ).lean()
      : [];

    // Merge leaderboard + friends + current user into a single unique list
      const mergedUsersMap = new Map();
    [...leaderboard, ...friendDocs, user].forEach((u) => {
      if (u) mergedUsersMap.set(u.userId, u);
    });

    // Calculate rank with an indexed count (totalScore index added in model)
    const rank = await User.countDocuments({ totalScore: { $gt: user.totalScore || 0 } }) + 1;

    // Challenges
    const challenges = await Challenge.find({
      $or: [{ fromId: req.user.userId }, { toId: req.user.userId }]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Shop items
    const shopItems = await ShopItem.find({}).lean();

    res.json({
      user: { ...user, rank },
      attempts,
      badges,
      users: Array.from(mergedUsersMap.values()),
      challenges,
      shopItems
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 3) {
            return res.json([]);
        }
        
        const users = await User.find({
            $or: [
                { email: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } },
                { userId: { $regex: query, $options: 'i' } }
            ]
        }).limit(10).select('userId name email totalScore').lean();
        
        // Filter out self
        const filtered = users.filter(u => u.userId !== req.user.userId);
        res.json(filtered);
    } catch (error) {
        res.status(500).json({ message: 'Error searching users', error: error.message });
    }
};

export const sendFriendRequest = async (req, res) => {
    try {
      const { targetUserId } = req.body;
      const requesterId = req.user.userId;
  
      if (targetUserId === requesterId) {
        return res.status(400).json({ message: 'Cannot friend yourself' });
      }
  
      const targetUser = await User.findOne({ userId: targetUserId });
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if already friends or requested
      const existingRequest = targetUser.friendRequests.find(r => r.from === requesterId && r.status === 'pending');
      if (existingRequest) {
        return res.status(400).json({ message: 'Request already sent' });
      }
      
      // Check if already friends (checking ID in array of strings)
      if (targetUser.friends.map(f => String(f)).includes(requesterId)) {
          return res.status(400).json({ message: 'Already friends' });
      }
  
      targetUser.friendRequests.push({
        from: requesterId,
        to: targetUserId,
        status: 'pending'
      });
  
      await targetUser.save();
      
      // Socket emission should be handled where io is available or via events.
      // For refactor, we might separate IO or pass it? 
      // Ideally, controllers shouldn't depend on global `io`.
      // We will export a setIO function or similar pattern later if needed.
      // For now, we will OMIT specific socket emission here to keep it pure, 
      // OR we need to import `io` if it was exported, but it wasn't.
      // RECOMMENDATION: Setup an event emitter or import a singleton.
      
      // START TEMP FIX: Importing io if we can, or just omitting real-time for this refactor step 
      // and noting it. The original code used `io` from closure.
      // We will skip `io` calls in controllers for this pass and fix it in index.js by attaching io to req or global.
      
      if (req.app.get('io')) {
          req.app.get('io').to(targetUserId).emit('friend_request', { from: req.user.name, fromId: requesterId });
      }
  
      res.json({ message: 'Friend request sent' });
    } catch (error) {
      res.status(500).json({ message: 'Error sending friend request', error: error.message });
    }
  };

export const respondToFriendRequest = async (req, res) => {
    try {
      const { fromUserId, action } = req.body; // action: 'accept' | 'reject'
      const user = req.user;
  
      const requestIndex = user.friendRequests.findIndex(r => r.from === fromUserId && r.status === 'pending');
      if (requestIndex === -1) {
        return res.status(404).json({ message: 'Request not found' });
      }
  
      if (action === 'accept') {
        user.friends.push(fromUserId);
        user.friendRequests[requestIndex].status = 'accepted';
        
        // Update the other user as well
        const sender = await User.findOne({ userId: fromUserId });
        if (sender) {
          sender.friends.push(user.userId);
          await sender.save();
          
          if (req.app.get('io')) {
             req.app.get('io').to(fromUserId).emit('friend_request_accepted', {
                userName: user.name,
                userId: user.userId
             });
          }
        }
      } else {
        user.friendRequests[requestIndex].status = 'rejected';
         user.friendRequests.splice(requestIndex, 1);
      }
  
      await user.save();
      res.json({ message: `Friend request ${action}ed` });
    } catch (error) {
      res.status(500).json({ message: 'Error responding to request', error: error.message });
    }
  };
