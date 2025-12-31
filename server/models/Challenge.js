import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  score: Number,
  percentage: Number,
  timeTaken: Number,
  completedAt: { type: Date, default: Date.now }
}, { _id: false });

const challengeSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  quizId: { type: String, required: true },
  fromId: { type: String, required: true },
  toId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  fromResult: { type: resultSchema, default: null },
  toResult: { type: resultSchema, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Helpful indexes for lookups
challengeSchema.index({ fromId: 1 });
challengeSchema.index({ toId: 1 });
challengeSchema.index({ status: 1, createdAt: -1 });

export const Challenge = mongoose.model('Challenge', challengeSchema);
