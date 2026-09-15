import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { resolveJwtSecret } from '../utils/jwtSecret.js';
import { createSupportTicket, getUserTickets } from '../controllers/supportController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict rate limiter to prevent spam or email flooding
const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 support tickets per 15 mins
  message: {
    success: false,
    message: 'Too many support requests submitted from this network. Please wait a few minutes or email mohaamedtariq12@gmail.com directly.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Optional authentication: extracts user if token provided, but doesn't block guests
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
    // Ignore invalid/expired tokens for public support form
  }
  next();
};

// POST /api/support
router.post('/', supportLimiter, extractOptionalUser, createSupportTicket);

// GET /api/support/my-tickets (Requires login)
router.get('/my-tickets', verifyUser, getUserTickets);

export default router;
