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
      members: [{ userId, role: 'leader', contribution: 0 }],
      announcements: []
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

    // Self-heal leaderId if it ever drifted from the member with leader role
    const storedLeader = clan.members.find(m => m.role === 'leader');
    if (storedLeader && clan.leaderId !== storedLeader.userId) {
      clan.leaderId = storedLeader.userId;
      await clan.save();
    }
    
    // Enrich member data (names, avatars)
    const memberIds = clan.members.map(m => m.userId);
    const requestIds = clan.activeJoinRequests ? clan.activeJoinRequests.map(r => r.userId) : [];
    const allUserIds = [...memberIds, ...requestIds];

    const users = await User.find({ userId: { $in: allUserIds } })
      .select('userId name avatar xp totalScore')
      .lean();
      
    const enrichedMembers = clan.members.map(m => {
      const user = users.find(u => u.userId === m.userId);
      // Explicitly map user fields to avoid overwriting member role or other internal fields
      const memberObj = m.toObject();
      if (user) {
          memberObj.name = user.name;
          memberObj.avatar = user.avatar;
          memberObj.xp = user.xp; // User's global XP
          memberObj.totalScore = user.totalScore;
      }
      return memberObj;
    });

    const enrichedRequests = clan.activeJoinRequests ? clan.activeJoinRequests.map(r => {
        const user = users.find(u => u.userId === r.userId);
        return { 
            ...r.toObject(), 
            name: user?.name || 'Unknown', 
            avatar: user?.avatar 
        };
    }) : [];

    res.json({ ...clan.toObject(), members: enrichedMembers, activeJoinRequests: enrichedRequests });
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

    // Check if already requested
    const existingRequest = clan.activeJoinRequests?.find(r => r.userId === userId);
    if (existingRequest) return res.status(400).json({ message: 'Join request already pending' });

    if (!clan.isPublic) {
        clan.activeJoinRequests.push({ userId });
        await clan.save();
        return res.json({ message: 'Join request sent', requestSent: true });
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
                 if (newLeader) {
                   newLeader.role = 'leader';
                   clan.leaderId = newLeader.userId; // Keep leaderId in sync for permissions/UI
                 }
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

export const updateClan = async (req, res) => {
    try {
        const { clanId } = req.params;
        const { name, description, isPublic, settings } = req.body;
        const userId = req.user.userId;

        const clan = await Clan.findOne({ clanId });
        if (!clan) return res.status(404).json({ message: 'Clan not found' });

        const member = clan.members.find(m => m.userId === userId);
        const isLeader = member?.role === 'leader' || clan.leaderId === userId;
        if (!isLeader) {
          return res.status(403).json({ message: 'Only the leader can update clan settings' });
        }

        if (name) clan.name = name;
        if (description !== undefined) clan.description = description;
        if (isPublic !== undefined) clan.isPublic = isPublic;
        if (settings) clan.settings = { ...clan.settings, ...settings };

        await clan.save();
        res.json(clan);
    } catch (error) {
        res.status(500).json({ message: 'Error updating clan', error: error.message });
    }
};

export const inviteToClan = async (req, res) => {
    try {
        const { targetUserId, clanId } = req.body;
        const userId = req.user.userId;

        const clan = await Clan.findOne({ clanId });
        if (!clan) return res.status(404).json({ message: 'Clan not found' });

        // Check permissions (Leader or Elder)
        const member = clan.members.find(m => m.userId === userId);
        if (!member || (member.role !== 'leader' && member.role !== 'elder')) {
            return res.status(403).json({ message: 'No permission to invite' });
        }

        const targetUser = await User.findOne({ userId: targetUserId });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        if (targetUser.clanId) {
            return res.status(400).json({ message: 'User is already in a clan' });
        }

        // Check if already invited
        const existingInvite = targetUser.clanInvites?.find(inv => inv.clanId === clanId);
        if (existingInvite) {
            return res.status(400).json({ message: 'User already has a pending invite' });
        }

        targetUser.clanInvites.push({
            clanId,
            clanName: clan.name,
            invitedBy: userId
        });

        await targetUser.save();
        res.json({ message: 'Invitation sent' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending invitation', error: error.message });
    }
};

export const respondToClanInvite = async (req, res) => {
    try {
        const { clanId, accept } = req.body;
        const userId = req.user.userId;

        const user = await User.findOne({ userId });
        const inviteIndex = user.clanInvites.findIndex(inv => inv.clanId === clanId);

        if (inviteIndex === -1) {
            return res.status(404).json({ message: 'Invitation not found' });
        }

        if (accept) {
            if (user.clanId) {
                return res.status(400).json({ message: 'You are already in a clan' });
            }

            const clan = await Clan.findOne({ clanId });
            if (!clan) {
                user.clanInvites.splice(inviteIndex, 1);
                await user.save();
                return res.status(404).json({ message: 'Clan no longer exists' });
            }

            clan.members.push({ userId, role: 'member', contribution: 0 });
            await clan.save();
            
            user.clanId = clanId;
        }

        // Remove invite regardless of accept/reject
        user.clanInvites.splice(inviteIndex, 1);
        await user.save();

        res.json({ message: accept ? 'Joined clan successfully' : 'Invitation rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Error responding to invitation', error: error.message });
    }
};

export const handleJoinRequest = async (req, res) => {
    try {
        const { clanId, targetUserId, accept } = req.body;
        const userId = req.user.userId;

        const clan = await Clan.findOne({ clanId });
        if (!clan) return res.status(404).json({ message: 'Clan not found' });

        // Check Permissions
        const requester = clan.members.find(m => m.userId === userId);
        if (!requester || (requester.role !== 'leader' && requester.role !== 'elder')) {
            return res.status(403).json({ message: 'No permission' });
        }

        const requestIndex = clan.activeJoinRequests.findIndex(r => r.userId === targetUserId);
        if (requestIndex === -1) return res.status(404).json({ message: 'Request not found' });

        if (accept) {
            const targetUser = await User.findOne({ userId: targetUserId });
            if (!targetUser) return res.status(404).json({ message: 'User not found' });
            
            if (targetUser.clanId) {
                // User joined another clan in the meantime
                clan.activeJoinRequests.splice(requestIndex, 1);
                await clan.save();
                return res.status(400).json({ message: 'User already in a clan' });
            }

            clan.members.push({ userId: targetUserId, role: 'member', contribution: 0 });
            targetUser.clanId = clanId;
            await targetUser.save();
        }

        clan.activeJoinRequests.splice(requestIndex, 1);
        await clan.save();

        res.json({ message: accept ? 'Request accepted' : 'Request rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Error handling request', error: error.message });
    }
};

export const kickMember = async (req, res) => {
    try {
        const { clanId, targetUserId } = req.body;
        const userId = req.user.userId;

        // Early self-kick check
        if (userId === targetUserId) {
            return res.status(403).json({ message: 'You cannot kick yourself' });
        }

        const clan = await Clan.findOne({ clanId });
        if (!clan) {
            return res.status(404).json({ message: 'Clan not found' });
        }

        const executor = clan.members.find(m => m.userId === userId);
        const target = clan.members.find(m => m.userId === targetUserId);

        if (!executor || !target) {
            return res.status(404).json({ message: 'Member not found in clan' });
        }

        // Scalable role hierarchy system
        const rolePower = {
            leader: 3,
            elder: 2,
            member: 1
        };

        // Permission: executor must have higher power than target
        if (rolePower[executor.role] <= rolePower[target.role]) {
            return res.status(403).json({ message: 'No permission to kick this member' });
        }

        // Defensive: re-check findIndex before splice
        const memberIndex = clan.members.findIndex(m => m.userId === targetUserId);
        if (memberIndex === -1) {
            return res.status(400).json({ message: 'Member not found - may have already left' });
        }

        clan.members.splice(memberIndex, 1);
        await clan.save();

        // ISSUE: Race condition - user re-joins immediately
        // FIX: Use atomic update with clanId match condition
        const updateResult = await User.updateOne(
            { userId: targetUserId, clanId: clanId }, // Only clear if clanId still matches
            { $set: { clanId: null } }
        );

        if (updateResult.matchedCount === 0) {
            console.warn(`⚠️ User ${targetUserId} may have rejoined clan ${clanId} before clearing clanId`);
        }

        // ISSUE: WebSocket didn't emit update
        // FIX: Emit events to notify kicked user and clan members
        const io = req.app?.get?.('io');
        if (io) {
            io.to(targetUserId).emit('kicked_from_clan', {
                clanId,
                clanName: clan.name,
                message: `You were removed from clan ${clan.name}`
            });
            io.to(`clan_${clanId}`).emit('member_kicked', {
                targetUserId,
                clanId
            });
        }

        res.json({ message: 'Member kicked successfully' });
    } catch (error) {
        console.error('Error kicking member:', error);
        res.status(500).json({
            message: 'Error kicking member',
            error: error.message
        });
    }
};

export const updateMemberRole = async (req, res) => {
    try {
        const { clanId, targetUserId, newRole } = req.body; // 'elder', 'member'
        const userId = req.user.userId;

        if (!['elder', 'member'].includes(newRole)) return res.status(400).json({ message: 'Invalid role' });

        const clan = await Clan.findOne({ clanId });
        if (!clan) return res.status(404).json({ message: 'Clan not found' });

        // Only Leader can promote/demote
        const actingMember = clan.members.find(m => m.userId === userId);
        const isLeader = actingMember?.role === 'leader' || clan.leaderId === userId;
        if (!isLeader) return res.status(403).json({ message: 'Only leader can change roles' });

        const target = clan.members.find(m => m.userId === targetUserId);
        if (!target) return res.status(404).json({ message: 'Member not found' });

        target.role = newRole;
        await clan.save();

        res.json({ message: 'Role updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating role', error: error.message });
    }
};

export const createClanAnnouncement = async (req, res) => {
    try {
        const { clanId } = req.params;
        const { content } = req.body;
        const userId = req.user.userId;

        const clan = await Clan.findOne({ clanId });
        if (!clan) return res.status(404).json({ message: 'Clan not found' });

        const member = clan.members.find(m => m.userId === userId);
        if (!member || (member.role !== 'leader' && member.role !== 'elder')) {
             return res.status(403).json({ message: 'Only leaders and elders can post announcements' });
        }

        const user = await User.findOne({ userId });

        const newAnnouncement = {
            id: crypto.randomUUID(),
            authorId: userId,
            authorName: user.name || 'Unknown',
            content,
            isPinned: false,
            createdAt: new Date()
        };

        if (!clan.announcements) clan.announcements = [];
        clan.announcements.unshift(newAnnouncement);
        
        // Limit to 50 announcements to prevent bloat
        if (clan.announcements.length > 50) {
            clan.announcements = clan.announcements.slice(0, 50);
        }

        await clan.save();
        res.status(201).json(newAnnouncement);
    } catch (error) {
        res.status(500).json({ message: 'Error creating announcement', error: error.message });
    }
};

export const deleteClanAnnouncement = async (req, res) => {
    try {
        const { clanId, announcementId } = req.params;
        const userId = req.user.userId;

        const clan = await Clan.findOne({ clanId });
        if (!clan) return res.status(404).json({ message: 'Clan not found' });

        const member = clan.members.find(m => m.userId === userId);
        if (!member || (member.role !== 'leader' && member.role !== 'elder')) {
             return res.status(403).json({ message: 'No permission' });
        }

        if (!clan.announcements) return res.status(404).json({ message: 'Announcement not found' });

        const index = clan.announcements.findIndex(a => a.id === announcementId);
        if (index === -1) return res.status(404).json({ message: 'Announcement not found' });

        clan.announcements.splice(index, 1);
        await clan.save();
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting announcement', error: error.message });
    }
};

export const pinClanAnnouncement = async (req, res) => {
    try {
        const { clanId, announcementId } = req.params;
        const userId = req.user.userId;

        const clan = await Clan.findOne({ clanId });
        if (!clan) return res.status(404).json({ message: 'Clan not found' });

        const member = clan.members.find(m => m.userId === userId);
        if (!member || (member.role !== 'leader' && member.role !== 'elder')) {
             return res.status(403).json({ message: 'No permission' });
        }

        if (!clan.announcements) return res.status(404).json({ message: 'Announcement not found' });

        const announcement = clan.announcements.find(a => a.id === announcementId);
        if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

        announcement.isPinned = !announcement.isPinned;
        
        // Sort: Pinned first, then by date
        clan.announcements.sort((a, b) => {
            if (a.isPinned === b.isPinned) {
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return a.isPinned ? -1 : 1;
        });

        await clan.save();
        res.json(announcement);
    } catch (error) {
        res.status(500).json({ message: 'Error toggling pin', error: error.message });
    }
};
