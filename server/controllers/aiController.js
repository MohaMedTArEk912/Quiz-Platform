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

// PRODUCTION MODELS
const GROQ_ATTEMPT_MODELS = [
    'llama-3.3-70b-versatile', // Strongest for following complex instructions
    'llama-3.2-90b-text-preview',
    'mixtral-8x7b-32768',
];

async function generateContentWithFallback(prompt, jobId = `Gen-${Date.now()}`) {
    let lastError = null;
    return scheduleNormal(jobId, async () => {
        const groq = getGroqClient();
        if (!groq) throw new Error('GROQ_API_KEY missing');
        for (const modelName of GROQ_ATTEMPT_MODELS) {
            try {
                console.log(`[AI Gen][Groq] Attempting model: ${modelName}`);
                const resp = await groq.chat.completions.create({
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    max_tokens: 8000, // High limit for extraction
                });
                const text = resp?.choices?.[0]?.message?.content || '';
                console.log(`[AI Gen][Groq] ✅ Success with ${modelName}`);
                return { response: { text: () => text } };
            } catch (error) {
                const errorMsg = (error?.message || String(error)).split('\n')[0].substring(0, 100);
                console.warn(`[AI Gen][Groq] ❌ Model ${modelName} failed: ${errorMsg}`);
                if (String(errorMsg).includes('429')) error.status = 429;
                lastError = error;
                if (String(errorMsg).includes('404') || String(errorMsg).includes('403')) continue;
                if (String(errorMsg).includes('429')) throw error; 
                continue;
            }
        }
        throw lastError;
    });
}

export const generateQuiz = async (req, res) => {
    try {
        let { 
            material, 
            difficulty = 'Medium', 
            questionCount = 10, 
            questionType = 'Multiple Choice', 
            styleExamples = '',
            mode = 'generate' // Options: 'generate' | 'extract'
        } = req.body;

        console.log(`[AI Request] Mode: ${mode}, Qs: ${questionCount}, Diff: ${difficulty}`);
        
        // --- FILE PROCESSING (Identical to previous) ---
        if (req.files) {
            const processFile = async (fileObj) => {
                const filePath = fileObj.path;
                let text = '';
                const MAX_EXTRACTION_TIME = 30000;
                try {
                    if (!fs.existsSync(filePath)) throw new Error('File not found');
                    if (fileObj.mimetype === 'application/pdf') {
                        const dataBuffer = fs.readFileSync(filePath);
                        if (typeof DOMMatrix === 'undefined') {
                             global.DOMMatrix = class DOMMatrix { constructor() { this.a=1;this.b=0;this.c=0;this.d=1;this.e=0;this.f=0; } setMatrixValue(){} multiply(){return this;} translate(){return this;} scale(){return this;} rotate(){return this;} toString(){return 'matrix(1, 0, 0, 1, 0, 0)';} };
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
                    } else if (fileObj.mimetype.includes('presentation')) {
                        const extractor = await getExtractorInstance();
                        text = await Promise.race([
                            extractor.extractText({ input: filePath, type: 'file' }),
                            new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), MAX_EXTRACTION_TIME))
                        ]);
                    } else {
                        text = fs.readFileSync(filePath, 'utf8');
                    }
                } finally {
                    if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch (e) {}
                }
                return text || '';
            };

            if (req.files.file && req.files.file[0]) {
                const t = await processFile(req.files.file[0]);
                material = (material || '') + '\n\n' + t;
            }
            if (req.files.styleFile && req.files.styleFile[0]) {
                const t = await processFile(req.files.styleFile[0]);
                styleExamples = (styleExamples || '') + '\n\n' + t;
            }
        }

        if (!process.env.GROQ_API_KEY) return res.status(500).json({ success: false, message: 'GROQ_API_KEY missing' });
        if (!material || !material.trim()) return res.status(400).json({ success: false, message: "No content provided." });

        // --- SMART TOKEN MANAGEMENT ---
        // If EXTRACT mode: We prioritize the Material (Source) heavily so we don't miss questions.
        // If GENERATE mode: We balance Material and Style.
        const IS_EXTRACT = mode === 'extract';
        const MAX_MATERIAL_TOKENS = IS_EXTRACT ? 15000 : 10000;
        const MAX_STYLE_TOKENS = IS_EXTRACT ? 2000 : 4000;

        material = smartTruncate(material, MAX_MATERIAL_TOKENS);
        if (styleExamples) styleExamples = smartTruncate(styleExamples, MAX_STYLE_TOKENS);

        // --- THE UNIFIED PROMPT ---
        const prompt = `
You are an expert Educational AI. 
CURRENT OPERATION MODE: "${IS_EXTRACT ? 'RAW_EXTRACTION' : 'CREATIVE_GENERATION'}"

### INPUT CONTENT (Study Material / Exam Source)
"""
${material}
"""

${styleExamples ? `### REFERENCE STYLE (Old Exam / Guidelines)\n"""\n${styleExamples}\n"""` : ''}

