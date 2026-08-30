import { Notification } from '../models/Notification.js';
import crypto from 'crypto';

/**
 * Helper to create a notification in DB and emit via socket io if available
 */
export const createAndSendNotification = async (appOrIo, data) => {
  try {
    const notificationId = `notif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newNotification = new Notification({
      notificationId,
      recipientId: data.recipientId || 'all',
      senderId: data.senderId || 'system',
      senderName: data.senderName || 'System',
      type: data.type || 'system',
      title: data.title,
      message: data.message,
      note: data.note || '',
      link: data.link || '',
      metadata: data.metadata || {},
      readBy: [],
      isRead: false,
      createdAt: new Date()
    });

    await newNotification.save();

    // Socket IO broadcast or direct room notification
    let io = null;
    if (appOrIo) {
      if (typeof appOrIo.get === 'function') {
        io = appOrIo.get('io');
      } else if (typeof appOrIo.emit === 'function') {
        io = appOrIo;
      }
    }

    if (io) {
      const payload = newNotification.toObject();
      if (newNotification.recipientId === 'all') {
        io.emit('new_notification', payload);
      } else {
        io.to(newNotification.recipientId).emit('new_notification', payload);
      }
    }

    return newNotification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
};

/**
 * GET /api/notifications
 * Get notifications for current user (personal + broadcast 'all')
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit, 10) || 50;

    const notifications = await Notification.find({
      $or: [
        { recipientId: userId },
        { recipientId: 'all' }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Map isRead for the calling user
    const formatted = (notifications || []).map(notif => {
      const isReadForUser = notif.recipientId === 'all'
        ? (Array.isArray(notif.readBy) && notif.readBy.includes(userId))
        : (notif.isRead || (Array.isArray(notif.readBy) && notif.readBy.includes(userId)));

      return {
        ...notif,
        isRead: Boolean(isReadForUser)
      };
    });

    res.json({ success: true, notifications: formatted });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
  }
};

/**
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const unreadCount = await Notification.countDocuments({
      $or: [
        { recipientId: userId, isRead: false, readBy: { $ne: userId } },
        { recipientId: 'all', readBy: { $ne: userId } }
      ]
    });

    res.json({ success: true, count: unreadCount });
  } catch (error) {
    console.error('❌ Error getting unread notification count:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count', error: error.message });
  }
};

/**
 * PUT /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notification = await Notification.findOne({
      $or: [{ notificationId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.recipientId === userId) {
      notification.isRead = true;
    }

    if (!notification.readBy) {
      notification.readBy = [];
    }
    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
    }

    await notification.save();

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification', error: error.message });
  }
};

/**
 * PUT /api/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Update direct notifications
    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true }, $addToSet: { readBy: userId } }
    );

    // Update broadcast notifications
    await Notification.updateMany(
      { recipientId: 'all', readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Failed to update notifications', error: error.message });
  }
};

/**
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notification = await Notification.findOne({
      $or: [{ notificationId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])]
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Only recipient or admin can delete
    if (notification.recipientId !== userId && req.user?.role !== 'admin' && notification.recipientId !== 'all') {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    await notification.deleteOne();

    res.json({ success: true, message: 'Notification removed' });
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification', error: error.message });
  }
};
