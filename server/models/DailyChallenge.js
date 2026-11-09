import mongoose from 'mongoose';

/**
 * DailyChallenge Tier Schema
 * Represents one difficulty tier (easy, medium, hard) of a daily challenge.
 */
const dailyChallengeTierSchema = new mongoose.Schema({
  compilerQuestionId: {
    type: String,
    required: [true, 'Compiler question ID is required for tier']
  },
  rewardCoins: { type: Number, default: 75 },
  rewardXP: { type: Number, default: 100 },
  rewardBadgeId: { type: String, default: null },
  rewardItemId: { type: String, default: null },
  giftLabel: { type: String, default: '' } // e.g. "Bronze Loot Box", "Silver Chest", "Gold Dragon Relic"
}, { _id: false });

/**
 * DailyChallenge Schema (Multi-Tier & Backwards Compatible)
 * Links a specific date to algorithmic challenges across 3 difficulty tiers (Easy, Medium, Hard).
 * Users can solve and claim rewards for all three tiers.
 */
const dailyChallengeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  // Primary / fallback question ID for backwards compatibility
  compilerQuestionId: {
    type: String,
    default: null
  },
  // 3 Distinct Difficulty Tiers (Easy, Medium, Hard)
  tiers: {
    easy: { type: dailyChallengeTierSchema, default: null },
    medium: { type: dailyChallengeTierSchema, default: null },
    hard: { type: dailyChallengeTierSchema, default: null }
  },
  // Optional reward overrides (backwards compatibility)
  rewardCoins: { type: Number },
  rewardXP: { type: Number },
  rewardBadgeId: { type: String },
  rewardItemId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Middleware: ensure compilerQuestionId defaults to medium or easy question if tiers exist
dailyChallengeSchema.pre('save', function (next) {
  if (!this.compilerQuestionId) {
    if (this.tiers?.medium?.compilerQuestionId) {
      this.compilerQuestionId = this.tiers.medium.compilerQuestionId;
    } else if (this.tiers?.easy?.compilerQuestionId) {
      this.compilerQuestionId = this.tiers.easy.compilerQuestionId;
    } else if (this.tiers?.hard?.compilerQuestionId) {
      this.compilerQuestionId = this.tiers.hard.compilerQuestionId;
    }
  }
  if (typeof next === 'function') {
    next();
  }
});

export const DailyChallenge = mongoose.model('DailyChallenge', dailyChallengeSchema);
export default DailyChallenge;
