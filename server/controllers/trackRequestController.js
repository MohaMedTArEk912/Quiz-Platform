import { TrackRequest } from '../models/TrackRequest.js';
import { User } from '../models/User.js';
import { Subject } from '../models/Subject.js';
import crypto from 'crypto';

/**
 * Select initial track for a user upon first login / onboarding
 */
export const selectInitialTrack = async (req, res) => {
  try {
    const { subjectId } = req.body;
    const userId = req.user?.userId;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'Subject/Track ID is required' });
    }

    // Verify subject exists
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Selected track/subject does not exist' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const subjectIdStr = subject._id.toString();

    // Set primary track and ensure it's in unlockedTracks
    user.primaryTrackId = subjectIdStr;
    const currentUnlocked = new Set((user.unlockedTracks || []).map(id => id.toString()));
    currentUnlocked.add(subjectIdStr);
    user.unlockedTracks = Array.from(currentUnlocked);

    await user.save();

    res.json({
      success: true,
      message: `Enrolled in ${subject.title} successfully!`,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        primaryTrackId: user.primaryTrackId,
        unlockedTracks: user.unlockedTracks,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error selecting initial track:', error);
    res.status(500).json({ success: false, message: 'Failed to select track', error: error.message });
  }
};

/**
 * User submits request to unlock an additional track
 */
export const createTrackRequest = async (req, res) => {
  try {
    const { subjectId, reason } = req.body;
    const userId = req.user?.userId;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'Subject ID is required' });
    }

    // Fetch user details
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch subject details
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Track/Subject not found' });
    }

    const subjectIdStr = subject._id.toString();

    // Check if user already has access to this track
    const userUnlocked = (user.unlockedTracks || []).map(id => id.toString());
    if (user.primaryTrackId === subjectIdStr || userUnlocked.includes(subjectIdStr)) {
      return res.status(400).json({ success: false, message: 'You already have access to this track' });
    }

    // Check for existing pending request
    const existingPending = await TrackRequest.findOne({
      userId,
      subjectId: subjectIdStr,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this track. Please wait for administrator approval.'
      });
    }

    // Create new request
    const newRequest = new TrackRequest({
      requestId: `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId,
      userName: user.name || userId,
      userEmail: user.email || '',
      subjectId: subjectIdStr,
      subjectTitle: subject.title,
      reason: (reason || '').trim(),
      status: 'pending',
      requestedAt: new Date()
    });

    await newRequest.save();

    // Emit real-time notification to admins if socket io is active
    const io = req.app.get('io');
    if (io) {
      io.emit('track_request_created', {
        requestId: newRequest.requestId,
        userId: newRequest.userId,
        userName: newRequest.userName,
        subjectTitle: newRequest.subjectTitle,
        requestedAt: newRequest.requestedAt
      });
    }

    res.status(201).json({
      success: true,
      message: 'Access request submitted successfully to the administrator.',
      request: newRequest
    });
  } catch (error) {
    console.error('Error creating track request:', error);
    res.status(500).json({ success: false, message: 'Failed to create request', error: error.message });
  }
};

/**
 * Get current user's track requests
 */
export const getUserRequests = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const requests = await TrackRequest.find({ userId }).sort({ requestedAt: -1 }).lean();
    res.json({ success: true, requests: requests || [] });
  } catch (error) {
    console.error('Error fetching user track requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests', error: error.message });
  }
};

/**
 * Admin: Get all track requests
 */
export const getAllTrackRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const requests = await TrackRequest.find(filter).sort({ requestedAt: -1 }).lean();
    res.json({ success: true, requests: requests || [] });
  } catch (error) {
    console.error('Error fetching all track requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests', error: error.message });
  }
};

/**
 * Admin: Approve track request
 */
export const approveTrackRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;

    const request = await TrackRequest.findOne({
      $or: [{ requestId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Track request not found' });
    }

    // Update request status
    request.status = 'approved';
    request.reviewedAt = new Date();
    request.reviewedBy = adminId;
    await request.save();

    // Grant access to target user
    const targetUser = await User.findOne({ userId: request.userId });
    if (targetUser) {
      const unlockedSet = new Set((targetUser.unlockedTracks || []).map(t => t.toString()));
      unlockedSet.add(request.subjectId.toString());
      targetUser.unlockedTracks = Array.from(unlockedSet);
      if (!targetUser.primaryTrackId) {
        targetUser.primaryTrackId = request.subjectId.toString();
      }
      await targetUser.save();

      // Emit socket event to user if online
      const io = req.app.get('io');
      if (io) {
        io.to(request.userId).emit('track_request_approved', {
          requestId: request.requestId,
          subjectId: request.subjectId,
          subjectTitle: request.subjectTitle
        });
      }
    }

    res.json({
      success: true,
      message: `Request approved. Access to ${request.subjectTitle} granted to ${request.userName}.`,
      request
    });
  } catch (error) {
    console.error('Error approving track request:', error);
    res.status(500).json({ success: false, message: 'Failed to approve request', error: error.message });
  }
};

/**
 * Admin: Reject track request
 */
export const rejectTrackRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;

    const request = await TrackRequest.findOne({
      $or: [{ requestId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Track request not found' });
    }

    request.status = 'rejected';
    request.reviewedAt = new Date();
    request.reviewedBy = adminId;
    await request.save();

    // Emit socket event to user
    const io = req.app.get('io');
    if (io) {
      io.to(request.userId).emit('track_request_rejected', {
        requestId: request.requestId,
        subjectId: request.subjectId,
        subjectTitle: request.subjectTitle
      });
    }

    res.json({
      success: true,
      message: `Request for ${request.subjectTitle} has been rejected.`,
      request
    });
  } catch (error) {
    console.error('Error rejecting track request:', error);
    res.status(500).json({ success: false, message: 'Failed to reject request', error: error.message });
  }
};

/**
 * Admin: Directly update user's unlocked tracks
 */
export const updateUserUnlockedTracks = async (req, res) => {
  try {
    const { userId } = req.params;
    const { unlockedTracks, primaryTrackId } = req.body;

    if (!Array.isArray(unlockedTracks)) {
      return res.status(400).json({ success: false, message: 'unlockedTracks must be an array of IDs' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.unlockedTracks = unlockedTracks.map(id => id.toString());
    if (primaryTrackId !== undefined) {
      user.primaryTrackId = primaryTrackId;
    } else if (!user.primaryTrackId && user.unlockedTracks.length > 0) {
      user.primaryTrackId = user.unlockedTracks[0];
    }

    await user.save();

    // Notify user via socket
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('tracks_updated', {
        unlockedTracks: user.unlockedTracks,
        primaryTrackId: user.primaryTrackId
      });
    }

    res.json({
      success: true,
      message: `Track permissions updated for ${user.name || user.userId}`,
      user: {
        userId: user.userId,
        unlockedTracks: user.unlockedTracks,
        primaryTrackId: user.primaryTrackId
      }
    });
  } catch (error) {
    console.error('Error updating user unlocked tracks:', error);
    res.status(500).json({ success: false, message: 'Failed to update unlocked tracks', error: error.message });
  }
};
