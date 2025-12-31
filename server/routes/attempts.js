import express from 'express';
import * as attemptController from '../controllers/attemptController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', attemptController.saveAttempt); // POST /api/attempts
router.get('/reviews/pending', attemptController.getPendingReviews); // GET /api/attempts/reviews/pending 
// NOTE: Original was /api/reviews/pending. We will mount this router at /api/attempts? 
// Or better, we mount it at /api/reviews for the specific reviews routes?
// The plan said /attempts. Let's stick to /api/attempts and include reviews there?
// Or separate reviewRoutes?
// Let's mix them or use specific mounting.
// If we mount this router at /api (in index.js), then we define full paths.
// Let's stick to modular paths.
// If we mount at /api/attempts, then /reviews/pending becomes /api/attempts/reviews/pending.
// This changes the API signature! We must be careful.
// Original: /api/attempts (POST), /api/reviews/pending (GET), /api/reviews/:attemptId (POST)
// I should probably separate them or define routes carefully.

// Let's create a 'reviews' router separately to keep API endpoints identical? 
// Or I can define them here and we assume we mount this router 2 times or use a main 'api' router.
// FOR NOW: I will export a router that handles /attempts.
// AND I will create `server/routes/reviews.js` to handle /reviews.
// The task plan grouped them. I'll split for API consistency.

export default router;
