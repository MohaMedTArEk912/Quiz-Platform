import Groq from 'groq-sdk';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import limiter, { scheduleNormal } from '../utils/aiLimiter.js';
import { smartTruncate, validateTokenBudget } from '../utils/tokenOptimizer.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Initialize require for CommonJS modules
const require = createRequire(import.meta.url);

// PDF Parse will be lazy-loaded


// Lazy load extractor for other file types (PPTX)
let extractor = null;

const getExtractorInstance = async () => {
    if (!extractor) {
        try {
            const { getTextExtractor } = await import('office-text-extractor');
            extractor = getTextExtractor();
            console.log('Text extractor initialized successfully');
        } catch (error) {
            console.warn('Failed to initialize text extractor:', error.message);
            // Return a dummy extractor that throws explicitly when used
            return { 
                extractText: async () => { 
                    throw new Error(`Text extraction unavailable: ${error.message}`); 
                } 
            };
        }
    }
    return extractor;
};

// Lazy Groq client init to avoid crashing when key is missing
const getGroqClient = () => {
    const key = (process.env.GROQ_API_KEY || '').trim();
    if (!key) return null;
    try { return new Groq({ apiKey: key }); } catch (e) {
        console.warn('Failed to initialize Groq client:', e.message);
        return null;
    }
};

// Groq-only setup; no Google SDK or key debug logs

export const aiHealth = async (req, res) => {
    try {
        const groq = getGroqClient();
        if (!groq) {
            return res.status(400).json({ ok: false, message: 'GROQ_API_KEY is missing in environment.' });
        }
        const resp = await groq.chat.completions.create({
            model: 'llama-3.2-11b-vision-preview',
            messages: [{ role: 'user', content: 'healthcheck' }],
            max_tokens: 64
        });
        const text = resp?.choices?.[0]?.message?.content || '';
        return res.json({ ok: true, provider: 'groq', model: 'llama-3.2-11b-vision-preview', sampleLength: text.length });
    } catch (error) {
        return res.status(400).json({ ok: false, message: error.message });
    }
};

// PRODUCTION MODELS: Confirmed available for this API key
// Note: Try stable models first, then experimental as fallback
const GROQ_ATTEMPT_MODELS = [
    'llama-3.2-90b-text-preview',
    'llama-3.2-11b-vision-preview',
    'mixtral-8x7b-32768',
];

/**
 * PRODUCTION-GRADE AI GENERATION WITH RATE LIMITING
 * 
 * Architecture:
 * 1. Rate Limiter: Enforces 4-second gaps (15 RPM limit)
 * 2. Model Fallback: Tries stable models in order
 * 3. Exponential Backoff: 1s, 2s, 4s delays on failures
 * 4. Smart Retry: Only retry 429 errors, skip 404/403
 */
