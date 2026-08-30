import { TrackRequest } from '../models/TrackRequest.js';
import { User } from '../models/User.js';
import { Subject } from '../models/Subject.js';
import { createAndSendNotification } from './notificationController.js';
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
      adminNote: '',
      reRequestNote: '',
      reRequestCount: 0,
      status: 'pending',
      requestedAt: new Date()
    });

    await newRequest.save();

    // Notify admins via persistent notification and socket
    await createAndSendNotification(req.app, {
      recipientId: 'all',
      senderId: userId,
      senderName: user.name || userId,
      type: 're_request',
      title: 'New Track Access Request',
      message: `${user.name || userId} submitted a request to unlock "${subject.title}".`,
      note: newRequest.reason,
      link: '/admin',
      metadata: { requestId: newRequest.requestId, subjectId: subjectIdStr, userId }
    });

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
 * User re-submits a previously rejected track request with an explanatory note
 */
export const reRequestTrackAccess = async (req, res) => {
  try {
    const { id } = req.params; // requestId or subjectId
    const { reason, reRequestNote } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let request = await TrackRequest.findOne({
      $or: [
        { requestId: id, userId },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id, userId }, { subjectId: id, userId }] : [{ subjectId: id, userId }])
      ]
    }).sort({ requestedAt: -1 });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Track request record not found' });
    }

    const noteText = (reRequestNote || reason || '').trim();
    if (!noteText) {
      return res.status(400).json({ success: false, message: 'Please provide a note explaining your re-request.' });
    }

    request.status = 'pending';
    request.reRequestNote = noteText;
    request.reason = (reason || request.reason || noteText).trim();
    request.reRequestCount = (request.reRequestCount || 0) + 1;
    request.requestedAt = new Date();
    request.reviewedAt = undefined;
    request.reviewedBy = undefined;

    await request.save();

    // Create notification for admins
    await createAndSendNotification(req.app, {
      recipientId: 'all',
      senderId: userId,
      senderName: request.userName || userId,
      type: 're_request',
      title: 'Track Request Re-submitted',
      message: `${request.userName} re-submitted their access request for "${request.subjectTitle}".`,
      note: noteText,
      link: '/admin',
      metadata: { requestId: request.requestId, subjectId: request.subjectId, userId }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('track_request_created', {
        requestId: request.requestId,
        userId: request.userId,
        userName: request.userName,
        subjectTitle: request.subjectTitle,
        requestedAt: request.requestedAt,
        isReRequest: true,
        reRequestNote: noteText
      });
    }

    res.json({
      success: true,
      message: `Re-request submitted with note. The administrator has been notified.`,
      request
    });
  } catch (error) {
    console.error('Error re-requesting track access:', error);
    res.status(500).json({ success: false, message: 'Failed to re-submit request', error: error.message });
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
 * Admin: Approve track request (with optional admin note)
 */
export const approveTrackRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const adminId = req.user?.userId;

    const request = await TrackRequest.findOne({
      $or: [{ requestId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Track request not found' });
    }

    // Update request status and admin note
    request.status = 'approved';
    request.adminNote = (adminNote || '').trim();
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

      // Create persistent notification for student
      await createAndSendNotification(req.app, {
        recipientId: request.userId,
        senderId: adminId || 'admin',
        senderName: req.user?.name || 'Administrator',
        type: 'request_approved',
        title: 'Track Access Granted! 🎉',
        message: `Your request for "${request.subjectTitle}" has been approved! All modules and quizzes in this road are now accessible.`,
        note: request.adminNote,
        link: '/tracks',
        metadata: { subjectId: request.subjectId, requestId: request.requestId }
      });

      // Emit socket event to user if online
      const io = req.app.get('io');
      if (io) {
        io.to(request.userId).emit('track_request_approved', {
          requestId: request.requestId,
          subjectId: request.subjectId,
          subjectTitle: request.subjectTitle,
          adminNote: request.adminNote
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
 * Admin: Reject track request (with feedback / note)
 */
export const rejectTrackRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const adminId = req.user?.userId;

    const request = await TrackRequest.findOne({
      $or: [{ requestId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Track request not found' });
    }

    request.status = 'rejected';
    request.adminNote = (adminNote || '').trim();
    request.reviewedAt = new Date();
    request.reviewedBy = adminId;
    await request.save();

    // Create persistent notification for student with the admin's note
    await createAndSendNotification(req.app, {
      recipientId: request.userId,
      senderId: adminId || 'admin',
      senderName: req.user?.name || 'Administrator',
      type: 'request_rejected',
      title: 'Track Request Declined',
      message: `Your request for "${request.subjectTitle}" was not approved by the administrator.`,
      note: request.adminNote || 'You can review and re-request with additional details.',
      link: '/tracks',
      metadata: { subjectId: request.subjectId, requestId: request.requestId }
    });

    // Emit socket event to user
    const io = req.app.get('io');
    if (io) {
      io.to(request.userId).emit('track_request_rejected', {
        requestId: request.requestId,
        subjectId: request.subjectId,
        subjectTitle: request.subjectTitle,
        adminNote: request.adminNote
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
