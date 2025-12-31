import mongoose from 'mongoose';

const dailyChallengeSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true }, // Normalized to midnight UTC or local
  title: { type: String, required: true },
  description: { type: String, required: true },
  quizId: { type: String }, // Optional: link to a specific quiz
  criteria: {
    type: { type: String, enum: ['complete_quiz', 'min_score', 'speed_run'], default: 'complete_quiz' },
    threshold: { type: Number, default: 1 } // e.g. score 80, or time < 60s
  },
  rewardCoins: { type: Number, default: 50 },
  rewardXP: { type: Number, default: 100 },
  createdAt: { type: Date, default: Date.now }
});

export const DailyChallenge = mongoose.model('DailyChallenge', dailyChallengeSchema);
