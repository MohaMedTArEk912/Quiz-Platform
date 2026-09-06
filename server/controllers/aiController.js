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

/**
 * POST /api/ai/coach-hint
 * Socratic AI Study Coach generating an adaptive concept hint without spoiling the answer
 */
export const getAICoachHint = async (req, res) => {
    try {
        const { question, options, studentAnswer, category } = req.body;
        if (!question) {
            return res.status(400).json({ success: false, message: 'Question content is required' });
        }

        const groq = getGroqClient();
        if (!groq) {
            return res.json({
                success: true,
                hint: `💡 Concept Focus: Carefully review the core principles in "${category || 'this topic'}". Focus on key terms in the question!`
            });
        }

        const prompt = `You are a supportive, high-IQ Socratic AI Study Coach on a learning platform.
A student is currently taking an assessment and is stuck on this question:
Question: "${question}"
Options: ${JSON.stringify(options || [])}
${studentAnswer ? `Student's initial thought: "${studentAnswer}"` : ''}

Provide a concise, 1-2 sentence guided conceptual hint that activates their critical thinking WITHOUT revealing the direct answer letter or spoiling the test.`;

        const resp = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200
        });

        const hintText = resp?.choices?.[0]?.message?.content?.trim() || 'Break down the question prompt into its fundamental components and eliminate options that contradict the core definitions.';
        res.json({ success: true, hint: hintText });
    } catch (error) {
        console.error('AI Coach Hint Error:', error);
        res.json({
            success: true,
            hint: '💡 Study Pointer: Break down the question keywords and rule out any options that conflict with core domain principles.'
        });
    }
};

/**
 * POST /api/ai/translate
 * Translate question, options, and explanation into target language
 */
export const translateQuestionContent = async (req, res) => {
    try {
        const { question, options = [], explanation = '', targetLang = 'es', targetLangName = '' } = req.body;
        if (!question) {
            return res.status(400).json({ success: false, message: 'Question content is required' });
        }

        const groq = getGroqClient();
        if (groq) {
            try {
                const prompt = `You are an expert educational translator.
Translate the following quiz question content accurately into target language: "${targetLangName || targetLang}".
Keep any mathematical formulas ($...$, $$...$$), code snippets, and technical acronyms intact and properly formatted.

Input:
Question: ${JSON.stringify(question)}
Options: ${JSON.stringify(options)}
Explanation: ${JSON.stringify(explanation)}

Respond ONLY with a JSON object in this exact format:
{
  "question": "translated question",
  "options": ["translated option 1", "translated option 2"],
  "explanation": "translated explanation or empty string"
}`;

                const resp = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    max_tokens: 2000
                });

                const content = resp?.choices?.[0]?.message?.content;
                if (content) {
                    const parsed = JSON.parse(content);
                    return res.json({
                        success: true,
                        data: {
                            question: parsed.question || question,
                            options: Array.isArray(parsed.options) ? parsed.options : options,
                            explanation: parsed.explanation || explanation
                        }
                    });
                }
            } catch (aiErr) {
                console.warn('[Translate AI] Fallback to direct translation:', aiErr.message);
            }
        }

        // Fallback helper using Google Translate endpoint
        const fetchTranslate = async (text) => {
            if (!text || typeof text !== 'string') return text;
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
                const response = await fetch(url);
                if (!response.ok) return text;
                const data = await response.json();
                if (Array.isArray(data) && Array.isArray(data[0])) {
                    return data[0].map(segment => segment[0]).join('');
                }
                return text;
            } catch (err) {
                return text;
            }
        };

        const translatedQ = await fetchTranslate(question);
        const translatedOpts = await Promise.all((options || []).map(opt => fetchTranslate(opt)));
        const translatedExp = explanation ? await fetchTranslate(explanation) : '';

        return res.json({
            success: true,
            data: {
                question: translatedQ,
                options: translatedOpts,
                explanation: translatedExp
            }
        });
    } catch (error) {
        console.error('Translation Error:', error);
        res.status(500).json({ success: false, message: 'Translation failed', error: error.message });
    }
};

const CURATED_DAILY_QUOTES = [
    { quote: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra", topic: "Architecture" },
    { quote: "Talk is cheap. Show me the code.", author: "Linus Torvalds", topic: "Execution" },
    { quote: "First, solve the problem. Then, write the code.", author: "John Johnson", topic: "Problem Solving" },
    { quote: "Make it work, make it right, make it fast.", author: "Kent Beck", topic: "Craftsmanship" },
    { quote: "The only way to learn a new programming language is by writing programs in it.", author: "Dennis Ritchie", topic: "Practice" },
    { quote: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler", topic: "Clean Code" },
    { quote: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry", topic: "Simplicity" },
    { quote: "Premature optimization is the root of all evil.", author: "Donald Knuth", topic: "Optimization" },
    { quote: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson", topic: "Readability" },
    { quote: "The most dangerous phrase in the language is: We've always done it this way.", author: "Grace Hopper", topic: "Innovation" },
    { quote: "Experience is simply the name we give our mistakes.", author: "Oscar Wilde", topic: "Growth" },
    { quote: "Code never lies, comments sometimes do.", author: "Ron Jeffries", topic: "Truth in Code" },
    { quote: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson", topic: "Design" },
    { quote: "The function of good software is to make the complex appear simple.", author: "Grady Booch", topic: "Simplicity" },
    { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", topic: "Knowledge" },
    { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", topic: "Learning" },
    { quote: "Continuous improvement is better than delayed perfection.", author: "Mark Twain", topic: "Consistency" },
    { quote: "There are only two hard things in Computer Science: cache invalidation and naming things.", author: "Phil Karlton", topic: "Computer Science" },
    { quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma", topic: "Daily Habit" },
    { quote: "The secret to getting ahead is getting started.", author: "Mark Twain", topic: "Momentum" }
];

const dailyQuoteCache = new Map();

/**
 * GET /api/ai/daily-quote
 * Returns daily inspirational tech/learning quote generated via AI or curated fallback
 */
export const getDailyQuote = async (req, res) => {
    try {
        const force = req.query.force === 'true';
        const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        // Return cached quote if already generated today and not forced
        if (!force && dailyQuoteCache.has(todayKey)) {
            const cached = dailyQuoteCache.get(todayKey);
            return res.json({ success: true, data: cached, cached: true });
        }

        const groq = getGroqClient();
        if (groq) {
            try {
                const prompt = `You are a wise mentor in computer science, software engineering, and continuous learning.
Generate an inspiring, punchy, memorable quote for today (${todayKey}).
It can be from a renowned computer scientist, engineer, thinker, or a sharp engineering insight.
Theme: continuous learning, debugging, mastery, curiosity, persistence, clean code.

Return ONLY valid JSON with this exact structure:
{
  "quote": "The quote text without quotation marks (1-2 sentences)",
  "author": "Author Name",
  "topic": "Mastery"
}`;

                const completion = await groq.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    max_tokens: 300,
                    temperature: force ? 0.9 : 0.6
                });

                const raw = completion?.choices?.[0]?.message?.content;
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.quote && parsed.author) {
                        const payload = {
                            quote: parsed.quote.trim().replace(/^["']|["']$/g, ''),
                            author: parsed.author.trim(),
                            topic: parsed.topic ? parsed.topic.trim() : 'Learning',
                            date: todayKey,
                            isAI: true
                        };
                        dailyQuoteCache.set(todayKey, payload);
                        return res.json({ success: true, data: payload, cached: false });
                    }
                }
            } catch (aiErr) {
                console.warn('[Daily Quote AI] Failed to generate AI quote, using curated fallback:', aiErr.message);
            }
        }

        // Deterministic daily fallback index based on date string
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const fallbackIndex = force 
            ? Math.floor(Math.random() * CURATED_DAILY_QUOTES.length)
            : (dayOfYear % CURATED_DAILY_QUOTES.length);

        const fallback = {
            ...CURATED_DAILY_QUOTES[fallbackIndex],
            date: todayKey,
            isAI: false
        };

        if (!force) {
            dailyQuoteCache.set(todayKey, fallback);
        }

        return res.json({ success: true, data: fallback, cached: false });
    } catch (err) {
        console.error('getDailyQuote Error:', err);
        const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        return res.json({ 
            success: true, 
            data: {
                ...CURATED_DAILY_QUOTES[dayOfYear % CURATED_DAILY_QUOTES.length],
                date: new Date().toISOString().slice(0, 10),
                isAI: false
            } 
        });
    }
};


