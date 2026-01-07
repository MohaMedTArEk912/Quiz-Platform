import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createSubject, getSubjects, getSubjectDetails, deleteSubject, updateSubject, generateQuizFromSubject } from '../controllers/subjectController.js';
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
    limits: { 
        fileSize: 50 * 1024 * 1024, // Increased to 50MB
        files: 10 // Max 10 files total
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/markdown'
        ];
        
        const allowedExtensions = /\.(pdf|pptx|txt|md)$/i;
        
        if (allowedMimes.includes(file.mimetype) || allowedExtensions.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, PPTX, TXT, and MD files are allowed'));
        }
    }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large. Maximum size is 50MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ success: false, message: 'Too many files. Maximum is 10 files.' });
        }
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
};

// Timeout middleware for long-running requests like quiz generation
const timeoutMiddleware = (timeoutMs) => {
    return (req, res, next) => {
        const timeoutId = setTimeout(() => {
            if (!res.headersSent) {
                res.status(504).json({
                    success: false,
                    message: `Request timeout. Quiz generation took longer than ${timeoutMs / 1000} seconds. Please try again with fewer questions or simpler content.`
                });
            }
        }, timeoutMs);

        res.on('finish', () => clearTimeout(timeoutId));
        res.on('close', () => clearTimeout(timeoutId));
        next();
    };
};

router.post('/', verifyUser, verifyAdmin, upload.fields([
    { name: 'contentFiles', maxCount: 5 },  // Multiple content files
    { name: 'oldExamFiles', maxCount: 5 }   // Multiple old exam files
]), handleMulterError, createSubject);

// Update subject (can append or replace content)
router.put('/:id', verifyUser, verifyAdmin, upload.fields([
    { name: 'contentFiles', maxCount: 10 },
    { name: 'oldExamFiles', maxCount: 10 },
    { name: 'replacementFiles', maxCount: 10 }
]), handleMulterError, updateSubject);

// Generate Quiz from Subject (with 5-minute timeout)
router.post('/generate-quiz', verifyUser, verifyAdmin, timeoutMiddleware(300000), generateQuizFromSubject);

router.get('/', verifyUser, verifyAdmin, getSubjects);
router.get('/:id', verifyUser, verifyAdmin, getSubjectDetails);
router.delete('/:id', verifyUser, verifyAdmin, deleteSubject);

export default router;
