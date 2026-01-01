import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import { createClan, getClan, searchClans, joinClan, leaveClan, getClanLeaderboard, updateClan, inviteToClan, respondToClanInvite, handleJoinRequest, kickMember, updateMemberRole } from '../controllers/clanController.js';

const router = express.Router();

router.post('/create', verifyUser, createClan);
router.get('/search', verifyUser, searchClans); // Query param ?query=
router.get('/leaderboard', getClanLeaderboard); // Public endpoint - must be before /:clanId
router.get('/:clanId', verifyUser, getClan);
router.post('/join', verifyUser, joinClan);
router.post('/leave', verifyUser, leaveClan);
router.put('/:clanId', verifyUser, updateClan);
router.post('/invite', verifyUser, inviteToClan);
router.post('/respond-invite', verifyUser, respondToClanInvite);
router.post('/join-request', verifyUser, handleJoinRequest);
router.post('/kick', verifyUser, kickMember);
router.put('/role', verifyUser, updateMemberRole);

export default router;

