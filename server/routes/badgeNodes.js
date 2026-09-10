import express from 'express';
import {
  createBadgeNode,
  getAllBadgeNodes,
  getBadgeNode,
  updateBadgeNode,
  deleteBadgeNode,
  checkBadgeUnlock,
  manuallyUnlockBadge
} from '../controllers/badgeNodeController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Badge node CRUD (Public reads, Admin mutations)
router.get('/', getAllBadgeNodes);
router.get('/:badgeId', getBadgeNode);
router.post('/', verifyUser, verifyAdmin, createBadgeNode);
router.put('/:badgeId', verifyUser, verifyAdmin, updateBadgeNode);
router.delete('/:badgeId', verifyUser, verifyAdmin, deleteBadgeNode);

// Badge unlocking
router.get('/check/:userId/:badgeId', verifyUser, checkBadgeUnlock);
router.post('/unlock/:userId/:badgeId', verifyUser, verifyAdmin, manuallyUnlockBadge);

export default router;
