import { Clan } from '../models/Clan.js';
import { User } from '../models/User.js';
import crypto from 'crypto';
import { escapeRegex } from '../utils/regexUtils.js';
import { sendClanInviteEmail } from '../services/emailService.js';
import { evaluateAndAwardBadges } from '../services/badgeService.js';

// ==========================================
// In-Memory TTL Cache (30s)
// ==========================================
class ClanTtlCache {
  constructor(defaultTtlMs = 30000) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  del(key) {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateClan(clanId) {
    if (clanId) {
      this.del(`clan_detail_${clanId}`);
    }
    this.del('clan_leaderboard');
    this.invalidatePrefix('clan_search_');
  }

  clear() {
    this.cache.clear();
  }
}

export const clanCache = new ClanTtlCache(30000);
export const invalidateClanDetailCache = (clanId) => clanCache.invalidateClan(clanId);

export const createClan = async (req, res) => {
  try {
    const { name, tag, description, isPublic, logo } = req.body || {};
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
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
      announcements: [],
      chatMessages: [],
      logo: logo || undefined
    });

    await newClan.save();
    
    // Update user
    user.clanId = newClan.clanId;
    await user.save();

    clanCache.invalidateClan(newClan.clanId);
    evaluateAndAwardBadges(userId).catch(() => {});

    res.status(201).json(newClan);
  } catch (error) {
    res.status(500).json({ message: 'Error creating clan', error: error.message });
  }
};

export const getClan = async (req, res) => {
  try {
    const { clanId } = req.params;
    const cacheKey = `clan_detail_${clanId}`;
    const cached = clanCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const clan = await Clan.findOne({ clanId }).lean();
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    // Self-heal leaderId if it ever drifted from the member with leader role
    const members = clan.members || [];
    const storedLeader = members.find(m => m.role === 'leader');
    if (storedLeader && clan.leaderId !== storedLeader.userId) {
      clan.leaderId = storedLeader.userId;
      Clan.updateOne({ clanId }, { $set: { leaderId: storedLeader.userId } }).catch(() => {});
    }
    
    // Enrich member data (names, avatars, xp, totalScore)
    const memberIds = members.map(m => m.userId);
    const requests = clan.activeJoinRequests || [];
    const requestIds = requests.map(r => r.userId);
    const allUserIds = [...new Set([...memberIds, ...requestIds].filter(Boolean))];

    const users = await User.find({ userId: { $in: allUserIds } })
      .select('userId name avatar xp totalScore equippedBadgeId badges')
      .lean();
      
    const userMap = new Map(users.map(u => [u.userId, u]));

    const enrichedMembers = members.map(m => {
      const user = userMap.get(m.userId);
      const equippedBadge = user?.badges?.find(b => b.id === user?.equippedBadgeId);
      return {
        ...m,
        name: user?.name || m.name || 'Unknown',
        avatar: user?.avatar || m.avatar,
        xp: user?.xp ?? m.xp ?? 0,
        totalScore: user?.totalScore ?? m.totalScore ?? 0,
        equippedBadgeId: user?.equippedBadgeId || null,
        equippedBadge: equippedBadge ? {
          id: equippedBadge.id,
          name: equippedBadge.name,
          title: equippedBadge.title || equippedBadge.name,
          icon: equippedBadge.icon,
          rarity: equippedBadge.rarity || 'common'
        } : null
      };
    });

    const enrichedRequests = requests.map(r => {
      const user = userMap.get(r.userId);
      return {
        ...r,
        name: user?.name || 'Unknown',
        avatar: user?.avatar
      };
    });

    const result = {
      ...clan,
      members: enrichedMembers,
      activeJoinRequests: enrichedRequests
    };

    clanCache.set(cacheKey, result, 30000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clan', error: error.message });
  }
};

export const searchClans = async (req, res) => {
  try {
    const { query = '' } = req.query;
    const safeQuery = escapeRegex(query, 40);
    const cacheKey = `clan_search_${safeQuery.toLowerCase()}`;
    const cached = clanCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const queryFilter = safeQuery
      ? {
          $or: [
            { name: { $regex: safeQuery, $options: 'i' } },
            { tag: { $regex: safeQuery, $options: 'i' } }
          ]
        }
      : {};

    const clans = await Clan.find(queryFilter)
      .limit(20)
      .sort({ totalXP: -1 })
      .select('clanId name tag description level totalXP members isPublic logo leaderId')
      .lean();

    clanCache.set(cacheKey, clans, 30000);
    res.json(clans);
  } catch (error) {
    res.status(500).json({
      message: 'Error searching clans',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
};

export const joinClan = async (req, res) => {
  try {
    const { clanId } = req.body || {};
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.clanId) return res.status(400).json({ message: 'Already in a clan' });

    const clan = await Clan.findOne({ clanId });
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    // Check if already requested
    const existingRequest = clan.activeJoinRequests?.find(r => r.userId === userId);
    if (existingRequest) return res.status(400).json({ message: 'Join request already pending' });

    if (!clan.isPublic) {
      if (!clan.activeJoinRequests) clan.activeJoinRequests = [];
      clan.activeJoinRequests.push({ userId });
      await clan.save();
      clanCache.invalidateClan(clanId);
      return res.json({ message: 'Join request sent', requestSent: true });
    }

    clan.members.push({ userId, role: 'member', contribution: 0 });
    await clan.save();

    user.clanId = clanId;
    await user.save();

    clanCache.invalidateClan(clanId);
    evaluateAndAwardBadges(userId).catch(() => {});

    res.json({ message: 'Joined clan successfully', clan });
  } catch (error) {
    res.status(500).json({ message: 'Error joining clan', error: error.message });
  }
};

export const leaveClan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findOne({ userId });
    
    if (!user || !user.clanId) return res.status(400).json({ message: 'Not in a clan' });

    const targetClanId = user.clanId;
    const clan = await Clan.findOne({ clanId: targetClanId });
    if (clan) {
      const memberIndex = clan.members.findIndex(m => m.userId === userId);
      if (memberIndex !== -1) {
        const member = clan.members[memberIndex];
        if (member.role === 'leader') {
          if (clan.members.length === 1) {
            await Clan.deleteOne({ clanId: clan.clanId });
            user.clanId = null;
            await user.save();
            clanCache.invalidateClan(targetClanId);
            return res.json({ message: 'Clan dissolved' });
          } else {
            const newLeader = clan.members.find(m => m.userId !== userId);
            if (newLeader) {
              newLeader.role = 'leader';
              clan.leaderId = newLeader.userId;
            }
          }
        }
        clan.members.splice(memberIndex, 1);
        await clan.save();
      }
    }

    user.clanId = null;
    await user.save();

    clanCache.invalidateClan(targetClanId);
    
    res.json({ message: 'Left clan' });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving clan', error: error.message });
  }
};

export const getClanLeaderboard = async (req, res) => {
  try {
    const cacheKey = 'clan_leaderboard';
    const cached = clanCache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch all clans sorted by totalXP (limit to top 100 for performance)
    const clans = await Clan.find({})
      .sort({ totalXP: -1, level: -1 })
      .limit(100)
      .select('clanId name tag description level totalXP members leaderId isPublic logo')
      .lean();

    // Get all unique leader IDs
    const leaderIds = [...new Set(clans.map(clan => clan.leaderId).filter(Boolean))];
    
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
      memberCount: (clan.members || []).length,
      leaderName: leaderMap.get(clan.leaderId) || 'Unknown',
      rank: index + 1,
      isPublic: clan.isPublic,
      logo: clan.logo
    }));

    clanCache.set(cacheKey, enrichedClans, 30000);
    res.json(enrichedClans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
};

