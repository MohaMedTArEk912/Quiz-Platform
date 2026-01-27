import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * CompilerQuestion Schema
 * Stores compiler/coding questions for daily challenges.
 * Admin uploads questions; system randomly selects one per day (no repeats within 7 days).
 * 
 * @property {String} questionId - Unique identifier for the question
 * @property {String} title - Question title (e.g., "Sum Two Numbers")
 * @property {String} description - Full problem statement/description
 * @property {String} referenceCode - The correct solution code for AI comparison
 * @property {String} language - Programming language (default: javascript)
 * @property {String} difficulty - Difficulty level: easy, medium, hard
 * @property {String} category - Category like 'algorithms', 'data-structures', 'basics'
 * @property {Array<String>} hints - Optional hints for the user
 * @property {Number} rewardCoins - Coins awarded on successful completion
 * @property {Number} rewardXP - XP awarded on successful completion
 * @property {Date} lastUsed - Last date this question was used (for weekly rotation)
 * @property {Boolean} isActive - Whether the question is available for selection
 * @property {Date} createdAt - Creation timestamp
 */
const compilerQuestionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    unique: true,
    default: () => `cq_${crypto.randomUUID().slice(0, 8)}`
  },
  title: {
    type: String,
    required: [true, 'Question title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Problem description is required'],
    trim: true
  },
  referenceCode: {
    type: String,
    required: [true, 'Reference code is required for AI evaluation']
  },
  language: {
    type: String,
    default: 'javascript',
    enum: ['javascript', 'python', 'java', 'cpp', 'typescript']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  category: {
    type: String,
    default: 'general',
    trim: true
  },
  hints: [{
    type: String,
    trim: true
  }],
  rewardCoins: {
    type: Number,
    default: 100,
    min: [0, 'Reward coins cannot be negative']
  },
  rewardXP: {
    type: Number,
    default: 150,
    min: [0, 'Reward XP cannot be negative']
  },
  lastUsed: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying of available questions
compilerQuestionSchema.index({ isActive: 1, lastUsed: 1 });
compilerQuestionSchema.index({ category: 1 });
compilerQuestionSchema.index({ difficulty: 1 });

/**
 * Static method to find a random question not used in the last 7 days.
 * @returns {Promise<CompilerQuestion|null>} A random eligible question or null
 */
compilerQuestionSchema.statics.findEligibleQuestion = async function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Find questions that are active and either never used or used more than 7 days ago
  const eligibleQuestions = await this.find({
    isActive: true,
    $or: [
      { lastUsed: null },
      { lastUsed: { $lt: sevenDaysAgo } }
    ]
  }).lean();

  if (eligibleQuestions.length === 0) {
    // Fallback: If all questions used recently, pick the oldest used one
    const oldestQuestion = await this.findOne({ isActive: true })
      .sort({ lastUsed: 1 })
      .lean();
    return oldestQuestion;
  }

  // Random selection from eligible questions
  const randomIndex = Math.floor(Math.random() * eligibleQuestions.length);
  return eligibleQuestions[randomIndex];
};

/**
 * Static method to mark a question as used today.
 * @param {String} questionId - The question ID to mark as used
 * @returns {Promise<CompilerQuestion>} Updated question
 */
compilerQuestionSchema.statics.markAsUsed = async function(questionId) {
  return this.findOneAndUpdate(
    { questionId },
    { lastUsed: new Date() },
    { new: true }
  );
};

export const CompilerQuestion = mongoose.model('CompilerQuestion', compilerQuestionSchema);
