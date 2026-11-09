import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { resolveJwtSecret } from '../utils/jwtSecret.js';
import {
  subscribe,
  unsubscribe,
  getSubscriptionStatus,
  getSubscribers,
  broadcastChallengeDrop
} from '../controllers/newsletterController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rate limiter to prevent bot spam on subscription
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 subscriptions per 15 minutes
  message: {
    success: false,
    message: 'Too many subscription attempts from this IP. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

// Optional auth helper to link subscription to logged-in user if available
const extractOptionalUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, resolveJwtSecret());
      if (decoded?.userId) {
        req.user = { id: decoded.userId, userId: decoded.userId };
      }
    }
  } catch {
    // Ignore invalid/missing token
  }
  next();
};

// Public Routes
router.get('/status', extractOptionalUser, getSubscriptionStatus);
router.post('/subscribe', subscribeLimiter, extractOptionalUser, subscribe);
router.get('/unsubscribe', unsubscribe);
router.post('/unsubscribe', unsubscribe);

// Admin Protected Routes
router.get('/subscribers', verifyAdmin, getSubscribers);
router.post('/broadcast', verifyAdmin, broadcastChallengeDrop);

export default router;
