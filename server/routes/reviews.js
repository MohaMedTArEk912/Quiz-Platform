import express from 'express';
import * as attemptController from '../controllers/attemptController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/pending', attemptController.getPendingReviews); // GET /api/reviews/pending
router.post('/:attemptId', verifyAdmin, attemptController.submitReview); // POST /api/reviews/:attemptId

export default router;
