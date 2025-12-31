import { Attempt } from '../models/Attempt.js';
import { User } from '../models/User.js';
import { Quiz } from '../models/Quiz.js';

export const saveAttempt = async (req, res) => {
  try {
    const attemptData = req.body;
    const { userId, powerUpsUsed = [] } = attemptData;

    // Validate power-ups against user inventory if user exists
    const user = await User.findOne({ userId });
    if (user && powerUpsUsed.length > 0) {
      const counts = new Map();
      (user.powerUps || []).forEach(p => counts.set(p.type, p.quantity || 0));

      for (const type of powerUpsUsed) {
        const remain = counts.get(type) || 0;
        if (remain <= 0) {
          return res.status(400).json({ message: `Insufficient power-up: ${type}` });
        }
        counts.set(type, remain - 1);
      }

      // persist decremented counts
      user.powerUps = (user.powerUps || []).map(p => ({
        ...p,
        quantity: counts.get(p.type) ?? p.quantity
      }));
      await user.save();
    }

    const newAttempt = new Attempt(attemptData);
    await newAttempt.save();

    res.status(201).json(newAttempt);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPendingReviews = async (req, res) => {
    try {
        const pendingAttempts = await Attempt.find({ reviewStatus: 'pending' }).lean();
        res.json(pendingAttempts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending reviews', error: error.message });
    }
};

export const submitReview = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { feedback, scoreAdjustment } = req.body;

        const attempt = await Attempt.findOne({ attemptId });
        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        attempt.feedback = feedback;
        attempt.reviewStatus = 'reviewed';
        
        let newScore = 0;
        if (scoreAdjustment !== undefined) {
             attempt.score = attempt.score + scoreAdjustment; // Simple adjustment
        } else if (req.body.finalScore !== undefined) {
            attempt.score = req.body.finalScore;
        }

        // Recalculate percentage
        const quiz = await Quiz.findOne({ id: attempt.quizId });
        if (quiz) {
             const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
             attempt.percentage = Math.round((attempt.score / totalPoints) * 100);
             attempt.passed = attempt.percentage >= quiz.passingScore;
        }
        
        await attempt.save();
        res.json(attempt);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting review', error: error.message });
    }
};
