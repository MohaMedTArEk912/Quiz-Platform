import { Challenge } from '../models/Challenge.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';
import crypto from 'crypto';

export const createChallenge = async (req, res) => {
  try {
    const { toId, quizId } = req.body;
    if (!toId || !quizId) {
      return res.status(400).json({ message: 'toId and quizId are required' });
    }
    if (toId === req.user.userId) {
      return res.status(400).json({ message: 'Cannot challenge yourself' });
    }

    const quiz = await Quiz.findOne({ id: quizId }).lean();
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const token = crypto.randomBytes(12).toString('hex');
    const challenge = new Challenge({
      token,
      quizId,
      fromId: req.user.userId,
      toId,
      status: 'pending'
    });
    await challenge.save();

    res.status(201).json(challenge);
  } catch (error) {
    res.status(500).json({ message: 'Error creating challenge', error: error.message });
  }
};

export const getChallengeByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const challenge = await Challenge.findOne({ token }).lean();
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const quiz = await Quiz.findOne({ id: challenge.quizId }).select('id title description icon timeLimit').lean();
    const fromUser = await User.findOne({ userId: challenge.fromId }).select('userId name').lean();
    const toUser = await User.findOne({ userId: challenge.toId }).select('userId name').lean();

    res.json({
      ...challenge,
      quiz,
      fromUser,
      toUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading challenge', error: error.message });
  }
};

export const submitChallengeResult = async (req, res) => {
  try {
    const { token } = req.params;
    const { score, percentage, timeTaken } = req.body;
    const challenge = await Challenge.findOne({ token });
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (![challenge.fromId, challenge.toId].includes(req.user.userId)) {
      return res.status(403).json({ message: 'Not a participant in this challenge' });
    }

    const resultPayload = { score, percentage, timeTaken, completedAt: new Date() };

    if (req.user.userId === challenge.fromId) {
      challenge.fromResult = resultPayload;
    } else {
      challenge.toResult = resultPayload;
    }

    challenge.status = challenge.fromResult && challenge.toResult ? 'completed' : 'pending';

    await challenge.save();
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting challenge result', error: error.message });
  }
};

export const listChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      $or: [{ fromId: req.user.userId }, { toId: req.user.userId }]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching challenges', error: error.message });
  }
};