async function generateContentWithFallback(prompt, jobId = `Gen-${Date.now()}`) {
    let lastError = null;
    // Wrap entire generation in rate limiter
    return scheduleNormal(jobId, async () => {
        const groq = getGroqClient();
        if (!groq) throw new Error('GROQ_API_KEY missing');
        for (const modelName of GROQ_ATTEMPT_MODELS) {
            try {
                console.log(`[AI Gen][Groq] Attempting model: ${modelName}`);
                const resp = await groq.chat.completions.create({
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }],
                    // Encourage JSON output
                    response_format: { type: 'json_object' },
                    max_tokens: 4096,
                });
                const text = resp?.choices?.[0]?.message?.content || '';
                console.log(`[AI Gen][Groq] ✅ Success with ${modelName}`);
                return { response: { text: () => text } };
            } catch (error) {
                const errorMsg = (error?.message || String(error)).split('\n')[0].substring(0, 100);
                console.warn(`[AI Gen][Groq] ❌ Model ${modelName} failed: ${errorMsg}`);
                if (String(errorMsg).includes('429')) error.status = 429;
                lastError = error;
                if (String(errorMsg).includes('404') || String(errorMsg).includes('403')) {
                    console.warn(`[AI Gen][Groq] Skipping to next model`);
                    continue;
                }
                if (String(errorMsg).includes('429')) {
                    throw error; // Let limiter retry
                }
                continue;
            }
        }

        // All models failed
        throw lastError;
    });
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
                const MAX_EXTRACTION_TIME = 30000; // 30 second timeout
                
                try {
                    console.log(`Processing file: ${fileObj.originalname} (${fileObj.mimetype})`);
                    
                    // Validate file exists and is readable
                    if (!fs.existsSync(filePath)) {
                        throw new Error('Uploaded file not found');
                    }
                    
                    const stats = fs.statSync(filePath);
                    if (stats.size === 0) {
                        throw new Error('Uploaded file is empty');
                    }
                    
                    // Process based on MIME type
                    if (fileObj.mimetype === 'application/pdf') {
                        // Read file buffer for pdf-parse
                        const dataBuffer = fs.readFileSync(filePath);
                        
                        // Use pdf-parse v2 API (Class-based) or v1 (Function-based)
                        let parser = null;
                        try {
                            // Polyfill DOMMatrix for pdfjs-dist in Node.js environment
                            if (typeof DOMMatrix === 'undefined') {
                                global.DOMMatrix = class DOMMatrix {
                                    constructor() {
                                        this.a = 1; this.b = 0; this.c = 0; this.d = 1;
                                        this.e = 0; this.f = 0;
                                    }
                                    setMatrixValue(str) {} 
                                    multiply(m) { return this; }
                                    translate(x, y) { return this; }
                                    scale(x, y) { return this; }
                                    rotate(angle) { return this; }
                                    toString() { return 'matrix(1, 0, 0, 1, 0, 0)'; }
                                };
                            }

                             // Lazy load pdf-parse
                            const pdfParseLib = require('pdf-parse');
                            const pdfParse = (typeof pdfParseLib === 'function') ? pdfParseLib : pdfParseLib.PDFParse;

                            // Extract exported entity
                            const PDFParseEntity = pdfParseLib.PDFParse || pdfParseLib;

                            // unified handler: Always try 'new' first as it works for both Classes and Factory functions that return objects/promises
                            // We attempt to instantiate with the dataBuffer first (v1 style)
                            try {
                                const instance = new PDFParseEntity(dataBuffer);
                                
                                if (instance instanceof Promise || (typeof instance === 'object' && typeof instance.then === 'function')) {
                                    // It behaved like valid v1 (returning a Promise)
                                    const data = await instance;
                                    text = data.text;
                                } else if (instance && typeof instance.getText === 'function') {
                                    // It behaves like a v2 Class instance that accepts buffer directly
                                    const result = await instance.getText();
                                    text = result.text;
                                } else {
                                    // Fallback: Try instantiating with config object (v2 style)
                                    const instanceV2 = new PDFParseEntity({ data: dataBuffer });
                                    if (instanceV2 && typeof instanceV2.getText === 'function') {
                                         const result = await instanceV2.getText();
                                         text = result.text;
                                    } else {
                                        throw new Error('Unrecognized PDF parser API');
                                    }
                                }
                            } catch (instantiationError) {
                                console.warn('PDF instantiation with buffer failed, trying object config:', instantiationError.message);
                                // Retry with object immediately if strictly strict class
                                const instanceV2 = new PDFParseEntity({ data: dataBuffer });
                                text = (await instanceV2.getText()).text;
                            }
                        } finally {
                            if (parser && typeof parser.destroy === 'function') {
                                try { await parser.destroy(); } catch (e) {
                                    console.warn('Failed to destroy PDF parser:', e.message);
                                }
                            }
                        }
                    } else if (fileObj.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
                        const extractor = await getExtractorInstance();
                        text = await Promise.race([
                            extractor.extractText({ input: filePath, type: 'file' }),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('PPTX extraction timeout')), MAX_EXTRACTION_TIME)
                            )
                        ]);
                    } else if (fileObj.mimetype === 'text/plain' || fileObj.mimetype === 'text/markdown') {
                        text = fs.readFileSync(filePath, 'utf8');
                    } else {
                        throw new Error(`Unsupported file type: ${fileObj.mimetype}`);
                    }
                    
                    if (!text || !text.trim()) {
                        throw new Error('No text extracted from file');
                    }
                    
                    console.log(`Successfully extracted ${text.length} characters from ${fileObj.originalname}`);
                } catch (fileError) {
                    console.error(`Error processing file ${fileObj.originalname}:`, fileError);
                    throw new Error(`Failed to process file ${fileObj.originalname}: ${fileError.message}`);
                } finally {
                    // Always cleanup
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (e) { 
                            console.error('Failed to delete temp file:', filePath, e.message); 
                        }
                    }
                }
                return text;
            };

            console.log('Processing files...');

            if (req.files.file && req.files.file[0]) {
                try {
                    const fileText = await processFile(req.files.file[0]);
                    if (fileText && fileText.trim()) {
                        material = (material || '') + '\n\n' + fileText;
                        console.log('Study material extracted, length:', fileText.length);
                    }
                } catch (e) {
                    console.error('Main file processing failed:', e.message);
                    return res.status(400).json({ 
                        success: false, 
                        message: e.message,
                        errorType: 'FILE_PROCESSING_ERROR'
                    });
                }
            }

            if (req.files.styleFile && req.files.styleFile[0]) {
                try {
                    const styleText = await processFile(req.files.styleFile[0]);
                    if (styleText && styleText.trim()) {
                        styleExamples = (styleExamples || '') + '\n\n' + styleText;
                        console.log('Style guide extracted');
                    }
                } catch (e) {
                    console.warn('Style file processing failed, continuing without style guide:', e.message);
                    // Don't fail the request, just continue without style guide
                }
            }
        }

        // Validate Groq key availability
        if (!process.env.GROQ_API_KEY) {
            console.error('Missing GROQ_API_KEY in environment variables');
            return res.status(500).json({ 
                success: false, 
                message: 'Server configuration error: GROQ API Key missing.' 
            });
        }

        // Final validation: Ensure we have some text to process
        if (!material || !material.trim()) {
            return res.status(400).json({ success: false, message: "No content found. Please provide text or a valid readable file (PDF/PPTX)." });
        }
        // OPTIMIZATION: Smart truncation to reduce token usage
        // Free tier has strict token limits per minute
        const MAX_MATERIAL_TOKENS = 8000; // Conservative limit
        material = smartTruncate(material, MAX_MATERIAL_TOKENS);
        
        if (styleExamples) {
            styleExamples = smartTruncate(styleExamples, 1000);
        }

        // Construct Prompt (optimized for token efficiency)
        let prompt = `You are an exam creator. Generate a quiz from the study material.

**Config:**
- Questions: ${questionCount || 5}
- Difficulty: ${difficulty || 'Medium'}
- Type: ${questionType || 'Multiple Choice'}

**Material:**
"""
${material}
"""

${styleExamples ? `**Style:**\n${styleExamples}\n` : ''}
**Output:** JSON array only. No markdown, no text.
Schema:
{
  "question": "text",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "explanation": "brief",
  "type": "multiple-choice"
}

Rules:
- Multiple Choice: 4 options
- True/False: ["True", "False"], correctAnswer 0 or 1
- Valid correctAnswer index
`;

        // Validate token budget before sending
        const budgetCheck = validateTokenBudget(prompt, 12000);
        if (!budgetCheck.valid) {
            console.warn(`[Token Warning] ${budgetCheck.message}`);
            return res.status(400).json({
                success: false,
                message: 'Input too large. Please reduce content size or question count.'
            });
        }
        
        console.log(`[Token Budget] Prompt: ~${budgetCheck.tokens} tokens`);

        const result = await generateContentWithFallback(prompt);
        console.log('Content generated, getting response...');
        const response = await result.response;
        let text = typeof response?.text === 'function' ? response.text() : (response?.text || '');

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
        
        // Provide specific error messages based on error type
        let statusCode = 500;
        let userMessage = 'Failed to generate quiz.';
        let errorType = 'UNKNOWN_ERROR';
        
        if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
            statusCode = 500;
            userMessage = 'AI service API key is invalid or expired. Please contact the administrator to update the API key.';
            errorType = 'INVALID_API_KEY';
        } else if (error.message.includes('429')) {
            statusCode = 429;
            userMessage = 'Rate limit exceeded. The AI service is temporarily unavailable due to quota limits. Please try again in a few minutes.';
            errorType = 'RATE_LIMIT_ERROR';
        } else if (error.message.includes('403')) {
            statusCode = 500;
            userMessage = 'AI service authentication failed. Please contact support.';
            errorType = 'AUTH_ERROR';
        } else if (error.message.includes('404')) {
            statusCode = 500;
            userMessage = 'AI model not available. The service may be temporarily down.';
            errorType = 'MODEL_NOT_FOUND';
        } else if (error.message.includes('MISSING_KEY')) {
            statusCode = 500;
            userMessage = 'Server configuration error. AI service is not configured.';
            errorType = 'CONFIG_ERROR';
        }
        
        res.status(statusCode).json({ 
            success: false, 
            message: userMessage, 
            errorType,
            technicalError: process.env.NODE_ENV === 'development' ? error.message : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
