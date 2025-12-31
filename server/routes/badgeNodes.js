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

const router = express.Router();

// Badge node CRUD
router.post('/', createBadgeNode);
router.get('/', getAllBadgeNodes);
router.get('/:badgeId', getBadgeNode);
router.put('/:badgeId', updateBadgeNode);
router.delete('/:badgeId', deleteBadgeNode);

// Badge unlocking
router.get('/check/:userId/:badgeId', checkBadgeUnlock);
router.post('/unlock/:userId/:badgeId', manuallyUnlockBadge);

export default router;
