import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Mount at /api
router.get('/analytics/summary', verifyUser, analyticsController.getAnalyticsSummary); // GET /api/analytics/summary
router.get('/data', verifyUser, analyticsController.getData); // GET /api/data

export default router;
