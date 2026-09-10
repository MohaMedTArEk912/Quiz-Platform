import express from 'express';
import {
  createBadgeTree,
  getAllBadgeTrees,
  getBadgeTree,
  updateBadgeTree,
  deleteBadgeTree,
  addNodeToTree,
  updateNodeInTree,
  removeNodeFromTree,
  getUserBadgeProgress,
  getUserTreeProgress
} from '../controllers/badgeTreeController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Badge tree CRUD (Public reads, Admin mutations)
router.get('/', getAllBadgeTrees);
router.get('/:treeId', getBadgeTree);
router.post('/', verifyUser, verifyAdmin, createBadgeTree);
router.put('/:treeId', verifyUser, verifyAdmin, updateBadgeTree);
router.delete('/:treeId', verifyUser, verifyAdmin, deleteBadgeTree);

// Node management (Admin mutations)
router.post('/:treeId/nodes', verifyUser, verifyAdmin, addNodeToTree);
router.put('/:treeId/nodes/:badgeId', verifyUser, verifyAdmin, updateNodeInTree);
router.delete('/:treeId/nodes/:badgeId', verifyUser, verifyAdmin, removeNodeFromTree);

// User progress (Authenticated)
router.get('/progress/:userId', verifyUser, getUserBadgeProgress);
router.get('/progress/:userId/:treeId', verifyUser, getUserTreeProgress);

export default router;