export const updateClan = async (req, res) => {
  try {
    const { clanId } = req.params;
    const { name, description, isPublic, settings, announcementBanner, logo } = req.body || {};
    const userId = req.user.userId;

    const clan = await Clan.findOne({ clanId });
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    const member = clan.members.find(m => m.userId === userId);
    const isLeader = member?.role === 'leader' || clan.leaderId === userId || req.user?.role === 'admin';
    if (!isLeader) {
      return res.status(403).json({ message: 'Only the leader can update clan settings' });
    }

    if (name) clan.name = name;
    if (description !== undefined) clan.description = description;
    if (isPublic !== undefined) clan.isPublic = isPublic;
    if (settings) clan.settings = { ...clan.settings, ...settings };
    if (logo !== undefined) {
      clan.logo = typeof logo === 'object' ? { ...clan.logo, ...logo } : logo;
    }
    if (announcementBanner !== undefined) {
      const rawText = typeof announcementBanner.text === 'string' ? announcementBanner.text.trim().substring(0, 500) : '';
      const rawUrl = typeof announcementBanner.url === 'string' ? announcementBanner.url.trim() : '';
      const rawButtonText = typeof announcementBanner.buttonText === 'string' ? announcementBanner.buttonText.trim().substring(0, 40) : '';
      let validatedUrl = '';
      if (rawUrl) {
        if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
          validatedUrl = rawUrl;
        } else {
          try {
            const parsed = new URL(rawUrl);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
              validatedUrl = rawUrl;
            }
          } catch {}
        }
      }
      clan.announcementBanner = {
        text: rawText,
        url: validatedUrl,
        buttonText: rawButtonText,
        updatedAt: new Date()
      };
    }

    await clan.save();
    clanCache.invalidateClan(clanId);
    res.json(clan);
  } catch (error) {
    res.status(500).json({ message: 'Error updating clan', error: error.message });
  }
};