### CONFIGURATION
- Target Count: ${questionCount}
- Difficulty: ${difficulty}
- Type: ${questionType}

### MODE INSTRUCTIONS

**IF MODE IS "RAW_EXTRACTION":**
1.  **GOAL:** Digitize questions exactly as they appear in the INPUT CONTENT.
2.  **STRICTNESS:** Do NOT change wording. Do NOT invent questions.
3.  **ANSWERS:** If the file marks the answer, use it. If not, solve it yourself and mark the correct index.
4.  **QUANTITY:** Extract as many valid questions as found (up to Target Count).
5.  **STYLE:** Ignore the "Reference Style" section unless it contains the actual answer key.

**IF MODE IS "CREATIVE_GENERATION":**
1.  **GOAL:** Create NEW, unique questions to test the user's understanding of the INPUT CONTENT.
2.  **STYLE:** Analyze the "Reference Style" (if provided) to match its complexity, tone, and distractor logic.
3.  **LOGIC:** Questions must be answerable using *only* the INPUT CONTENT (Source of Truth).
4.  **DISTRACTORS:** Generate plausible but incorrect options.

### OUTPUT FORMAT (STRICT JSON)
Return ONLY a valid JSON array. No markdown.
Schema:
[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 0,
    "explanation": "string (Why is this correct?)",
    "type": "multiple-choice"
  }
]
`;

        // Validate budget
        const budgetCheck = validateTokenBudget(prompt, 20000); // Higher budget allowed for extraction
        if (!budgetCheck.valid) {
             return res.status(400).json({ success: false, message: 'Input too large for AI model.' });
        }

        const result = await generateContentWithFallback(prompt);
        const response = await result.response;
        let text = typeof response?.text === 'function' ? response.text() : (response?.text || '');
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let parsedQuestions;
        try {
            parsedQuestions = JSON.parse(text);
        } catch (e) {
            // Attempt to rescue partial JSON
            const match = text.match(/\[.*\]/s);
            if (match) {
                 try { parsedQuestions = JSON.parse(match[0]); } catch (e2) {}
            }
            if (!parsedQuestions) throw new Error('Invalid JSON response from AI');
        }

        if (!Array.isArray(parsedQuestions)) throw new Error('AI response was not a list of questions');

        const questions = parsedQuestions.map((q, index) => ({
            id: index + 1,
            part: IS_EXTRACT ? "Extracted Section" : "Generated Section",
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || (IS_EXTRACT ? "Extracted from source" : "AI Generated"),
            type: 'multiple-choice',
            points: 1
        }));

        res.json({ success: true, data: questions });

    } catch (error) {
        console.error('AI Controller Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message.includes('JSON') ? 'Failed to parse AI response' : 'AI Service Error',
            errorType: 'SERVER_ERROR'
        });
    }
};
