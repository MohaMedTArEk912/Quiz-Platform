import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import { createClan, getClan, searchClans, joinClan, leaveClan, getClanLeaderboard } from '../controllers/clanController.js';

const router = express.Router();

router.post('/create', verifyUser, createClan);
router.get('/search', verifyUser, searchClans); // Query param ?query=
router.get('/leaderboard', getClanLeaderboard); // Public endpoint - must be before /:clanId
router.get('/:clanId', verifyUser, getClan);
router.post('/join', verifyUser, joinClan);
router.post('/leave', verifyUser, leaveClan);

export default router;

