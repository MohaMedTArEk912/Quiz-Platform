import { Clan } from '../models/Clan.js';
import { User } from '../models/User.js';
import crypto from 'crypto';

export const createClan = async (req, res) => {
  try {
    const { name, tag, description, isPublic } = req.body;
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (user.clanId) {
      return res.status(400).json({ message: 'You are already in a clan' });
    }

    const existingClan = await Clan.findOne({ name });
    if (existingClan) {
      return res.status(409).json({ message: 'Clan name already taken' });
    }

    const newClan = new Clan({
      clanId: crypto.randomUUID(),
      name,
      tag,
      description,
      leaderId: userId,
      isPublic: isPublic !== undefined ? isPublic : true,
      members: [{ userId, role: 'leader', contribution: 0 }]
    });

    await newClan.save();
    
    // Update user
    user.clanId = newClan.clanId;
    await user.save();

    res.status(201).json(newClan);
  } catch (error) {
    res.status(500).json({ message: 'Error creating clan', error: error.message });
  }
};

export const getClan = async (req, res) => {
  try {
    const { clanId } = req.params;
    const clan = await Clan.findOne({ clanId });
    if (!clan) return res.status(404).json({ message: 'Clan not found' });
    
    // Enrich member data (names, avatars)
    const memberIds = clan.members.map(m => m.userId);
    const users = await User.find({ userId: { $in: memberIds } })
      .select('userId name avatar xp totalScore')
      .lean();
      
    const enrichedMembers = clan.members.map(m => {
      const user = users.find(u => u.userId === m.userId);
      return { ...m.toObject(), ...user };
    });

    res.json({ ...clan.toObject(), members: enrichedMembers });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clan', error: error.message });
  }
};

export const searchClans = async (req, res) => {
  try {
    const { query } = req.query;
    const clans = await Clan.find({
        $or: [
            { name: { $regex: query || '', $options: 'i' } },
            { tag: { $regex: query || '', $options: 'i' } }
        ]
    }).limit(20).sort({ totalXP: -1 });
    res.json(clans);
  } catch (error) {
    res.status(500).json({ message: 'Error searching clans', error: error.message });
  }
};

export const joinClan = async (req, res) => {
  try {
    const { clanId } = req.body;
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (user.clanId) return res.status(400).json({ message: 'Already in a clan' });

    const clan = await Clan.findOne({ clanId });
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    if (!clan.isPublic) {
        // Handle join request logit later
        return res.status(403).json({ message: 'Clan is invite only' }); 
    }

    clan.members.push({ userId, role: 'member', contribution: 0 });
    await clan.save();

    user.clanId = clanId;
    await user.save();

    res.json({ message: 'Joined clan successfully', clan });
  } catch (error) {
    res.status(500).json({ message: 'Error joining clan', error: error.message });
  }
};

export const leaveClan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findOne({ userId });
    
    if (!user.clanId) return res.status(400).json({ message: 'Not in a clan' });

    const clan = await Clan.findOne({ clanId: user.clanId });
    if (clan) {
        // If leader, assign new leader or delete clan?
        // Simplicity: If leader leaves and is only one, delete. If others, assign oldest elder/member.
        const memberIndex = clan.members.findIndex(m => m.userId === userId);
        if (memberIndex !== -1) {
             const member = clan.members[memberIndex];
             if (member.role === 'leader') {
                 if (clan.members.length === 1) {
                     await Clan.deleteOne({ clanId: clan.clanId });
                     user.clanId = null;
                     await user.save();
                     return res.json({ message: 'Clan dissolved' });
                 } else {
                     // Assign new leader (next member)
                     // Ideally sort by role/join date
                     const newLeader = clan.members.find(m => m.userId !== userId);
                     if (newLeader) newLeader.role = 'leader';
                 }
             }
             clan.members.splice(memberIndex, 1);
             await clan.save();
        }
    }

    user.clanId = null;
    await user.save();
    
    res.json({ message: 'Left clan' });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving clan', error: error.message });
  }
};

export const getClanLeaderboard = async (req, res) => {
  try {
    // Fetch all clans sorted by totalXP (limit to top 100 for performance)
    const clans = await Clan.find({})
      .sort({ totalXP: -1, level: -1 })
      .limit(100)
      .lean();

    // Get all unique leader IDs
    const leaderIds = [...new Set(clans.map(clan => clan.leaderId))];
    
    // Fetch all leaders in one query (optimized)
    const leaders = await User.find({ userId: { $in: leaderIds } })
      .select('userId name')
      .lean();
    
    // Create a map for quick lookup
    const leaderMap = new Map(leaders.map(leader => [leader.userId, leader.name]));

    // Enrich clan data
    const enrichedClans = clans.map((clan, index) => ({
      clanId: clan.clanId,
      name: clan.name,
      tag: clan.tag,
      description: clan.description,
      level: clan.level,
      totalXP: clan.totalXP,
      memberCount: clan.members.length,
      leaderName: leaderMap.get(clan.leaderId) || 'Unknown',
      rank: index + 1,
      isPublic: clan.isPublic
    }));

    res.json(enrichedClans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
};

