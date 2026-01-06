import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
// Lazy load extractor to prevent startup crashes in serverless environments
let extractor = null;

const getExtractorInstance = async () => {
    if (!extractor) {
        try {
            const { getTextExtractor } = await import('office-text-extractor');
            extractor = getTextExtractor();
        } catch (error) {
            console.warn('Failed to initialize text extractor:', error.message);
            // Return a dummy extractor that throws explicitly when used
            return { extractText: async () => { throw new Error("Text extraction not available: " + error.message); } };
        }
    }
    return extractor;
};

import dotenv from 'dotenv';
import { createRequire } from 'module';

// Polyfill standard Promise.withResolvers if missing (Node < 22)
if (typeof Promise.withResolvers === 'undefined') {
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

// Polyfill browser globals for pdfjs-dist used by text extractors in Node
const globalContext = (typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this) || {};
if (!globalContext.DOMMatrix) {
    globalContext.DOMMatrix = class DOMMatrix {
        constructor() { this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0; }
        toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
        multiply() { return this; }
        translate() { return this; }
        scale() { return this; }
        transformPoint(p) { return p; }
    };
}
if (!globalContext.Path2D) globalContext.Path2D = class Path2D {};
if (!globalContext.ImageData) globalContext.ImageData = class ImageData { constructor() { this.width=0;this.height=0;this.data=new Uint8ClampedArray(0); } };
if (!globalContext.HTMLCanvasElement) globalContext.HTMLCanvasElement = class HTMLCanvasElement { getContext() { return null; } };

dotenv.config();

// Initialize Gemini API
// Note: It's safe to instantiate even if key is missing, but calls will fail. Check in handler.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

const ATTEMPT_MODELS = [
    "gemini-2.0-flash", 
    "gemini-2.0-flash-lite-preview-02-05", 
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp"
];

async function generateContentWithFallback(prompt) {
    let lastError = null;
    for (const modelName of ATTEMPT_MODELS) {
        try {
            console.log(`Attempting generation with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt);
            console.log(`Success with model: ${modelName}`);
            return result;
        } catch (error) {
            console.warn(`Model ${modelName} failed: ${error.message.split('\n')[0]}`);
            if (error.message.includes('429')) {
                console.warn('Rate limit hit, switching to next model...');
            }
            lastError = error;
        }
    }
    throw lastError;
}

export const generateQuiz = async (req, res) => {
    try {
        let { material, difficulty = 'Medium', questionCount = 10, questionType = 'Multiple Choice', styleExamples = '' } = req.body;
        console.log('Generate Quiz Request:', { difficulty, questionCount, questionType, hasFiles: !!req.files });
        
        // Handle File Uploads (Study Material & Style Guide)
        if (req.files) {
            const processFile = async (fileObj) => {
                const filePath = fileObj.path;
                let text = '';
                try {
                    console.log(`Processing file: ${fileObj.originalname} (${fileObj.mimetype})`);
                    if (fileObj.mimetype === 'application/pdf' || fileObj.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                         const extractor = await getExtractorInstance();
                         text = await extractor.extractText({ input: filePath, type: 'file' });
                    } else {
                        text = fs.readFileSync(filePath, 'utf8');
                    }
                } catch (fileError) {
                    console.error(`Error processing file ${fileObj.originalname}:`, fileError);
                    throw new Error(`Failed to process file ${fileObj.originalname}: ${fileError.message}`);
                } finally {
                     // Always cleanup
                     if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (e) { console.error('Failed to delete temp file:', filePath); }
                     }
                }
                return text;
            };

            console.log('Processing files...');

            if (req.files.file && req.files.file[0]) {
                try {
                    const fileText = await processFile(req.files.file[0]);
                    if (fileText) material = (material || '') + '\n\n' + fileText;
                    console.log('File text extracted, length:', fileText?.length);
                } catch (e) {
                    return res.status(400).json({ success: false, message: e.message });
                }
            }

            if (req.files.styleFile && req.files.styleFile[0]) {
                try {
                    const styleText = await processFile(req.files.styleFile[0]);
                    if (styleText) styleExamples = (styleExamples || '') + '\n\n' + styleText;
                    console.log('Style text extracted');
                } catch (e) {
                     console.warn('Style file failed to process, ignoring:', e.message);
                }
            }
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('Missing GEMINI_API_KEY in environment variables');
            return res.status(500).json({ 
                success: false, 
                message: 'Server configuration error: AI API Key missing.' 
            });
        }

        // Final validation: Ensure we have some text to process
        if (!material || !material.trim()) {
            return res.status(400).json({ success: false, message: "No content found. Please provide text or a valid readable file (PDF/PPTX)." });
        }


        // Construct Prompt
        let prompt = `You are a strict and precise exam creator. 
        Your task is to generate a quiz based strictly on the provided study material.
        
        **Configuration:**
        - Number of Questions: ${questionCount || 5}
        - Difficulty Level: ${difficulty || 'Medium'}
        - Question Types: ${questionType || 'Multiple Choice'}
        
        **Input Material:**
        """
        ${material.substring(0, 30000)} 
        """
        
        ${styleExamples ? `**Style Guide / Examples:**\n"""\n${styleExamples}\n"""\nMake sure the generated questions follow this style.` : ''}

        **Output Requirements:**
        1. Return ONLY a valid JSON array. No markdown, no explanations, no prologue.
        2. The JSON must be an ARRAY of question objects.
        3. Each object MUST strictly follow this schema:
        {
            "question": "The question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"], 
            "correctAnswer": 0, // Index of the correct option (0-based)
            "explanation": "Brief explanation of why this answer is correct",
            "type": "multiple-choice" // or "true-false"
        }
        
        **Important Rules:**
        - For "Multiple Choice", provide 4 distinct options.
        - For "True/False", provided options ["True", "False"] and set correctAnswer to 0 or 1.
        - Ensure "correctAnswer" is a valid index for the "options" array.
        - The questions should test understanding, not just recall.
        `;

        const result = await generateContentWithFallback(prompt);
        console.log('Content generated, getting response...');
        const response = await result.response;
        let text = response.text();

        // Cleaning the output to ensure valid JSON
        // Sometimes models wrap responses in ```json ... ```
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsedQuestions;
        try {
            parsedQuestions = JSON.parse(text);
        } catch (parseError) {
            console.error('AI JSON Parse Error. Raw Text:', text);
            return res.status(500).json({ 
                success: false, 
                message: 'AI generated invalid data format. Please try again.',
                rawResponse: text
            });
        }

        if (!Array.isArray(parsedQuestions)) {
             return res.status(500).json({ 
                success: false, 
                message: 'AI did not return a list of questions.',
                rawResponse: text
            });
        }

        // Map to internal Schema
        const questions = parsedQuestions.map((q, index) => ({
            id: index + 1, // Temporary sequential ID
            part: "Generated Section",
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "Generated by AI",
            type: q.type === 'true-false' ? 'multiple-choice' : (q.type || 'multiple-choice'), // Normalize types if needed, our DB supports 'multiple-choice' mainly for this context
            points: 1
        }));

        // Handle True/False specifically if the model returned them as separate type but we want to store as MCQ with True/False options
        // The prompt asks for options ["True", "False"], so it works as MCQ.

        res.json({
            success: true,
            data: questions
        });

    } catch (error) {
        console.error('AI Controller Error - Detailed:', error);
        console.error('Error Stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate quiz.', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
