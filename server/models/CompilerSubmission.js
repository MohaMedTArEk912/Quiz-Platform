import mongoose from 'mongoose';

/**
 * CompilerSubmission Schema
 * Tracks user submissions for daily compiler challenges.
 * Stores the submitted code, AI evaluation score, and feedback.
 * 
 * @property {String} userId - User who submitted
 * @property {String} questionId - The compiler question answered
 * @property {String} submittedCode - User's submitted code
 * @property {Number} aiScore - Score from Groq AI evaluation (0-100)
 * @property {String} aiFeedback - Feedback text from AI explaining the score
 * @property {Boolean} passed - Whether submission passed (score >= 70)
 * @property {Date} challengeDate - The date of the daily challenge (midnight)
 * @property {Date} submittedAt - Actual submission timestamp
 */
const compilerSubmissionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  },
  questionId: {
    type: String,
    required: [true, 'Question ID is required'],
    index: true
  },
  submittedCode: {
    type: String,
    required: [true, 'Submitted code is required']
  },
  aiScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  aiFeedback: {
    type: String,
    default: ''
  },
  passed: {
    type: Boolean,
    default: false
  },
  challengeDate: {
    type: Date,
    required: true,
    index: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for checking user's daily submissions
compilerSubmissionSchema.index({ userId: 1, challengeDate: 1 });

// Compound index for question statistics
compilerSubmissionSchema.index({ questionId: 1, passed: 1 });

/**
 * Static method to check if user has already passed today's challenge.
 * @param {String} userId - User ID
 * @param {Date} challengeDate - The challenge date (should be midnight)
 * @returns {Promise<Boolean>} True if user has a passing submission
 */
compilerSubmissionSchema.statics.hasPassedToday = async function(userId, challengeDate) {
  const submission = await this.findOne({
    userId,
    challengeDate,
    passed: true
  }).lean();
  return !!submission;
};

/**
 * Static method to get user's submission history for a question.
 * @param {String} userId - User ID
 * @param {String} questionId - Question ID
 * @returns {Promise<Array>} Array of submissions
 */
compilerSubmissionSchema.statics.getUserSubmissions = async function(userId, questionId) {
  return this.find({ userId, questionId })
    .sort({ submittedAt: -1 })
    .lean();
};

/**
 * Static method to get question statistics.
 * @param {String} questionId - Question ID
 * @returns {Promise<Object>} Statistics object with total attempts and pass rate
 */
compilerSubmissionSchema.statics.getQuestionStats = async function(questionId) {
  const stats = await this.aggregate([
    { $match: { questionId } },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        passedAttempts: { $sum: { $cond: ['$passed', 1, 0] } },
        averageScore: { $avg: '$aiScore' }
      }
    }
  ]);

  if (stats.length === 0) {
    return { totalAttempts: 0, passedAttempts: 0, passRate: 0, averageScore: 0 };
  }

  return {
    totalAttempts: stats[0].totalAttempts,
    passedAttempts: stats[0].passedAttempts,
    passRate: stats[0].totalAttempts > 0 
      ? Math.round((stats[0].passedAttempts / stats[0].totalAttempts) * 100) 
      : 0,
    averageScore: Math.round(stats[0].averageScore || 0)
  };
};

export const CompilerSubmission = mongoose.model('CompilerSubmission', compilerSubmissionSchema);
