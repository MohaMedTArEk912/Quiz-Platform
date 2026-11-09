import express from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import { 
  createClan, 
  getClan, 
  searchClans, 
  joinClan, 
  leaveClan, 
  getClanLeaderboard, 
  updateClan, 
  inviteToClan, 
  respondToClanInvite, 
  handleJoinRequest, 
  kickMember, 
  updateMemberRole, 
  createClanAnnouncement, 
  deleteClanAnnouncement, 
  pinClanAnnouncement,
  getClanMessages,
  sendClanMessage,
  editClanMessage,
  deleteClanMessage
} from '../controllers/clanController.js';

const router = express.Router();

// ===== STATIC ROUTES FIRST (before parameterized routes) =====
router.post('/create', verifyUser, createClan);
router.get('/search', verifyUser, searchClans); // Query param ?query=
router.get('/leaderboard', getClanLeaderboard); // Public endpoint
router.post('/join', verifyUser, joinClan);
router.post('/leave', verifyUser, leaveClan);
router.post('/invite', verifyUser, inviteToClan);
router.post('/respond-invite', verifyUser, respondToClanInvite);
router.post('/join-request', verifyUser, handleJoinRequest);
router.post('/kick', verifyUser, kickMember);
router.put('/role', verifyUser, updateMemberRole);

// ===== PARAMETERIZED ROUTES LAST =====
router.get('/:clanId', verifyUser, getClan);
router.put('/:clanId', verifyUser, updateClan);
router.post('/:clanId/announcements', verifyUser, createClanAnnouncement);
router.delete('/:clanId/announcements/:announcementId', verifyUser, deleteClanAnnouncement);
router.put('/:clanId/announcements/:announcementId/pin', verifyUser, pinClanAnnouncement);

// Clan Chat REST Endpoints
router.get('/:clanId/messages', verifyUser, getClanMessages);
router.post('/:clanId/messages', verifyUser, sendClanMessage);
router.put('/:clanId/messages/:messageId', verifyUser, editClanMessage);
router.delete('/:clanId/messages/:messageId', verifyUser, deleteClanMessage);

export default router;
