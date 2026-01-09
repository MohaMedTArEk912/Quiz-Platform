import express from 'express';
import multer from 'multer';
import * as studioController from '../controllers/aiStudioController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Material Management
router.post('/upload', upload.single('file'), studioController.uploadMaterial);
router.post('/process', studioController.processMaterial);
router.delete('/material/:subjectId/:materialId', studioController.deleteMaterial);

// Generation
router.post('/generate', studioController.generateQuizFromMaterials);

export default router;