export const inviteToClan = async (req, res) => {
  try {
    const { targetUserId, clanId } = req.body || {};
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

    if (!targetUser.clanInvites) targetUser.clanInvites = [];
    targetUser.clanInvites.push({
      clanId,
      clanName: clan.name,
      invitedBy: userId
    });

    await targetUser.save();

    // Dispatch Clan Invitation Email
    if (targetUser.email) {
      sendClanInviteEmail({
        email: targetUser.email,
        recipientName: targetUser.name || 'Champion',
        inviterName: req.user?.name || member.name || 'A Clan Officer',
        clanName: clan.name,
        clanTag: clan.tag
      }).catch(err => console.warn('⚠️ [ClanInvite] Email error:', err.message));
    }

    res.json({ message: 'Invitation sent' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending invitation', error: error.message });
  }
};

export const respondToClanInvite = async (req, res) => {
  try {
    const { clanId, accept } = req.body || {};
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const inviteIndex = (user.clanInvites || []).findIndex(inv => inv.clanId === clanId);
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
      clanCache.invalidateClan(clanId);
      evaluateAndAwardBadges(userId).catch(() => {});
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
    const { clanId, targetUserId, accept } = req.body || {};
    const userId = req.user.userId;

    const clan = await Clan.findOne({ clanId });
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    // Check Permissions
    const requester = clan.members.find(m => m.userId === userId);
    if (!requester || (requester.role !== 'leader' && requester.role !== 'elder')) {
      return res.status(403).json({ message: 'No permission' });
    }

    const requestIndex = (clan.activeJoinRequests || []).findIndex(r => r.userId === targetUserId);
    if (requestIndex === -1) return res.status(404).json({ message: 'Request not found' });

    if (accept) {
      const targetUser = await User.findOne({ userId: targetUserId });
      if (!targetUser) return res.status(404).json({ message: 'User not found' });
      
      if (targetUser.clanId) {
        clan.activeJoinRequests.splice(requestIndex, 1);
        await clan.save();
        clanCache.invalidateClan(clanId);
        return res.status(400).json({ message: 'User already in a clan' });
      }

      clan.members.push({ userId: targetUserId, role: 'member', contribution: 0 });
      targetUser.clanId = clanId;
      await targetUser.save();
      evaluateAndAwardBadges(targetUserId).catch(() => {});
    }

    clan.activeJoinRequests.splice(requestIndex, 1);
    await clan.save();
    clanCache.invalidateClan(clanId);

    res.json({ message: accept ? 'Request accepted' : 'Request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Error handling request', error: error.message });
  }
};

export const kickMember = async (req, res) => {
  try {
    const { clanId, targetUserId } = req.body || {};
    const userId = req.user.userId;

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

    const rolePower = {
      leader: 3,
      elder: 2,
      member: 1
    };

    if (rolePower[executor.role] <= rolePower[target.role]) {
      return res.status(403).json({ message: 'No permission to kick this member' });
    }

    const memberIndex = clan.members.findIndex(m => m.userId === targetUserId);
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'Member not found - may have already left' });
    }

    clan.members.splice(memberIndex, 1);
    await clan.save();

    await User.updateOne(
      { userId: targetUserId, clanId: clanId },
      { $set: { clanId: null } }
    );

    clanCache.invalidateClan(clanId);

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
    const { clanId, targetUserId, newRole } = req.body || {};
    const userId = req.user.userId;

    if (!['elder', 'member'].includes(newRole)) return res.status(400).json({ message: 'Invalid role' });

    const clan = await Clan.findOne({ clanId });
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    const actingMember = clan.members.find(m => m.userId === userId);
    const isLeader = actingMember?.role === 'leader' || clan.leaderId === userId;
    if (!isLeader) return res.status(403).json({ message: 'Only leader can change roles' });

    const target = clan.members.find(m => m.userId === targetUserId);
    if (!target) return res.status(404).json({ message: 'Member not found' });

    target.role = newRole;
    await clan.save();
    clanCache.invalidateClan(clanId);

    res.json({ message: 'Role updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating role', error: error.message });
  }
};

export const createClanAnnouncement = async (req, res) => {
  try {
    const { clanId } = req.params;
    const { content } = req.body || {};
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
      authorName: user?.name || 'Unknown',
      content,
      isPinned: false,
      createdAt: new Date()
    };

    if (!clan.announcements) clan.announcements = [];
    clan.announcements.unshift(newAnnouncement);
    
    if (clan.announcements.length > 50) {
      clan.announcements = clan.announcements.slice(0, 50);
    }

    await clan.save();
    clanCache.invalidateClan(clanId);
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
    clanCache.invalidateClan(clanId);
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
    
    clan.announcements.sort((a, b) => {
      if (a.isPinned === b.isPinned) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return a.isPinned ? -1 : 1;
    });

    await clan.save();
    clanCache.invalidateClan(clanId);
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling pin', error: error.message });
  }
};

