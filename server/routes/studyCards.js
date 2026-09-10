import express from 'express';
import * as cardController from '../controllers/studyCardController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', cardController.getAllCards);
router.post('/', verifyUser, verifyAdmin, cardController.createCard);
router.put('/:id', verifyUser, verifyAdmin, cardController.updateCard);
router.delete('/:id', verifyUser, verifyAdmin, cardController.deleteCard);
router.delete('/stack/:category', verifyUser, verifyAdmin, cardController.deleteStack);
router.put('/stack/rename', verifyUser, verifyAdmin, cardController.updateStack);

export default router;
