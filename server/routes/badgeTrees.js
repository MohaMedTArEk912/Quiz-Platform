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

const router = express.Router();

// Badge tree CRUD
router.post('/', createBadgeTree);
router.get('/', getAllBadgeTrees);
router.get('/:treeId', getBadgeTree);
router.put('/:treeId', updateBadgeTree);
router.delete('/:treeId', deleteBadgeTree);

// Node management
router.post('/:treeId/nodes', addNodeToTree);
router.put('/:treeId/nodes/:badgeId', updateNodeInTree);
router.delete('/:treeId/nodes/:badgeId', removeNodeFromTree);

// User progress
router.get('/progress/:userId', getUserBadgeProgress);
router.get('/progress/:userId/:treeId', getUserTreeProgress);

export default router;
