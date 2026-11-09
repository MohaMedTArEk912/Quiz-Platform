import mongoose from 'mongoose';
import crypto from 'crypto';

const newsletterSubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
  },
  userId: {
    type: String,
    default: null,
    trim: true
  },
  name: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed'],
    default: 'active',
    index: true
  },
  source: {
    type: String,
    default: 'footer_weekly_challenges'
  },
  preferences: {
    weeklyChallenges: { type: Boolean, default: true },
    learningTracks: { type: Boolean, default: true },
    dailyChallenges: { type: Boolean, default: true },
    newQuizzes: { type: Boolean, default: true }
  },
  unsubscribeToken: {
    type: String,
    default: () => crypto.randomBytes(24).toString('hex'),
    index: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  lastNotifiedAt: {
    type: Date,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for queries
newsletterSubscriberSchema.index({ status: 1, 'preferences.weeklyChallenges': 1 });

export const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
export default NewsletterSubscriber;
