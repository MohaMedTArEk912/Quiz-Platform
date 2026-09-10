import express from 'express';
import multer from 'multer';
import * as studioController from '../controllers/aiStudioController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Secure multer memory upload configuration with strict limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per document to prevent memory exhaustion
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/json'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(pdf|txt|md|pptx|json)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Allowed formats: PDF, TXT, MD, PPTX, JSON'));
    }
  }
});

// Material Management (Protected: Verified Admin Only)
router.post('/upload', verifyUser, verifyAdmin, upload.single('file'), studioController.uploadMaterial);
router.post('/process', verifyUser, verifyAdmin, studioController.processMaterial);
router.delete('/material/:subjectId/:materialId', verifyUser, verifyAdmin, studioController.deleteMaterial);

// Generation (Protected: Verified Admin Only)
router.post('/generate', verifyUser, verifyAdmin, studioController.generateQuizFromMaterials);

export default router;
