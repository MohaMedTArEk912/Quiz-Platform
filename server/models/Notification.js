import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true, index: true },
  recipientId: { type: String, required: true, index: true }, // userId or 'all' for broadcasts
  senderId: { type: String, default: 'system' },
  senderName: { type: String, default: 'System' },
  type: {
    type: String,
    enum: ['new_quiz', 'request_approved', 'request_rejected', 're_request', 'system', 'challenge', 'badge'],
    default: 'system',
    index: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  note: { type: String, default: '' }, // Admin feedback / Student note
  link: { type: String, default: '' }, // Navigation path, e.g. /quizzes or /tracks
  metadata: { type: Object, default: {} }, // e.g. { quizId, requestId, subjectId }
  readBy: { type: [String], default: [] }, // userIds who have read this notification
  isRead: { type: Boolean, default: false }, // for direct 1-to-1 notifications
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

notificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