// ==========================================
// REST Clan Chat Endpoints (Robust Fallback)
// ==========================================
export const getClanMessages = async (req, res) => {
  try {
    const { clanId } = req.params;
    const clan = await Clan.findOne({ clanId }).select('chatMessages members').lean();
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    const isMember = (clan.members || []).some(m => m.userId === req.user.userId);
    if (!isMember) {
      return res.status(403).json({ message: 'You must be a member to view clan chat' });
    }

    res.json(clan.chatMessages || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clan messages', error: error.message });
  }
};

export const sendClanMessage = async (req, res) => {
  try {
    const { clanId } = req.params;
    const { content } = req.body || {};
    const userId = req.user.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content cannot be empty' });
    }

    const clan = await Clan.findOne({ clanId });
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    const member = clan.members.find(m => m.userId === userId);
    if (!member) {
      return res.status(403).json({ message: 'You must be a member to chat' });
    }

    const user = await User.findOne({ userId }).select('name avatar equippedBadgeId badges').lean();
    const equippedBadge = user?.badges?.find(b => b.id === user?.equippedBadgeId);

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId: userId,
      senderName: user?.name || member.name || 'Clan Member',
      senderAvatar: user?.avatar || member.avatar || null,
      senderRole: member.role || 'member',
      senderBadge: equippedBadge ? {
        id: equippedBadge.id,
        name: equippedBadge.name,
        title: equippedBadge.title || equippedBadge.name,
        icon: equippedBadge.icon,
        rarity: equippedBadge.rarity || 'common'
      } : null,
      content: content.trim().substring(0, 500),
      createdAt: new Date()
    };

    if (!clan.chatMessages) clan.chatMessages = [];
    clan.chatMessages.push(message);
    if (clan.chatMessages.length > 100) {
      clan.chatMessages = clan.chatMessages.slice(-100);
    }

    await clan.save();
    clanCache.invalidateClan(clanId);

    const io = req.app?.get?.('io');
    if (io) {
      io.to(`clan_${clanId}`).emit('new_clan_message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error sending clan message', error: error.message });
  }
};

export const editClanMessage = async (req, res) => {
  try {
    const { clanId, messageId } = req.params;
    const { content } = req.body || {};
    const userId = req.user.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content cannot be empty' });
    }

    const clan = await Clan.findOne({ clanId });
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    const member = clan.members.find(m => m.userId === userId);
    const message = (clan.chatMessages || []).find(m => m.id === messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const isLeader = member?.role === 'leader' || clan.leaderId === userId;
    const isElder = member?.role === 'elder';
    const isSender = message.senderId === userId;

    if (!isSender && !isLeader && !isElder) {
      return res.status(403).json({ message: 'No permission to edit this message' });
    }

    message.content = content.trim().substring(0, 500);
    message.isEdited = true;
    message.updatedAt = new Date();

    await clan.save();
    clanCache.invalidateClan(clanId);

    const io = req.app?.get?.('io');
    if (io) {
      io.to(`clan_${clanId}`).emit('clan_message_edited', {
        messageId,
        newContent: message.content,
        isEdited: true,
        updatedAt: message.updatedAt
      });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error editing clan message', error: error.message });
  }
};

export const deleteClanMessage = async (req, res) => {
  try {
    const { clanId, messageId } = req.params;
    const userId = req.user.userId;

    const clan = await Clan.findOne({ clanId });
    if (!clan) return res.status(404).json({ message: 'Clan not found' });

    const member = clan.members.find(m => m.userId === userId);
    const messageIndex = (clan.chatMessages || []).findIndex(m => m.id === messageId);
    if (messageIndex === -1) return res.status(404).json({ message: 'Message not found' });

    const message = clan.chatMessages[messageIndex];
    const isLeader = member?.role === 'leader' || clan.leaderId === userId;
    const isElder = member?.role === 'elder';
    const isSender = message.senderId === userId;

    if (!isSender && !isLeader && !isElder) {
      return res.status(403).json({ message: 'No permission to delete this message' });
    }

    clan.chatMessages.splice(messageIndex, 1);
    await clan.save();
    clanCache.invalidateClan(clanId);

    const io = req.app?.get?.('io');
    if (io) {
      io.to(`clan_${clanId}`).emit('clan_message_deleted', { messageId });
    }

    res.json({ message: 'Message deleted successfully', messageId });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting clan message', error: error.message });
  }
};
