import express from 'express';
import * as badgeController from '../controllers/badgeController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Catalog endpoints
router.get('/', badgeController.getBadges); // GET /api/badges (public / auto-seeds)
router.post('/', verifyAdmin, badgeController.createBadge); // POST /api/badges
router.delete('/:id', verifyAdmin, badgeController.deleteBadge); // DELETE /api/badges/:id

// Seed catalog (admin)
router.post('/seed', verifyAdmin, badgeController.seedBadges); // POST /api/badges/seed

// Automatic Evaluation & Progression
router.post('/evaluate', verifyUser, badgeController.evaluateBadges); // POST /api/badges/evaluate

// Badge Utility: Equip / Unequip
router.put('/equip', verifyUser, badgeController.equipBadge); // PUT /api/badges/equip

export default router;
