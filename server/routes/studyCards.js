import express from 'express';
import * as cardController from '../controllers/studyCardController.js';

const router = express.Router();

router.get('/', cardController.getAllCards);
router.post('/', cardController.createCard);
router.put('/:id', cardController.updateCard);
router.delete('/:id', cardController.deleteCard);

export default router;
