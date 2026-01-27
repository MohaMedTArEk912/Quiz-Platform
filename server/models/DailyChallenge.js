import mongoose from 'mongoose';

/**
 * DailyChallenge Schema (Updated for Compiler Questions)
 * Links a specific date to a compiler question.
 * Auto-selection creates entries; admin can also schedule specific questions.
 * 
 * @property {Date} date - The challenge date (normalized to midnight)
 * @property {String} compilerQuestionId - Reference to the compiler question
 * @property {Number} rewardCoins - Override coins (defaults to question's reward)
 * @property {Number} rewardXP - Override XP (defaults to question's reward)
 * @property {String} rewardBadgeId - Optional badge to award on completion
 * @property {String} rewardItemId - Optional item to award on completion
 * @property {Date} createdAt - When this challenge was scheduled
 */
const dailyChallengeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  compilerQuestionId: {
    type: String,
    required: [true, 'Compiler question ID is required']
  },
  // Optional reward overrides (if not set, use question defaults)
  rewardCoins: { type: Number },
  rewardXP: { type: Number },
  rewardBadgeId: { type: String },
  rewardItemId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient date lookups
dailyChallengeSchema.index({ date: 1 });

export const DailyChallenge = mongoose.model('DailyChallenge', dailyChallengeSchema);
