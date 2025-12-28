import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  attemptId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  quizId: { type: String, required: true },
  quizTitle: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeTaken: { type: Number, required: true },
  answers: { type: Object, required: true }, // Storing answers as loose Object
  reviewStatus: { type: String, enum: ['completed', 'pending', 'reviewed'], default: 'completed' },
  feedback: { type: Object, default: {} }, // Map of questionId/index to feedback
  completedAt: { type: Date, default: Date.now }
});

export const Attempt = mongoose.model('Attempt', attemptSchema);
