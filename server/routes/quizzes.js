import express from 'express';
import * as quizController from '../controllers/quizController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', quizController.getQuizzes); // GET /api/quizzes
router.post('/', verifyAdmin, quizController.createQuiz); // POST /api/quizzes
router.post('/import', verifyAdmin, quizController.importQuizzes); // POST /api/quizzes/import
router.put('/:id', verifyAdmin, quizController.updateQuiz);
router.delete('/:id', verifyAdmin, quizController.deleteQuiz);

export default router;
