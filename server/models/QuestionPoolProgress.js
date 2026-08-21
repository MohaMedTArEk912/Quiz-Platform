import mongoose from 'mongoose';

const questionPoolProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  quizId: { type: String, required: true, index: true },
  seenQuestionIds: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Array of question IDs completed by the user
  completedCycles: { type: Number, default: 0 }, // How many times the user has completed 100% of the pool
  lastAttemptAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Ensure fast lookup and unique progress per user + quiz
questionPoolProgressSchema.index({ userId: 1, quizId: 1 }, { unique: true });

export const QuestionPoolProgress = mongoose.model('QuestionPoolProgress', questionPoolProgressSchema);
