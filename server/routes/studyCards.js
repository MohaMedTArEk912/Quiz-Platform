import express from 'express';
import * as cardController from '../controllers/studyCardController.js';

const router = express.Router();

router.get('/', cardController.getAllCards);
router.post('/', cardController.createCard);
router.put('/:id', cardController.updateCard);
router.delete('/:id', cardController.deleteCard);
router.delete('/stack/:category', cardController.deleteStack);
router.put('/stack/rename', cardController.updateStack);

export default router;
