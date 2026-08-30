import express from 'express';
import {
  selectInitialTrack,
  createTrackRequest,
  getUserRequests,
  getAllTrackRequests,
  approveTrackRequest,
  rejectTrackRequest,
  updateUserUnlockedTracks,
  reRequestTrackAccess
} from '../controllers/trackRequestController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// User endpoints
router.post('/select-initial', verifyUser, selectInitialTrack);
router.post('/', verifyUser, createTrackRequest);
router.post('/:id/re-request', verifyUser, reRequestTrackAccess);
router.get('/my-requests', verifyUser, getUserRequests);

// Admin endpoints
router.get('/', verifyUser, verifyAdmin, getAllTrackRequests);
router.put('/:id/approve', verifyUser, verifyAdmin, approveTrackRequest);
router.put('/:id/reject', verifyUser, verifyAdmin, rejectTrackRequest);
router.put('/users/:userId/tracks', verifyUser, verifyAdmin, updateUserUnlockedTracks);

export default router;
