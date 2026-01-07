import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { generateQuiz, aiHealth } from '../controllers/aiController.js';
import { verifyUser, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use OS temp to stay writable in serverless environments
        const uploadDir = path.join(os.tmpdir(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
            file.mimetype === 'text/plain' ||
            file.mimetype === 'text/markdown' ||
            file.originalname.endsWith('.md')) { // Common strict type check fail for md
            cb(null, true);
        } else {
            cb(new Error('Only PDF, PPTX, TXT, and MD files are allowed'));
        }
    }
});

router.post('/generate', verifyUser, verifyAdmin, upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'styleFile', maxCount: 1 }
]), generateQuiz);

// Simple health check for AI key/model
router.get('/health', verifyUser, verifyAdmin, aiHealth);

export default router;
