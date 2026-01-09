import { Subject } from '../models/Subject.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import Groq from 'groq-sdk';
import { smartTruncate, validateTokenBudget } from '../utils/tokenOptimizer.js';

// Initialize require for CommonJS modules (PDF Parse)
const require = createRequire(import.meta.url);

// --- HELPERS (Refactor later to shared utils) ---
const getGroqClient = () => {
    const key = (process.env.GROQ_API_KEY || '').trim();
    if (!key) return null;
    return new Groq({ apiKey: key });
};

const extractTextFromFile = async (filePath, mimetype) => {
    let text = '';
    const MAX_EXTRACTION_TIME = 30000;

    try {
        if (!fs.existsSync(filePath)) throw new Error('File not found');

        if (mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            // Polyfill DOMMatrix for some PDF parsers if needed
            if (typeof DOMMatrix === 'undefined') {
                global.DOMMatrix = class DOMMatrix { constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; } setMatrixValue() { } multiply() { return this; } translate() { return this; } scale() { return this; } rotate() { return this; } toString() { return 'matrix(1, 0, 0, 1, 0, 0)'; } };
            }
            const pdfParseLib = require('pdf-parse');
            const PDFParseEntity = pdfParseLib.PDFParse || pdfParseLib;
            try {
                const instance = new PDFParseEntity(dataBuffer);
                text = (await instance).text || (await instance.getText()).text;
            } catch (e) {
                const instanceV2 = new PDFParseEntity({ data: dataBuffer });
                text = (await instanceV2.getText()).text;
            }
        } else if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) {
             // Basic text extraction fallback for now or re-import office-text-extractor
             // For stability in this refactor, we'll suggest sticking to text/pdf or implementing later
             throw new Error('PPTX extraction not fully migrated to Studio yet. Please convert to PDF.');
        } else {
            text = fs.readFileSync(filePath, 'utf8');
        }
    } finally {
        if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch (e) { }
    }
    return text || '';
};

// --- CONTROLLERS ---

export const uploadMaterial = async (req, res) => {
    try {
        const { subjectId, type } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        if (!subjectId) return res.status(400).json({ success: false, message: 'Subject ID required' });

        const rawText = await extractTextFromFile(file.path, file.mimetype);
        if (!rawText.trim()) return res.status(400).json({ success: false, message: 'Failed to extract text from file.' });

        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

        const newMaterial = {
            title: file.originalname,
            type: type || 'lesson', // 'lesson' | 'exam_raw'
            rawContent: rawText,
            originalFileName: file.originalname,
            isProcessed: false,
            uploadedAt: new Date()
        };

        subject.materials.push(newMaterial);
        await subject.save();

        res.json({ success: true, data: subject.materials[subject.materials.length - 1] });

    } catch (error) {
        console.error('Upload Material Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteMaterial = async (req, res) => {
    try {
        const { subjectId, materialId } = req.params;
        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

        subject.materials = subject.materials.filter(m => m._id.toString() !== materialId);
        await subject.save();

        res.json({ success: true, message: 'Material deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const processMaterial = async (req, res) => {
    try {
        const { subjectId, materialId } = req.body;
        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

        const material = subject.materials.id(materialId);
        if (!material) return res.status(404).json({ success: false, message: 'Material not found' });

        const groq = getGroqClient();
        if (!groq) return res.status(500).json({ success: false, message: 'AI Service Config Missing' });

        // --- EXAM EXTRACTION LOGIC ---
        if (material.type === 'exam_raw') {
            const prompt = `
            EXTRACT QUESTIONS FROM THIS EXAM TEXT.
            RETURN JSON ONLY.
            Schema: [{ "question": "...", "options": ["..."], "correctAnswer": 0, "explanation": "..." }]
            
            TEXT:
            """
            ${smartTruncate(material.rawContent, 15000)}
            """
            `;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' }
            });

            const content = completion.choices[0]?.message?.content;
            let questions = [];
            try {
                const parsed = JSON.parse(content);
                // Handle if wrapped in key
                if (Array.isArray(parsed)) questions = parsed;
                else if (parsed.questions) questions = parsed.questions;
                else if (parsed.data) questions = parsed.data;
            } catch (e) {
                console.error('Failed to parse AI extraction', e);
            }

            // Save to material
            material.extractedQuestions = questions.map(q => ({
                ...q, 
                type: 'multiple-choice', // default
                points: 1
            }));
            material.isProcessed = true;
            material.type = 'exam_processed'; // Update status
        } 
        // --- LESSON SUMMARIZATION (Future) ---
        else if (material.type === 'lesson') {
             // For now, just mark as processed as we don't strictly *need* a summary yet
             // But we could add "Key Concepts" extraction here later
             material.isProcessed = true;
             material.summary = "Raw text ready for generation."; 
        }

        await subject.save();
        res.json({ success: true, data: material });

    } catch (error) {
        console.error('Process Material Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const generateQuizFromMaterials = async (req, res) => {
    try {
        const { subjectId, materialIds, questionCount = 10, difficulty = 'Medium' } = req.body;
        
        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

        // Aggregate content from selected materials
        // Context Window strategy: 
        // 1. If 'exam_processed', use the QUESTIONS as style examples (or just return them if requested? user wants generation)
        // 2. If 'lesson', use the RAW CONTENT as source.

        let sourceContext = "";
        let styleContext = "";

        const selectedMaterials = subject.materials.filter(m => materialIds.includes(m._id.toString()));

        selectedMaterials.forEach(mat => {
            if (mat.type === 'lesson') {
                sourceContext += `\n--- SOURCE (${mat.title}) ---\n${mat.rawContent}\n`;
            } else if (mat.type === 'exam_processed') {
                // Use extracted questions as style examples
                const examples = mat.extractedQuestions.slice(0, 3).map(q => `Q: ${q.question}\nA: ${q.options[q.correctAnswer]}`).join('\n');
                styleContext += `\n--- STYLE GUIDE (${mat.title}) ---\n${examples}\n`;
            }
        });

        if (!sourceContext.trim()) {
            return res.status(400).json({ success: false, message: "No source lessons selected for generation." });
        }

        const groq = getGroqClient();
        
        // Truncate based on priority: Source > Style
        sourceContext = smartTruncate(sourceContext, 12000);
        styleContext = smartTruncate(styleContext, 2000);

        const prompt = `
        Create ${questionCount} ${difficulty} level multiple-choice questions based on the SOURCE CONTENT.
        ${styleContext ? `Use the STYLE GUIDE to match the tone and complexity.` : ''}
        
        SOURCE CONTENT:
        """
        ${sourceContext}
        """

        RETURN JSON ARRAY:
        [{ "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": index, "explanation": "..." }]
        `;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        const content = completion.choices[0]?.message?.content;
        let questions = JSON.parse(content);
        if (questions.questions) questions = questions.questions; // Handle wrapped

        const finalQuestions = questions.map((q, i) => ({
            id: i + 1,
            ...q,
            points: 1
        }));

        res.json({ success: true, data: finalQuestions });

    } catch (error) {
        console.error('Generate Quiz Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
