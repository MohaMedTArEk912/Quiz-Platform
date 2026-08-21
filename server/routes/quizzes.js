import express from 'express';
import * as quizController from '../controllers/quizController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', quizController.getQuizzes); // GET /api/quizzes
router.get('/:id/session', quizController.getQuizSession); // GET /api/quizzes/:id/session (customized question session)
router.get('/:id/pool-progress', quizController.getPoolProgress); // GET /api/quizzes/:id/pool-progress
router.post('/:id/reset-pool-progress', quizController.resetPoolProgress); // POST /api/quizzes/:id/reset-pool-progress
router.post('/', verifyAdmin, quizController.createQuiz); // POST /api/quizzes
router.post('/import', verifyAdmin, quizController.importQuizzes); // POST /api/quizzes/import
router.put('/:id', verifyAdmin, quizController.updateQuiz);
router.delete('/:id', verifyAdmin, quizController.deleteQuiz);

export default router;
