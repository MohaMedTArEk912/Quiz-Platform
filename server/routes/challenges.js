import express from 'express';
import * as challengeController from '../controllers/challengeController.js';
import { verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyUser, challengeController.createChallenge); // POST /api/challenges
router.get('/:token', challengeController.getChallengeByToken); // GET /api/challenges/:token (Public?) - Code says public access
router.post('/:token/submit', verifyUser, challengeController.submitChallengeResult); // POST /api/challenges/:token/submit
router.get('/', verifyUser, challengeController.listChallenges); // GET /api/challenges

export default router;
