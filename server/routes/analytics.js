import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Mount at /api
router.get('/analytics/summary', verifyUser, analyticsController.getAnalyticsSummary);
router.get('/analytics/questions', verifyUser, analyticsController.getQuestionAnalytics);
router.get('/data', verifyUser, analyticsController.getData);

export default router;
