import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyUser, getNotifications);
router.get('/unread-count', verifyUser, getUnreadCount);
router.put('/read-all', verifyUser, markAllAsRead);
router.put('/:id/read', verifyUser, markAsRead);
router.delete('/:id', verifyUser, deleteNotification);

export default router;
