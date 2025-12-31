import express from 'express';
import * as badgeController from '../controllers/badgeController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', badgeController.getBadges); // GET /api/badges
router.post('/', verifyAdmin, badgeController.createBadge); // POST /api/badges
router.delete('/:id', verifyAdmin, badgeController.deleteBadge); // DELETE /api/badges/:id

export default router;
